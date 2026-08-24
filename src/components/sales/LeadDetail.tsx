/**
 * Lead detail panel — customer, vehicle, lead meta, appointment,
 * follow-ups (create/complete) and the activity timeline.
 * Admins can also reassign the lead to another Sales Associate.
 */
import * as React from "react";
import { X, User, Car, Phone, Mail, MapPin, Calendar, Clock, History, UserCheck, Plus, ClipboardList } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import { salesCrm, LeadRow, SalesActivity } from "@/src/lib/salesCrm";

interface LeadDetailPanelProps {
  lead: LeadRow;
  followUps: any[];
  userId: string;
  userName?: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

export function LeadDetailPanel({ lead, followUps, userId, isAdmin, onClose, onChanged }: LeadDetailPanelProps) {
  const [activities, setActivities] = React.useState<SalesActivity[]>([]);
  const [associates, setAssociates] = React.useState<{ id: string; name: string }[]>([]);
  const [reassignTo, setReassignTo] = React.useState("");
  const [fuDue, setFuDue] = React.useState("");
  const [fuNotes, setFuNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const loadDetail = React.useCallback(async () => {
    setActivities(await salesCrm.getLeadActivities(lead.id));
    if (isAdmin && isRealSupabase) {
      try {
        const { data } = await supabase.from("profiles").select("id, name").eq("role", "Sales Associate");
        setAssociates((data || []) as any);
      } catch { /* non-fatal */ }
    }
  }, [lead.id, isAdmin]);

  React.useEffect(() => { void loadDetail(); }, [loadDetail]);

  const addFollowUp = async () => {
    if (!fuDue) { toast.error("Pick a due date for the follow-up"); return; }
    setBusy(true);
    const fu = await salesCrm.createFollowUp({
      leadId: lead.id,
      assigneeId: lead.assigned_to || userId,
      dueAt: new Date(fuDue).toISOString(),
      notes: fuNotes.trim() || undefined,
      priority: "high"
    });
    setBusy(false);
    if (fu) {
      toast.success("Follow-up created");
      setFuDue(""); setFuNotes("");
      await loadDetail();
      await onChanged();
    } else toast.error("Could not create the follow-up");
  };

  const completeFu = async (id: string) => {
    setBusy(true);
    const ok = await salesCrm.completeFollowUp(id);
    setBusy(false);
    if (ok) { toast.success("Follow-up completed"); await loadDetail(); await onChanged(); }
    else toast.error("Could not complete the follow-up");
  };

  const reassign = async () => {
    if (!reassignTo) { toast.error("Pick a Sales Associate"); return; }
    setBusy(true);
    const target = associates.find((a) => a.id === reassignTo);
    const res = await salesCrm.reassignLead(lead.id, reassignTo, target?.name || "");
    setBusy(false);
    if (res.error) toast.error(res.error);
    else { toast.success("Lead reassigned"); setReassignTo(""); await onChanged(); onClose(); }
  };

  const car = lead.car_brand || lead.car_model ? `${lead.car_brand} ${lead.car_model}` : "General inquiry";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl p-6 space-y-6 shadow-2xl my-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-mono text-slate-400">#{String(lead.id).substring(0, 8)}</span>
            </div>
            <h3 className="font-black text-xl text-slate-900 tracking-tight mt-1">{lead.name}</h3>
            <p className="text-xs text-slate-400 font-bold">{car} • {String(lead.type || "lead").replace(/_/g, " ")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-100 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Customer</p>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#2E7D32]" /> {lead.mobile}</p>
            {lead.email && <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#2E7D32]" /> {lead.email}</p>}
            <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#2E7D32]" /> {lead.city}</p>
          </div>

          <div className="border border-slate-100 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Car className="h-3.5 w-3.5" /> Vehicle</p>
            <p className="text-xs font-bold text-slate-700">{lead.car_brand} {lead.car_model}</p>
            <p className="text-[10px] font-mono text-slate-400">Vehicle ID: {lead.car_id || "—"}</p>
            {lead.notes && <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">{lead.notes}</p>}
          </div>

          <div className="border border-slate-100 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Lead</p>
            <p className="text-xs font-bold text-slate-700">Source: {String(lead.type || "lead").replace(/_/g, " ")}</p>
            <p className="text-xs font-bold text-slate-700">Owner: {lead.assigned_to_name || (lead.assigned_to ? "Assigned" : "Unassigned pool")}</p>
            <p className="text-[10px] text-slate-400 font-bold">Created {new Date(lead.created_at).toLocaleString()}</p>
          </div>

          <div className="border border-slate-100 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Appointment</p>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-[#2E7D32]" /> {lead.preferred_date || "—"} {lead.preferred_time ? `• ${lead.preferred_time}` : ""}</p>
          </div>
        </div>

        {/* Follow-ups */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Follow-ups</p>
          {followUps.length === 0 && <p className="text-xs text-slate-400 font-bold">No follow-ups yet.</p>}
          {followUps.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-xl p-3 bg-[#FAF9F6]">
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800">{f.follow_up_type} • {f.priority}</p>
                <p className="text-[10px] text-slate-500 font-bold">{f.status} • due {f.due_at ? new Date(f.due_at).toLocaleDateString() : "—"}</p>
                {f.notes && <p className="text-[10px] text-slate-500 mt-0.5">{f.notes}</p>}
              </div>
              {f.status !== "completed" && (
                <Button size="sm" disabled={busy} onClick={() => void completeFu(f.id)} className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[9px] font-black uppercase h-8 rounded-lg px-2.5">
                  Done
                </Button>
              )}
            </div>
          ))}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-end pt-1">
            <Input label="Next follow-up" type="date" value={fuDue} onChange={(e) => setFuDue(e.target.value)} />
            <Input label="Notes (optional)" value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} placeholder="What needs to happen next" />
            <Button onClick={() => void addFollowUp()} disabled={busy} className="bg-[#2E7D32] hover:bg-[#25632a] text-white h-9 px-4 text-[10px]">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>

        {/* Admin reassignment */}
        {isAdmin && (
          <div className="border border-indigo-100 bg-indigo-50/50 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Admin: Reassign Lead</p>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_auto] gap-2 items-end">
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="mt-1 w-full h-10 border border-slate-200 rounded-xl text-xs font-semibold px-3 outline-none bg-white"
              >
                <option value="">Select Sales Associate...</option>
                {associates.map((a) => (
                  <option key={a.id} value={a.id}>{a.name || a.id}</option>
                ))}
              </select>
              <Button onClick={() => void reassign()} disabled={busy} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-[10px]">
                Reassign
              </Button>
            </div>
            <p className="text-[10px] text-indigo-400 font-bold">Reassignment sticks — automation never overwrites an explicit admin assignment.</p>
          </div>
        )}

        {/* Activity timeline */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Activity Timeline</p>
          {activities.length === 0 && <p className="text-xs text-slate-400 font-bold">No activity recorded yet.</p>}
          <div className="space-y-1.5">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-xs border-l-2 border-[#2E7D32]/30 pl-3 py-1">
                <span className="font-black text-slate-700">{a.label}{a.detail ? ` — ${a.detail}` : ""}</span>
                <span className="text-[9px] text-slate-400 font-bold shrink-0">{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

