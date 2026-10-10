// 1stCars — Step 0: registration-number-first entry for SellCarView.
// Drop-in: renders before the existing Brand grid. On success calls
// onPrefill(details); on failure/manual calls onManual(). Never blocks.
import * as React from "react";
import {
  normalizeRegistrationNumber, validateRegistrationNumber,
  fetchVehicleDetails, VehicleDetails
} from "@/src/lib/vehicleLookup";
import {
  trackRegistrationLookupStarted, trackVehicleApiSuccess,
  trackVehicleApiFailed, trackManualFallbackUsed, trackVehicleDetailsVerified
} from "@/src/lib/vehicleLookupAnalytics";

interface Props {
  onPrefill: (d: VehicleDetails) => void;
  onManual: (reason: string) => void;
}

export function RegLookupStep({ onPrefill, onManual }: Props) {
  const [reg, setReg] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [found, setFound] = React.useState<VehicleDetails | null>(null);
  const [edits, setEdits] = React.useState({ brand: "", model: "", variant: "", fuel: "", year: "" });

  const normalized = normalizeRegistrationNumber(reg);
  const valid = validateRegistrationNumber(reg).ok;

  async function lookup() {
    if (!valid || loading) return;
    setLoading(true); setError(""); setFound(null);
    trackRegistrationLookupStarted();
    const r = await fetchVehicleDetails(reg);
    setLoading(false);
    if (r.outcome === "success" || r.outcome === "incomplete") {
      setFound(r);
      setEdits({
        brand: r.brand || "", model: r.model || "", variant: r.variant || "",
        fuel: r.fuel || "", year: r.year ? String(r.year) : ""
      });
      trackVehicleApiSuccess({ completeness: r.completeness });
    } else if (r.outcome === "provider_not_configured") {
      setError("Online lookup is not enabled yet — continue manually.");
      trackVehicleApiFailed("provider_not_configured");
    } else if (r.outcome === "not_found") {
      setError("We couldn't find that number — check it or continue manually.");
      trackVehicleApiFailed("not_found");
    } else if (r.outcome === "timeout" || r.outcome === "rate_limited") {
      setError("Taking longer than usual — continue manually.");
      trackVehicleApiFailed(r.outcome);
    } else if (r.outcome === "invalid_format") {
      setError("Enter a valid number, e.g. GJ 01 AB 1234.");
      trackVehicleApiFailed("invalid_format");
    } else {
      setError("Couldn't fetch details — continue manually.");
      trackVehicleApiFailed("provider_error");
    }
  }

  function confirm() {
    if (!found) return;
    const corrected =
      edits.brand !== (found.brand || "") || edits.model !== (found.model || "") ||
      edits.variant !== (found.variant || "") || edits.fuel !== (found.fuel || "") ||
      edits.year !== (found.year ? String(found.year) : "");
    trackVehicleDetailsVerified("api", corrected);
    onPrefill({
      ...found,
      brand: edits.brand || found.brand, model: edits.model || found.model,
      variant: edits.variant || found.variant, fuel: edits.fuel || found.fuel,
      year: edits.year ? Number(edits.year) || found.year || null : found.year || null
    });
  }

  function manual(reason: string) {
    trackManualFallbackUsed(reason);
    onManual(reason);
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Sell your car — start with registration number</h2>
      <label className="block text-sm font-medium">Registration number</label>
      <input
        value={reg}
        onChange={(e) => setReg(e.target.value.toUpperCase())}
        placeholder="GJ 01 AB 1234"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="w-full border rounded-lg px-4 py-3 text-lg tracking-widest uppercase"
      />
      {normalized.length > 0 && <p className="text-xs text-slate-500">Looking up: {normalized}</p>}
      <button
        onClick={lookup}
        disabled={!valid || loading}
        className="w-full bg-[#2E7D32] text-white font-bold rounded-full py-3 disabled:opacity-40"
      >
        {loading ? "Fetching car details…" : "Get Car Details"}
      </button>
      {loading && (
        <div className="space-y-2 animate-pulse" aria-live="polite">
          <div className="h-4 bg-slate-200 rounded" />
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
        </div>
      )}
      {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{error}</p>}
      {found && (
        <div className="border rounded-xl p-4 space-y-3 bg-white">
          <h3 className="font-semibold">Vehicle details found — verify or edit</h3>
          {(["brand", "model", "variant", "fuel", "year"] as const).map((k) => (
            <label key={k} className="block text-sm">
              <span className="capitalize font-medium">{k}</span>
              <input
                value={edits[k]}
                onChange={(e) => setEdits({ ...edits, [k]: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
          ))}
          {found.rtoCode && <p className="text-xs text-slate-500">RTO: {found.rtoCode}{found.rtoName ? ` — ${found.rtoName}` : ""}</p>}
          <button onClick={confirm} className="w-full bg-[#2E7D32] text-white font-bold rounded-full py-3">
            Confirm Details
          </button>
        </div>
      )}
      <button onClick={() => manual(found ? "corrected_after_lookup" : error ? "lookup_failed" : "skipped")} className="w-full text-sm underline text-slate-600 py-2">
        Enter Details Manually
      </button>
    </div>
  );
}
