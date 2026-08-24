/**
 * CRM Follow-ups — built on the EXISTING automation engine
 * (follow_ups table via automationService). Create, complete and
 * reschedule follow-ups tied to leads (related_table/related_id).
 */
import * as React from "react";
import { AlarmClock, Plus, Check } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { salesCrm, LeadRow } from "@/src/lib/salesCrm";
import type { SalesData } from "./SalesCrmBits";
import { CrmCard, EmptyState } from "./SalesCrmBits";

interface SalesFollowUpsProps {
  data: SalesData;
  userId: string;
}

export function SalesFollowUps({ data, userId }: SalesFollowUpsProps) {
  const { followUps, leads, reload } = data;
  const [leadId, setLeadId] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const leadById = React.useMemo(() => {
    const m = new Map<string, LeadRow>();
    for (const l of leads) m.set(String(l.id), l);
    return m;
  }, [leads]);

  const open = followUps.filter((f) => f.status !== "completed");
  const done = followUps.filter((f) => f.status === "completed");

  const leadLabel = (f: any) => {
    const l = leadById.get(String(f.related_id));
    return l ? `${l.name} • ${l.car_brand} ${l.car_model}` : f.related_id ? `Lead #${String(f.related_id).substring(0, 8)}` : "General";
  };

  const create = async () => {
    if (!dueAt) { toast.error("Pick a due date"); return; }
    setBusy(true);
    const fu = await salesCrm.createFollowUp({
      leadId: leadId,
      assigneeId: userId,
      dueAt: new Date(dueAt).toISOString(),
      priority,
      notes: notes.trim() || undefined
    });
    setBusy(false);
    if (fu) {
      toast.success("Follow-up created");
      setLeadId(""); setDueAt(""); setNotes(""); setPriority("medium");
      await reload();
    } else toast.error("Could not create the follow-up");
  };

  const complete = async (id: string) => {
    setBusy(true);
    const ok = await salesCrm.completeFollowUp(id);
    setBusy(false);
    if (ok) { toast.success("Follow-up completed"); await reload(); }
    else toast.error("Could not complete the follow-up");
  };

  const reschedule = async (id: string, value: string) => {
    if (!value) return;
    const ok = await salesCrm.rescheduleFollowUp(id, new Date(value).toISOString());
    if (ok) { toast.success("Follow-up rescheduled"); await reload(); }
    else toast.error("Could not reschedule");
  };

  return (
    <CrmCard title="Follow-ups" subtitle="Due today and overdue items first — powered by the automation engine.">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 items-end">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead</label>
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="mt-1 w-full h-10 border border-slate-200 rounded-xl text-xs font-semibold px-3 outline-none bg-white">
            <option value="">General (no lead)</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.name} • {l.car_brand} {l.car_model}</option>
            ))}
          </select>
        </div>
        <Input label="Due date" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full h-10 border border-slate-200 rounded-xl text-xs font-semibold px-3 outline-none bg-white">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={() => void create()} disabled={busy} className="bg-[#2E7D32] hover:bg-[#25632a] text-white h-10 px-4 text-[10px]">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {open.length === 0 && <EmptyState icon={AlarmClock} title="No open follow-ups." hint="New leads automatically create a 24-hour follow-up for you." />}
        {open.map((f) => (
          <div key={f.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                  f.status === "overdue" ? "bg-rose-50 text-rose-600 border-rose-200" :
                  f.priority === "high" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {f.status === "overdue" ? "Overdue" : f.priority}
                </span>
                <p className="text-xs font-black text-slate-800 truncate">{leadLabel(f)}</p>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                {f.follow_up_type} • due {f.due_at ? new Date(f.due_at).toLocaleString() : "—"}
              </p>
              {f.notes && <p className="text-[10px] text-slate-500 mt-0.5">{f.notes}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input type="date" onChange={(e) => void reschedule(f.id, e.target.value)} className="!w-36" />
              <Button size="sm" disabled={busy} onClick={() => void complete(f.id)} className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5">
                <Check className="h-3.5 w-3.5" /> Done
              </Button>
            </div>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Completed ({done.length})</p>
          <div className="space-y-1.5">
            {done.slice(0, 10).map((f) => (
              <div key={f.id} className="flex items-center justify-between text-xs border border-slate-100 rounded-xl px-3 py-2 bg-white">
                <span className="font-bold text-slate-500 truncate">{leadLabel(f)} — {f.follow_up_type}</span>
                <span className="text-[9px] text-slate-400 font-bold shrink-0">{f.completed_at ? new Date(f.completed_at).toLocaleDateString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CrmCard>
  );
}

