import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler, {
  mapApiExpressPayload,
  resolveProviderConfig,
  splitVehicleLabel,
  normalizeRegistrationNumber,
  isValidRegistrationNumber,
  APIEXPRESS_DEFAULT_BASE_URL,
  APIEXPRESS_RC_VERIFY_PATH,
} from "@/api/vehicle-lookup";

// APIExpress RC lookup — mocked provider (no paid credits).
// Schema uncertainty (2026-10-18): only verified public sample is
// { status, owner_name, vehicle, fuel, insurance_valid, state }.

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.headers = {} as Record<string, string>;
  res.body = undefined;
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}

const VALID = "GJ01AB1234";

beforeEach(() => { vi.unstubAllGlobals(); });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.APIEXPRESS_API_KEY; delete process.env.VEHICLE_API_KEY; });

describe("vehicle-lookup — provider config", () => {
  it("prefers APIEXPRESS_API_KEY and defaults base URL", () => {
    const cfg = resolveProviderConfig({ APIEXPRESS_API_KEY: "k1" } as any);
    expect(cfg.key).toBe("k1");
    expect(cfg.base).toBe(APIEXPRESS_DEFAULT_BASE_URL);
    expect(APIEXPRESS_RC_VERIFY_PATH).toBe("/v1/rc/verify");
  });
  it("honours legacy VEHICLE_API_* aliases", () => {
    const cfg = resolveProviderConfig({ VEHICLE_API_KEY: "legacy", VEHICLE_API_BASE_URL: "https://x.example" } as any);
    expect(cfg.key).toBe("legacy");
    expect(cfg.base).toBe("https://x.example");
  });
});

describe("vehicle-lookup — validation", () => {
  it("normalizes and validates Indian plates", () => {
    expect(normalizeRegistrationNumber("gj 01 ab 1234")).toBe("GJ01AB1234");
    expect(isValidRegistrationNumber("GJ01AB1234")).toBe(true);
    expect(isValidRegistrationNumber("GJ01AB123")).toBe(false);
  });
  it("rejects invalid format with 400 without calling provider", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: "BAD" } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe("invalid_format");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("vehicle-lookup — request/auth", () => {
  it("POSTs rc_number with Bearer key to /v1/rc/verify", async () => {
    process.env.APIEXPRESS_API_KEY = "test-key";
    const fetchSpy = vi.fn(async () => ({
      status: 200, ok: true,
      json: async () => ({ status: "success", vehicle: "Honda City VX", fuel: "Petrol", state: "Maharashtra" }),
    }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0] as unknown as [string, { method?: string; headers?: Record<string, string>; body?: string }];
    const [url, init] = call;
    expect(url).toBe(`${APIEXPRESS_DEFAULT_BASE_URL}/v1/rc/verify`);
    expect(init.method).toBe("POST");
    expect(init.headers?.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body || "{}")).toEqual({ rc_number: VALID });
    expect(res.body.status).toBe("success");
    expect(res.body.brand).toBe("Honda");
    expect(res.body.model).toBe("City VX");
    expect(res.body.rtoCode).toBe("GJ01");
  });
  it("returns provider_not_configured when key missing (manual fallback)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = mockRes();
    await handler({ method: "POST", body: { regNumber: VALID } }, res);
    expect(res.body.status).toBe("provider_not_configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
