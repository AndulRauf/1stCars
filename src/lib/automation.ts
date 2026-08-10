/**
 * 1stCars Native Automation Engine (client side).
 *
 * The marketplace automates itself with NO external tools: Supabase
 * triggers + SECURITY DEFINER functions + guarded pg_cron do the heavy
 * lifting on the database; this service bridges the SPA to that engine and
 * provides a faithful local fallback (mock DB / pre-migration databases).
 *
 * - emitEvent()       -> records a business event (idempotent)
 * - processPending()  -> executes local rules for unprocessed events
 * - runOverdueChecks()-> overdue inspections + task reminders
 * - startScheduler()  -> in-app poller that runs maintenance passes
 */
import * as React from "react";
import { supabase } from "./supabaseClient";
import { notificationService } from "./notifications";

export type AutomationEventType =
  | "inspection.created"
  | "inspection.completed"
  | "lead.created"
  | "auction.ended"
  | "car.status_changed";

export interface AutomationEvent {
  id: string;
  event_type: string;
  source_table?: string;
  source_id?: string;
  action_key?: string;
  payload?: Record<string, any>;
  status: string;
  attempts: number;
  last_error?: string;
  created_at: string;
  processed_at?: string;
}

export interface AutomationLog {
  id: string;
  job_id?: string;
  event_id?: string;
  level: string;
  action?: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AutomationJob {
  id: string;
  job_key?: string;
  job_type: string;
  source_id?: string;
  status: string;
  attempts: number;
  last_error?: string;
  metadata?: Record<string, any>;
  scheduled_for?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Task {
  id: string;
  assignee_id?: string;
  assigner_id?: string;
  task_type: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_at?: string;
  source_table?: string;
  source_id?: string;
  completed_at?: string;
  created_at: string;
}

export interface AutomationConfig {
  autoAssignInspector: boolean;
  autoAssignSales: boolean;
  reminders: boolean;
  pollerInterval: number; // seconds; 0 disables the in-app poller
}

const EVENTS_KEY = "1stcars_sb_automation_events";
const JOBS_KEY = "1stcars_sb_automation_jobs";
const LOGS_KEY = "1stcars_sb_automation_logs";
const TASKS_KEY = "1stcars_sb_tasks";
const CONFIG_KEY = "1stcars_automation_config";

const DEFAULT_CONFIG: AutomationConfig = {
  autoAssignInspector: false,
  autoAssignSales: false,
  reminders: true,
  pollerInterval: 60
};

const CONFIG_SETTING_KEYS = [
  "automation.auto_assign_inspector",
  "automation.auto_assign_sales",
  "automation.reminders",
  "automation.poller_interval"
];

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function rpcSupported(): boolean {
  try {
    return typeof (supabase as any)?.rpc === "function";
  } catch {
    return false;
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const automationService = {
  supportsRpc: rpcSupported,

  // ==========================================
  // CONFIGURATION
  // ==========================================

  getConfig(): AutomationConfig {
    return { ...DEFAULT_CONFIG, ...readLocal<Partial<AutomationConfig>>(CONFIG_KEY, {}) };
  },

  async loadConfig(): Promise<AutomationConfig> {
    const stored = readLocal<Partial<AutomationConfig> | null>(CONFIG_KEY, null);
    if (stored !== null) return { ...DEFAULT_CONFIG, ...stored };
    if (rpcSupported()) {
      try {
        const { data } = await supabase.from("settings").select("key, value").in("key", CONFIG_SETTING_KEYS);
        if (data && data.length > 0) {
          const row = (key: string) => data.find((s: any) => s.key === key)?.value;
          const cfg: AutomationConfig = {
            autoAssignInspector: row("automation.auto_assign_inspector") === "true",
            autoAssignSales: row("automation.auto_assign_sales") === "true",
            reminders: row("automation.reminders") !== "false",
            pollerInterval: Number(row("automation.poller_interval") || 60)
          };
          writeLocal(CONFIG_KEY, cfg);
          return cfg;
        }
      } catch {
        // Keep local defaults
      }
    }
    return { ...DEFAULT_CONFIG };
  },

  async saveConfig(partial: Partial<AutomationConfig>): Promise<AutomationConfig> {
    const next = { ...this.getConfig(), ...partial };
    writeLocal(CONFIG_KEY, next);
    if (rpcSupported()) {
      try {
        const rows = [
          { key: "automation.auto_assign_inspector", value: String(next.autoAssignInspector), description: "Automation engine: auto-assign inspectors to new inspection requests" },
          { key: "automation.auto_assign_sales", value: String(next.autoAssignSales), description: "Automation engine: auto-assign sales associates to new buyer leads" },
          { key: "automation.reminders", value: String(next.reminders), description: "Automation engine: overdue + follow-up reminders" },
          { key: "automation.poller_interval", value: String(next.pollerInterval), description: "In-app poller interval in seconds (0 disables in-app polling)" }
        ];
        for (const row of rows) {
          await supabase.from("settings").upsert(row, { onConflict: "key" });
        }
      } catch {
        // Local-only config
      }
    }
    return next;
  },

  // ==========================================
  // EVENT EMISSION (idempotent)
  // ==========================================

  async emitEvent(input: {
    type: AutomationEventType | string;
    sourceTable?: string;
    sourceId?: string;
    payload?: Record<string, any>;
  }): Promise<{ eventId?: string; recorded: boolean; assignedInspectorId?: string }> {
    const payload = input.payload || {};
    if (rpcSupported()) {
      try {
        const { data, error } = await (supabase as any).rpc("automation_record_event", {
          p_event_type: input.type,
          p_source_table: input.sourceTable || null,
          p_source_id: input.sourceId || null,
          p_payload: payload
        });
        if (!error && data) {
          return { eventId: data as string, recorded: true };
        }
        console.warn("[automation] automation_record_event failed — using local engine:", error);
      } catch (err) {
        console.warn("[automation] automation_record_event threw — using local engine:", err);
      }
    }
    return this.emitLocal(input);
  },

  async emitLocal(input: {
    type: AutomationEventType | string;
    sourceTable?: string;
    sourceId?: string;
    payload?: Record<string, any>;
  }): Promise<{ eventId?: string; recorded: boolean; assignedInspectorId?: string }> {
    const actionKey = `${input.type}:${input.sourceTable ?? ""}:${input.sourceId ?? ""}`;
    const events = readLocal<AutomationEvent[]>(EVENTS_KEY, []);
    const existing = events.find((e) => e.action_key === actionKey);
    if (existing) return { eventId: existing.id, recorded: true };

    const event: AutomationEvent = {
      id: newId("evt"),
      event_type: input.type,
      source_table: input.sourceTable,
      source_id: input.sourceId,
      action_key: actionKey,
      payload: input.payload || {},
      status: "pending",
      attempts: 0,
      created_at: new Date().toISOString()
    };
    writeLocal(EVENTS_KEY, [event, ...events]);
    this.appendLog("info", "event-recorded", `Recorded event ${input.type}`, { event_id: event.id });

    const result = await this.processPendingEvents();
    return { eventId: event.id, recorded: true, assignedInspectorId: result.assignedInspectorId };
  },

  // ==========================================
  // LOCAL RULE ENGINE (mock / pre-migration)
  // ==========================================

  async processPendingEvents(): Promise<{ assignedInspectorId?: string; assignedSalesId?: string }> {
    const events = readLocal<AutomationEvent[]>(EVENTS_KEY, []);
    const config = this.getConfig();
    const pending = events.filter((e) => e.status === "pending");
    let assignedInspectorId: string | undefined;
    let assignedSalesId: string | undefined;

    for (const ev of pending) {
      try {
        if (ev.event_type === "inspection.created" && config.autoAssignInspector) {
          const id = await this.assignInspectorLocal(ev);
          if (id) assignedInspectorId = id;
        } else if (ev.event_type === "lead.created" && config.autoAssignSales) {
          const id = await this.assignSalesLocal(ev);
          if (id) assignedSalesId = id;
        }
        this.markEventStatus(ev.id, "processed");
      } catch (err) {
        this.markEventStatus(ev.id, "failed", err);
        this.appendLog("error", "event-failed", `Failed to process ${ev.event_type}: ${String(err)}`, { event_id: ev.id });
      }
    }
    return { assignedInspectorId, assignedSalesId };
  },

  async assignInspectorLocal(ev: AutomationEvent): Promise<string | undefined> {
    const inspectionId = (ev.payload?.inspection_id as string) || ev.source_id || "";
    if (!inspectionId) return undefined;
    const city = String(ev.payload?.city || "");

    const { data: inspectors } = await supabase.from("profiles").select("*").eq("role", "Inspector");
    const pool = (inspectors || []).filter((p: any) => p.is_approved !== false);
    if (pool.length === 0) return undefined;

    const sameCity = pool.filter((p: any) => p.city && String(p.city).toLowerCase().includes(city.toLowerCase()));
    const candidatePool = sameCity.length > 0 ? sameCity : pool;

    const { data: tasks } = await supabase.from("tasks").select("*");
    const openCount = (id: string) =>
      (tasks || []).filter((t: any) => t.assignee_id === id && ["open", "in_progress"].includes(t.status)).length;
    const inspector = [...candidatePool].sort((a: any, b: any) => openCount(a.id) - openCount(b.id))[0];

    await supabase.from("inspections").update({ status: "assigned", inspector_id: inspector.id }).eq("id", inspectionId);

    const vehicle = `${ev.payload?.brand || ""} ${ev.payload?.model || ""}`.trim() || "Vehicle";
    await this.createTask({
      assigneeId: inspector.id,
      taskType: "inspection_assignment",
      title: `Inspect ${vehicle}${city ? ` (${city})` : ""}`,
      description: `Vehicle inspection scheduled${city ? ` in ${city}` : ""}. Complete the 120-point report within 48 hours.`,
      priority: "high",
      dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      sourceTable: "inspections",
      sourceId: inspectionId
    });
    await notificationService.createNotification({
      recipientId: inspector.id,
      title: "New Inspection Assigned",
      message: `Inspection for ${vehicle}${city ? ` in ${city}` : ""} was auto-assigned to you by the automation engine. Please complete it within 48 hours.`,
      type: "action",
      metadata: { inspection_id: inspectionId, city, source: "automation" }
    });
    this.appendLog("info", "assign-inspector", `Assigned inspection to ${inspector.name}`, {
      inspection_id: inspectionId,
      inspector_id: inspector.id
    });
    return inspector.id;
  },

  async assignSalesLocal(ev: AutomationEvent): Promise<string | undefined> {
    const leadId = (ev.payload?.lead_id as string) || ev.source_id || "";
    if (!leadId) return undefined;
    const city = String(ev.payload?.city || "");

    const { data: staff } = await supabase.from("profiles").select("*").eq("role", "Sales Associate");
    const pool = (staff || []).filter((p: any) => p.is_approved !== false);
    if (pool.length === 0) return undefined;

    const sameCity = pool.filter((p: any) => p.city && String(p.city).toLowerCase().includes(city.toLowerCase()));
    const candidatePool = sameCity.length > 0 ? sameCity : pool;

    const { data: leads } = await supabase.from("sales_notifications").select("*");
    const openCount = (id: string) =>
      (leads || []).filter((l: any) => l.assigned_to === id && ["pending", "contacted"].includes(l.status)).length;
    const associate = [...candidatePool].sort((a: any, b: any) => openCount(a.id) - openCount(b.id))[0];

    await supabase.from("sales_notifications").update({ assigned_to: associate.id, status: "contacted" }).eq("id", leadId);

    const car = `${ev.payload?.car_brand || ""} ${ev.payload?.car_model || ""}`.trim() || "vehicle";
    const leadType = String(ev.payload?.type || "lead");
    const title =
      leadType === "test_drive" ? `Test drive lead: ${car}` :
      leadType === "buy_now" ? `Buy-now lead: ${car}` :
      `Sales lead: ${car}`;
    const leadName = String(ev.payload?.name || "A buyer");
    await this.createTask({
      assigneeId: associate.id,
      taskType: "lead_followup",
      title,
      description: `${leadName} in ${city || "your region"} — reach out to confirm interest and schedule the next step within 24 hours.`,
      priority: "high",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      sourceTable: "sales_notifications",
      sourceId: leadId
    });
    await notificationService.createNotification({
      recipientId: associate.id,
      title: "New Lead Assigned",
      message: `${title} was auto-assigned to you by the automation engine. Follow up within 24 hours.`,
      type: "action",
      metadata: { lead_id: leadId, city, source: "automation" }
    });
    this.appendLog("info", "assign-sales-lead", `Assigned lead to ${associate.name}`, {
      lead_id: leadId,
      sales_associate_id: associate.id
    });
    return associate.id;
  },

  // ==========================================
  // OVERDUE CHECKS + REMINDERS
  // ==========================================

  async runOverdueChecks(): Promise<{ overdueInspections: number; taskReminders: number }> {
    if (rpcSupported()) {
      try {
        const { data, error } = await (supabase as any).rpc("automation_run_overdue_checks");
        if (!error && typeof data === "number") {
          return { overdueInspections: data, taskReminders: 0 };
        }
      } catch {
        // Fall through to the local pass
      }
    }
    return this.runLocalOverdueChecks();
  },

  async runLocalOverdueChecks(): Promise<{ overdueInspections: number; taskReminders: number }> {
    let overdueInspections = 0;
    let taskReminders = 0;
    const today = new Date().toISOString().split("T")[0];

    const { data: inspections } = await supabase.from("inspections").select("*");
    const { data: tasks } = await supabase.from("tasks").select("*");
    const taskSourceIds = new Set((tasks || []).map((t: any) => t.source_id));

    for (const insp of inspections || []) {
      if (
        ["assigned", "pending"].includes(insp.status) &&
        insp.preferred_date &&
        String(insp.preferred_date) < today &&
        insp.overall_score == null &&
        !taskSourceIds.has(insp.id)
      ) {
        const vehicle = `${insp.brand || ""} ${insp.model || ""}`.trim() || "Vehicle";
        await this.createTask({
          assigneeId: insp.inspector_id,
          taskType: "inspection_overdue",
          title: `Inspection overdue: ${vehicle}`,
          description: `Due ${insp.preferred_date} in ${insp.city || ""}. Please complete it today.`,
          priority: "urgent",
          dueAt: new Date().toISOString(),
          sourceTable: "inspections",
          sourceId: insp.id
        });
        if (insp.inspector_id) {
          await notificationService.createNotification({
            recipientId: insp.inspector_id,
            title: "Inspection Overdue",
            message: `The inspection for ${vehicle} (${insp.city || ""}) was due on ${insp.preferred_date}. Please complete it today.`,
            type: "alert",
            metadata: { inspection_id: insp.id, source: "automation" }
          });
        }
        overdueInspections += 1;
      }
    }

    for (const t of tasks || []) {
      if (
        ["open", "in_progress"].includes(t.status) &&
        t.due_at &&
        new Date(t.due_at) < new Date()
      ) {
        await supabase.from("tasks").update({ status: "overdue" }).eq("id", t.id);
        if (t.assignee_id) {
          await notificationService.createNotification({
            recipientId: t.assignee_id,
            title: "Task Overdue",
            message: `Task "${t.title}" is now overdue.`,
            type: "alert",
            metadata: { task_id: t.id, source: "automation" }
          });
        }
        taskReminders += 1;
      }
    }

    if (overdueInspections + taskReminders > 0) {
      this.appendLog("info", "overdue-checks", `Local overdue pass: ${overdueInspections} inspections, ${taskReminders} task reminders`);
    }
    return { overdueInspections, taskReminders };
  },

  // ==========================================
  // READERS (DB-first, localStorage fallback)
  // ==========================================

  async getEvents(limit = 200): Promise<AutomationEvent[]> {
    try {
      const { data, error } = await supabase
        .from("automation_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data) return data;
    } catch {
      // fall through
    }
    return readLocal<AutomationEvent[]>(EVENTS_KEY, []).slice(0, limit);
  },

  async getJobs(limit = 100): Promise<AutomationJob[]> {
    try {
      const { data, error } = await supabase
        .from("automation_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data) return data;
    } catch {
      // fall through
    }
    return readLocal<AutomationJob[]>(JOBS_KEY, []).slice(0, limit);
  },

  async getLogs(limit = 150): Promise<AutomationLog[]> {
    try {
      const { data, error } = await supabase
        .from("automation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data) return data;
    } catch {
      // fall through
    }
    return readLocal<AutomationLog[]>(LOGS_KEY, []).slice(0, limit);
  },

  async getTasks(limit = 200): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data) return data;
    } catch {
      // fall through
    }
    return readLocal<Task[]>(TASKS_KEY, []).slice(0, limit);
  },

  async createTask(input: {
    assigneeId?: string;
    taskType: string;
    title: string;
    description?: string;
    priority?: string;
    dueAt?: string;
    sourceTable?: string;
    sourceId?: string;
  }): Promise<Task | null> {
    try {
      const { data, error } = await supabase.from("tasks").insert([{
        assignee_id: input.assigneeId || null,
        assigner_id: null,
        task_type: input.taskType,
        title: input.title,
        description: input.description || null,
        priority: input.priority || "medium",
        status: "open",
        due_at: input.dueAt || null,
        source_table: input.sourceTable || null,
        source_id: input.sourceId || null
      }]).select();
      if (!error && data) return Array.isArray(data) ? (data[0] as Task) : (data as Task);
    } catch (err) {
      console.warn("[automation] createTask failed:", err);
    }
    return null;
  },

  async updateTaskStatus(taskId: string, status: string): Promise<boolean> {
    try {
      const patch: Record<string, any> = { status };
      if (status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
      return !error;
    } catch {
      return false;
    }
  },

  // ==========================================
  // LOCAL LEDGER HELPERS
  // ==========================================

  markEventStatus(id: string, status: string, lastError?: unknown) {
    const events = readLocal<AutomationEvent[]>(EVENTS_KEY, []);
    const updated = events.map((e) =>
      e.id === id
        ? {
            ...e,
            status,
            attempts: e.attempts + 1,
            last_error: lastError != null ? String(lastError) : e.last_error,
            processed_at: ["processed", "failed"].includes(status) ? new Date().toISOString() : e.processed_at
          }
        : e
    );
    writeLocal(EVENTS_KEY, updated);
  },

  appendLog(level: string, action: string, message: string, metadata?: Record<string, any>) {
    const logs = readLocal<AutomationLog[]>(LOGS_KEY, []);
    const entry: AutomationLog = {
      id: newId("log"),
      level,
      action,
      message,
      metadata,
      created_at: new Date().toISOString()
    };
    writeLocal(LOGS_KEY, [entry, ...logs].slice(0, 500));
  },

  // ==========================================
  // SCHEDULER (in-app poller)
  // ==========================================

  startScheduler() {
    if (typeof window === "undefined") return;
    if (schedulerTimer !== null) return;
    const cfg = this.getConfig();
    const intervalMs = Math.max(15, cfg.pollerInterval || 60) * 1000;
    schedulerTimer = window.setInterval(async () => {
      const current = this.getConfig();
      if (!current.reminders) return;
      try {
        await this.runOverdueChecks();
      } catch (err) {
        console.warn("[automation] scheduler tick failed:", err);
      }
    }, intervalMs);
  },

  stopScheduler() {
    if (typeof window !== "undefined" && schedulerTimer !== null) {
      window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  }
};

let schedulerTimer: number | null = null;

export function useAutomationScheduler(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    automationService.startScheduler();
    return () => automationService.stopScheduler();
  }, [enabled]);
}
