import * as React from "react";
import {
  Zap, RefreshCw, Play, Check, X, AlertCircle, Info,
  ListTodo, Activity, FileClock, CheckCircle2, Clock, ShieldCheck, PhoneCall, FlaskConical
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";
import { supabase } from "@/src/lib/supabaseClient";
import {
  automationService,
  AutomationConfig,
  AutomationEvent,
  AutomationJob,
  AutomationLog,
  FollowUp,
  AuditEntry,
  Task
} from "@/src/lib/automation";

type TabKey = "events" | "tasks" | "logs" | "jobs" | "followups" | "audit";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 border-amber-200 text-amber-700",
  processed: "bg-emerald-50 border-emerald-200 text-emerald-700",
  failed: "bg-rose-50 border-rose-200 text-rose-700",
  skipped: "bg-slate-100 border-slate-200 text-slate-500",
  open: "bg-amber-50 border-amber-200 text-amber-700",
  in_progress: "bg-sky-50 border-sky-200 text-sky-700",
  completed: "bg-emerald-50 border-emerald-200 text-emerald-700",
  cancelled: "bg-slate-100 border-slate-200 text-slate-500",
  overdue: "bg-rose-50 border-rose-200 text-rose-700",
  queued: "bg-slate-100 border-slate-200 text-slate-600",
  running: "bg-sky-50 border-sky-200 text-sky-700",
  retrying: "bg-amber-50 border-amber-200 text-amber-700"
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[status] || "bg-slate-100 border-slate-200 text-slate-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export function AutomationControlCenter({ onRefreshAll }: { onRefreshAll?: () => void }) {
  const [tab, setTab] = React.useState<TabKey>("events");
  const [config, setConfig] = React.useState<AutomationConfig | null>(null);
  const [events, setEvents] = React.useState<AutomationEvent[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [logs, setLogs] = React.useState<AutomationLog[]>([]);
  const [jobs, setJobs] = React.useState<AutomationJob[]>([]);
  const [followUps, setFollowUps] = React.useState<FollowUp[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [profileNames, setProfileNames] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [testing, setTesting] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    const [cfg, evts, tks, lgs, jbs, fus, aud, profiles, session] = await Promise.all([
      automationService.loadConfig(),
      automationService.getEvents(),
      automationService.getTasks(),
      automationService.getLogs(),
      automationService.getJobs(),
      automationService.getFollowUps(),
      automationService.getAudit(),
      supabase.from("profiles").select("id, name").then((r) => r.data || []),
      supabase.auth.getUser().then((r) => r.data?.user || null)
    ]);
    setConfig(cfg);
    setEvents(evts);
    setTasks(tks);
    setLogs(lgs);
    setJobs(jbs);
    setFollowUps(fus);
    setAudit(aud);
    const nameMap: Record<string, string> = {};
    (profiles as any[]).forEach((p) => {
      nameMap[p.id] = p.name;
    });
    setProfileNames(nameMap);
    if (session) {
      const { data: me } = await supabase.from("profiles").select("role").eq("id", session.id).maybeSingle();
      setIsAdmin(me?.role === "Admin");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveConfig = async () => {
    if (!config) return;
    const next = await automationService.saveConfig(config);
    setConfig(next);
    toast.success("Automation settings saved. Rules will use the new configuration from the next event.");
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await automationService.runOverdueChecks();
      toast.success("Overdue checks complete. Review the logs below.");
    } catch (err) {
      toast.error("Overdue check run failed: " + String(err));
    } finally {
      setRunning(false);
      loadAll();
    }
  };

  const handleRetryEvent = async (id: string) => {
    automationService.markEventStatus(id, "pending");
    await automationService.processPendingEvents();
    toast.success("Event re-queued and processed.");
    loadAll();
  };

  const handleMarkProcessed = async (id: string) => {
    automationService.markEventStatus(id, "processed");
    toast.success("Event marked as processed.");
    loadAll();
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    const ok = await automationService.updateTaskStatus(taskId, status);
    if (ok) toast.success(`Task marked ${status}.`);
    else toast.error("Could not update task status.");
    loadAll();
  };

  const handleFollowUpStatus = async (id: string, status: string) => {
    const ok = await automationService.updateFollowUpStatus(id, status);
    if (ok) toast.success(`Follow-up marked ${status}.`);
    else toast.error("Could not update follow-up.");
    loadAll();
  };

  const handleTestEvent = async (kind: string) => {
    setTesting(kind);
    try {
      const key = `test-${kind}-${Date.now()}`;
      const payload: Record<string, any> = { test: true, key };
      if (kind === "seller_inquiry") {
        await automationService.emitEvent({
          type: "inspection.created",
          sourceTable: "inspections",
          sourceId: key,
          payload: { ...payload, inspection_id: key, city: "Surat", brand: "Honda", model: "City", variant: "ZX CVT", year: 2021, km_driven: 22000, seller_name: "Test Seller", seller_mobile: "9000000000", preferred_date: new Date().toISOString().split("T")[0] }
        });
      } else if (kind === "test_drive") {
        await automationService.emitEvent({
          type: "lead.created",
          sourceTable: "sales_notifications",
          sourceId: key,
          payload: { ...payload, lead_id: key, name: "Test Buyer", mobile: "9000000001", city: "Surat", type: "test_drive", car_brand: "BMW", car_model: "X5" }
        });
      } else if (kind === "offer") {
        await automationService.emitEvent({
          type: "offer.created",
          sourceTable: "offers",
          sourceId: key,
          payload: { ...payload, offer_id: key, inspection_id: key, dealer_name: "Test Dealer", offer_amount: 1450000, car: "Honda City" }
        });
      } else if (kind === "booking") {
        await automationService.emitEvent({
          type: "lead.created",
          sourceTable: "sales_notifications",
          sourceId: key,
          payload: { ...payload, lead_id: key, name: "Test Buyer", mobile: "9000000002", city: "Surat", type: "buy_now", car_brand: "Mercedes", car_model: "C200" }
        });
      } else if (kind === "inspection_complete") {
        await automationService.emitEvent({
          type: "inspection.completed",
          sourceTable: "inspections",
          sourceId: key,
          payload: { ...payload, inspection_id: key, city: "Surat", brand: "Honda", model: "City", overall_score: 8.5 }
        });
      }
      toast.success("Test event emitted and processed by the engine.");
      loadAll();
    } catch (err) {
      toast.error("Test event failed: " + String(err));
    } finally {
      setTesting(null);
    }
  };

  const pendingCount = events.filter((e) => e.status === "pending").length;
  const failedCount = events.filter((e) => e.status === "failed").length;
  const openTasks = tasks.filter((t) => ["open", "in_progress", "overdue"].includes(t.status)).length;
  const dbEngine = automationService.supportsRpc();

  const toggle = (key: "autoAssignInspector" | "autoAssignSales" | "reminders") =>
    setConfig((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#ff5a07]" /> Automation Center
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Self-operating marketplace engine — triggers, rules & scheduled jobs with no external tools
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${dbEngine ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {dbEngine ? "Supabase engine + pg_cron" : "In-app engine (local / mock)"}
            </span>
            <Button
              onClick={handleRunNow}
              disabled={running}
              className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-9 px-4 rounded-xl flex items-center gap-2"
            >
              <Play className="h-3.5 w-3.5" /> {running ? "Running..." : "Run Checks Now"}
            </Button>
            <Button
              onClick={loadAll}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[10px] h-9 px-4 rounded-xl flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            { label: "Pending Events", val: pendingCount, color: "bg-amber-50 border-amber-200 text-amber-700" },
            { label: "Failed Events", val: failedCount, color: "bg-rose-50 border-rose-200 text-rose-700" },
            { label: "Open Tasks", val: openTasks, color: "bg-sky-50 border-sky-200 text-sky-700" },
            { label: "Total Jobs", val: jobs.length, color: "bg-emerald-50 border-emerald-200 text-emerald-700" }
          ].map((s) => (
            <div key={s.label} className={`p-4 rounded-2xl border ${s.color}`}>
              <div className="text-2xl font-black leading-none">{s.val}</div>
              <div className="text-[9px] font-black uppercase tracking-widest mt-1.5 opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules / Configuration */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">Automation Rules</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Toggle which rules the engine runs automatically. New events always apply the latest settings.
            </p>
          </div>
          <Button
            onClick={handleSaveConfig}
            className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl flex items-center gap-2"
          >
            <Check className="h-3.5 w-3.5" /> Save Rules
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <RuleToggle
            title="Auto-assign Inspectors"
            desc="New inspection requests are instantly assigned to the lowest-load inspector (same city preferred), a task + notification is created, and CRM timeline updated."
            enabled={!!config?.autoAssignInspector}
            onToggle={() => toggle("autoAssignInspector")}
          />
          <RuleToggle
            title="Auto-assign Sales Associates"
            desc="Test-drive & buy-now leads are instantly routed to the lowest-load sales associate with a follow-up task within 24h."
            enabled={!!config?.autoAssignSales}
            onToggle={() => toggle("autoAssignSales")}
          />
          <RuleToggle
            title="Overdue + Reminder Jobs"
            desc="Scheduled passes escalate overdue inspections and flip expired tasks to overdue, notifying the assignee."
            enabled={!!config?.reminders}
            onToggle={() => toggle("reminders")}
          />
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <Clock className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <label className="text-xs font-black text-slate-700 block">In-app poller interval (seconds)</label>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 mb-2">
                How often the open app window runs maintenance passes. 0 disables in-app polling (pg_cron still covers the database).
              </p>
              <input
                type="number"
                min={0}
                value={config?.pollerInterval ?? 60}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, pollerInterval: Math.max(0, Number(e.target.value) || 0) } : prev
                  )
                }
                className="w-28 h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test mode (admin only) */}
      {isAdmin && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <FlaskConical className="h-4 w-4 text-amber-600" />
            <div>
              <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">Automation Test Mode</h4>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Emit synthetic events to exercise the engine end-to-end. Visible only to admins.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {([
              { key: "seller_inquiry", label: "Test Seller Inquiry", icon: PhoneCall },
              { key: "inspection_complete", label: "Test Inspection Done", icon: CheckCircle2 },
              { key: "test_drive", label: "Test Test-Drive Lead", icon: Clock },
              { key: "offer", label: "Test Offer", icon: Zap },
              { key: "booking", label: "Test Booking Lead", icon: Play }
            ] as { key: string; label: string; icon: any }[]).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  disabled={testing !== null}
                  onClick={() => handleTestEvent(t.key)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                >
                  <Icon className="h-3.5 w-3.5" /> {testing === t.key ? "Running..." : t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Data tabs */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 mb-5">
          {([
            { key: "events", label: "Events", icon: Activity },
            { key: "tasks", label: "Tasks", icon: ListTodo },
            { key: "followups", label: "Follow-ups", icon: Clock },
            { key: "logs", label: "Logs", icon: FileClock },
            { key: "jobs", label: "Jobs", icon: Info },
            { key: "audit", label: "Audit", icon: ShieldCheck }
          ] as { key: TabKey; label: string; icon: any }[]).map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  active ? "bg-[#2E7D32] text-white shadow" : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs font-black uppercase tracking-widest text-slate-400">
            Loading automation ledger...
          </div>
        ) : (
          <>
            {tab === "events" && (
              <div className="space-y-3">
                {events.length === 0 ? (
                  <EmptyState text="No automation events recorded yet. Submit an inspection or a booking to see the engine in action." />
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-black text-xs text-slate-900 font-mono">{ev.event_type}</span>
                          <StatusBadge status={ev.status} />
                          <span className="text-[9px] text-slate-400 font-bold">{fmtTime(ev.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1 truncate">
                          {ev.source_table ? `${ev.source_table} #${ev.source_id}` : "no source"} · attempts {ev.attempts}
                        </p>
                        {ev.last_error && <p className="text-[10px] text-rose-600 font-bold mt-1">Error: {ev.last_error}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ev.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => handleRetryEvent(ev.id)}
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" /> Retry
                          </button>
                        )}
                        {ev.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleMarkProcessed(ev.id)}
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                          >
                            <Check className="h-3 w-3" /> Mark done
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "tasks" && (
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <EmptyState text="No internal tasks yet. Enable the auto-assign rules and new inspections / leads will create tasks automatically." />
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-black text-xs text-slate-900">{t.title}</span>
                          <StatusBadge status={t.status} />
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${
                            t.priority === "urgent" ? "bg-rose-50 border-rose-200 text-rose-700"
                            : t.priority === "high" ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-slate-100 border-slate-200 text-slate-500"
                          }`}>{t.priority}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          {profileNames[t.assignee_id || ""] || "Unassigned"} · {t.task_type.replace("_", " ")} · due {fmtTime(t.due_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleTaskStatus(t.id, "in_progress")}
                            className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 cursor-pointer"
                          >
                            Start
                          </button>
                        )}
                        {["open", "in_progress"].includes(t.status) && (
                          <button
                            type="button"
                            onClick={() => handleTaskStatus(t.id, "completed")}
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[#2E7D32] text-white hover:bg-[#25632a] cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </button>
                        )}
                        {t.status === "overdue" && (
                          <button
                            type="button"
                            onClick={() => handleTaskStatus(t.id, "open")}
                            className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "followups" && (
              <div className="space-y-3">
                {followUps.length === 0 ? (
                  <EmptyState text="No follow-ups yet. New inspections, leads, and valuations create follow-ups automatically." />
                ) : (
                  followUps.map((f) => (
                    <div key={f.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-black text-xs text-slate-900">{f.follow_up_type.replace("_", " ")}</span>
                          <StatusBadge status={f.status} />
                          <span className="text-[9px] text-slate-400 font-bold">due {fmtTime(f.due_at)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          {profileNames[f.assignee_id || ""] || "Unassigned"} · {f.related_table ? `${f.related_table} #${f.related_id}` : "no source"}
                        </p>
                        {f.notes && <p className="text-[10px] text-slate-500 font-semibold mt-1">{f.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {["open", "overdue"].includes(f.status) && (
                          <button
                            type="button"
                            onClick={() => handleFollowUpStatus(f.id, "completed")}
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[#2E7D32] text-white hover:bg-[#25632a] cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </button>
                        )}
                        {f.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleFollowUpStatus(f.id, "in_progress")}
                            className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 cursor-pointer"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "audit" && (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {audit.length === 0 ? (
                  <EmptyState text="No audit entries yet. Status changes on inspections, offers, cars, and leads are recorded here." />
                ) : (
                  audit.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                      <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{fmtTime(a.created_at)}</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#2E7D32]">{a.action}</span>
                          <span className="text-[9px] font-mono text-slate-400">{a.entity_type}#{a.entity_id || ""}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-semibold mt-0.5">
                          {a.old_status || "—"} → {a.new_status || "—"}
                          {a.actor_role ? ` · by ${a.actor_role}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "logs" && (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <EmptyState text="No automation log entries yet." />
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                      {l.level === "error" ? <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" /> : l.level === "warn" ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{fmtTime(l.created_at)}</span>
                          {l.action && <span className="text-[9px] font-black uppercase tracking-wider text-[#2E7D32]">{l.action}</span>}
                        </div>
                        <p className="text-[11px] text-slate-700 font-semibold mt-0.5">{l.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "jobs" && (
              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <EmptyState text="No scheduled/rule jobs recorded yet. Overdue passes create job entries as they run." />
                ) : (
                  jobs.map((j) => (
                    <div key={j.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-black text-xs text-slate-900 font-mono">{j.job_type}</span>
                          <StatusBadge status={j.status} />
                          <span className="text-[9px] text-slate-400 font-bold">{fmtTime(j.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          {j.source_id ? `source #${j.source_id}` : "recurring"} · attempts {j.attempts} · {j.job_key || "auto"}
                        </p>
                        {j.last_error && <p className="text-[10px] text-rose-600 font-bold mt-1">Error: {j.last_error}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RuleToggle({
  title,
  desc,
  enabled,
  onToggle
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${enabled ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-800">{title}</span>
          {enabled ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-600 text-white">
              <Check className="h-3 w-3" /> Enabled
            </span>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-200 text-slate-500">Off</span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 font-semibold mt-1.5 leading-relaxed">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors cursor-pointer ${enabled ? "bg-[#2E7D32]" : "bg-slate-300"}`}
        aria-pressed={enabled}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl">
      <Activity className="h-8 w-8 text-slate-300 mx-auto mb-3" />
      <p className="text-[11px] text-slate-400 font-bold max-w-md mx-auto leading-relaxed">{text}</p>
    </div>
  );
}
