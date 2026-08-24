/**
 * 1stCars — Sales CRM service (Phase 1).
 *
 * Data layer for the Sales Associate CRM built on the EXISTING tables:
 *   sales_notifications (leads)   cars (My Cars, ownership = created_by)
 *   test_drives (appointments)    follow_ups / tasks (automation engine)
 *   audit_trail + automation_events (activity timeline)
 *
 * Assignment rule (enforced server-side by public/sales_crm_phase1.sql):
 *   Priority 1: lead.car_id → cars.created_by (the owning associate)
 *   Priority 2: car without associate → existing round-robin fallback
 *   Priority 3: no car_id → existing general lead workflow
 */
import { supabase, isRealSupabase } from "./supabaseClient";
import { automationService, FollowUp, AuditEntry } from "./automation";
import { errorMessage } from "./carPersistence";

// ============================================================
// PIPELINE
// ============================================================

export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "appointment",
  "test_drive",
  "negotiation",
  "booked",
  "sold"
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number] | "lost";

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  appointment: "Appointment",
  test_drive: "Test Drive",
  negotiation: "Negotiation",
  booked: "Booked",
  sold: "Sold",
  lost: "Lost"
};

// Allowed forward moves per stage ("lost" allowed from every open stage).
export const STAGE_FLOW: Record<PipelineStage, string[]> = {
  new: ["contacted", "qualified", "lost"],
  contacted: ["qualified", "appointment", "lost"],
  qualified: ["appointment", "negotiation", "lost"],
  appointment: ["test_drive", "negotiation", "lost"],
  test_drive: ["negotiation", "booked", "lost"],
  negotiation: ["booked", "sold", "lost"],
  booked: ["sold", "lost"],
  sold: [],
  lost: []
};

export function isPipelineStage(s: string): s is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(s) || s === "lost";
}

// Legacy statuses ("pending"/"Pending"/"resolved"/"payment_submitted")
// map onto the pipeline so existing records keep working unchanged.
const LEGACY_STATUS_MAP: Record<string, PipelineStage> = {
  "": "new",
  pending: "new",
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  appointment: "appointment",
  test_drive: "test_drive",
  negotiation: "negotiation",
  booked: "booked",
  sold: "sold",
  resolved: "sold",
  payment_submitted: "negotiation",
  lost: "lost",
  rejected: "lost",
  cancelled: "lost"
};

export function mapLegacyStatus(status?: string | null): PipelineStage {
  return LEGACY_STATUS_MAP[String(status || "").toLowerCase()] || "new";
}

export function stageIndex(stage: PipelineStage): number {
  const i = (PIPELINE_STAGES as readonly string[]).indexOf(stage);
  return i === -1 ? PIPELINE_STAGES.length : i; // "lost" sorts last
}

export function nextStages(status?: string | null): PipelineStage[] {
  const cur = mapLegacyStatus(status);
  return (STAGE_FLOW[cur] || []) as PipelineStage[];
}

export function stageTone(stage: PipelineStage): string {
  switch (stage) {
    case "new": return "bg-slate-100 text-slate-600 border-slate-200";
    case "contacted": return "bg-sky-50 text-sky-700 border-sky-200";
    case "qualified": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "appointment": return "bg-violet-50 text-violet-700 border-violet-200";
    case "test_drive": return "bg-amber-50 text-amber-700 border-amber-200";
    case "negotiation": return "bg-orange-50 text-orange-700 border-orange-200";
    case "booked": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "sold": return "bg-[#2E7D32] text-white border-[#2E7D32]";
    case "lost": return "bg-rose-50 text-rose-600 border-rose-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export const ACTIVITY_LABELS: Record<string, string> = {
  lead_created: "Lead Created",
  "lead.created": "Lead Created",
  lead_assigned: "Lead Assigned",
  lead_updated: "Lead Updated",
  lead_reassigned: "Lead Reassigned",
  contact_made: "Customer Contacted",
  followup_created: "Follow-up Created",
  "follow-up.created": "Follow-up Created",
  followup_completed: "Follow-up Completed",
  appointment_created: "Appointment Created",
  appointment_confirmed: "Appointment Confirmed",
  test_drive_scheduled: "Test Drive Scheduled",
  test_drive_completed: "Test Drive Completed",
  negotiation_started: "Negotiation Started",
  booking_created: "Booking Created",
  sale_completed: "Sale Completed",
  lead_lost: "Lead Lost"
};

// ============================================================
// TYPES
// ============================================================

export interface LeadRow {
  id: string;
  created_at: string;
  name: string;
  mobile: string;
  email?: string | null;
  city: string;
  car_id: string | null;
  car_brand: string;
  car_model: string;
  type: string;
  status: string;
  notes?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
}

export interface MyCarRow {
  id: string;
  title?: string;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  price: number;
  km_driven?: number;
  city?: string;
  status: string;
  overall_score?: number | null;
  created_at: string;
  image_url?: string;
  payload?: any;
}

export interface LeadCounts {
  leads: number;
  appointments: number;
  testDrives: number;
}

export interface SalesActivity {
  id: string;
  at: string;
  action: string;
  label: string;
  detail?: string;
}

// ============================================================
// DATA ACCESS
// ============================================================

function localLeads(): LeadRow[] {
  try {
    const raw = localStorage.getItem("1stcars_sales_leads");
    return raw ? (JSON.parse(raw) as LeadRow[]) : [];
  } catch {
    return [];
  }
}

export const salesCrm = {
  /** All leads visible to this user. RLS scopes associates server-side;
   *  the filter below is defense-in-depth for mock mode. */
  async getLeads(userId: string | null | undefined, isAdmin: boolean): Promise<LeadRow[]> {
    const { data, error } = await supabase.from("sales_notifications").select("*");
    if (error && isRealSupabase) throw new Error(errorMessage(error));
    let rows: LeadRow[] = (data as LeadRow[]) || [];
    if (!rows.length && !isRealSupabase) rows = localLeads();
    if (!isAdmin && userId) {
      rows = rows.filter((l) => !l.assigned_to || l.assigned_to === userId);
    }
    return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },

  /** Cars owned (uploaded) by this Sales Associate — cars.created_by.
   *  Admin passes isAdmin to see the whole fleet instead. */
  async getMyCars(userId: string, isAdmin = false): Promise<MyCarRow[]> {
    let query = supabase
      .from("cars")
      .select("id, title, brand, model, variant, year, price, km_driven, city, status, overall_score, created_at, image_url, payload");
    if (!isAdmin) query = query.eq("created_by", userId);
    const { data, error } = await query;
    if (error && isRealSupabase) console.warn("[salesCrm] getMyCars failed:", errorMessage(error));
    const rows = (data || []) as any[];
    return rows
      .map((c) => ({
        ...c,
        image_url: c.image_url ?? c.payload?.image_url,
        title: c.title || `${c.brand} ${c.model}`
      }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },

  /** Appointments/test drives for this associate (test_drives.sales_associate_id). */
  async getTestDrives(userId: string | null, isAdmin: boolean): Promise<any[]> {
    let query = supabase.from("test_drives").select("*").order("created_at", { ascending: false });
    if (!isAdmin && userId) query = query.eq("sales_associate_id", userId);
    const { data, error } = await query;
    if (error && isRealSupabase) return [];
    if (data && data.length) return data;
    if (!isRealSupabase) {
      try {
        const raw = localStorage.getItem("1stcars_test_drives");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return data || [];
  },

  /** Per-car roll-ups used by My Cars cards. */
  countByCar(leads: LeadRow[], testDrives: any[]): Record<string, LeadCounts> {
    const out: Record<string, LeadCounts> = {};
    for (const l of leads) {
      if (!l.car_id) continue;
      const key = String(l.car_id);
      out[key] = out[key] || { leads: 0, appointments: 0, testDrives: 0 };
      out[key].leads += 1;
      if (String(l.type).toLowerCase().includes("test_drive")) out[key].appointments += 1;
    }
    for (const td of testDrives) {
      if (!td?.car_id) continue;
      const key = String(td.car_id);
      out[key] = out[key] || { leads: 0, appointments: 0, testDrives: 0 };
      out[key].testDrives += 1;
    }
    return out;
  },

  /** Overview KPI block — computed from real rows only. */
  computeOverview(leads: LeadRow[], cars: MyCarRow[], followUps: FollowUp[], testDrives: any[]) {
    const stages = leads.map((l) => mapLegacyStatus(l.status));
    const today = new Date().toISOString().split("T")[0];
    const now = Date.now();
    const dueFollowUps = followUps.filter(
      (f) => ["open", "in_progress", "overdue"].includes(f.status) && f.due_at && new Date(f.due_at).getTime() <= now + 86400000
    ).length;
    return {
      myCars: cars.length,
      activeCars: cars.filter((c) => ["available", "listed"].includes(String(c.status))).length,
      newLeads: stages.filter((s) => s === "new").length,
      activeLeads: stages.filter((s) => s !== "sold" && s !== "lost").length,
      followUpsDue: dueFollowUps,
      todaysAppointments: leads.filter(
        (l) => String(l.type).toLowerCase().includes("test_drive") && l.preferred_date === today
      ).length,
      upcomingTestDrives: testDrives.filter(
        (td) => ["pending", "scheduled", "Confirmed"].includes(String(td.status)) &&
          String(td.preferred_date || td.date || "") >= today
      ).length,
      bookings: stages.filter((s) => s === "booked").length,
      sales: stages.filter((s) => s === "sold").length,
      lost: stages.filter((s) => s === "lost").length
    };
  },

  // ==========================================
  // LEAD OPERATIONS
  // ==========================================

  /** Move a lead through the pipeline. Legacy values map cleanly. */
  async updateLeadStage(lead: LeadRow, next: PipelineStage): Promise<{ error?: string }> {
    const cur = mapLegacyStatus(lead.status);
    if (cur === next) return {};
    const allowed = STAGE_FLOW[cur] || [];
    if (!allowed.includes(next)) {
      return { error: `Cannot move a ${STAGE_LABELS[cur]} lead to ${STAGE_LABELS[next]}` };
    }
    const { error } = await supabase.from("sales_notifications").update({ status: next }).eq("id", lead.id);
    if (error) return { error: errorMessage(error) };
    // The on_lead_changed DB trigger writes the audit trail row.
    await automationService.emitEvent({
      type: "car.status_changed",
      sourceTable: "sales_notifications",
      sourceId: lead.id,
      payload: { lead_id: lead.id, old_status: lead.status, new_status: next }
    });
    return {};
  },

  /** Admin-only manual reassignment. The server trigger never overwrites
   *  an explicit assignment, so this sticks. */
  async reassignLead(leadId: string, associateId: string, associateName: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from("sales_notifications")
      .update({ assigned_to: associateId, assigned_to_name: associateName })
      .eq("id", leadId);
    if (error) return { error: errorMessage(error) };
    await automationService.recordAudit({
      action: "lead_reassigned",
      entityType: "sales_notifications",
      entityId: leadId,
      metadata: { assigned_to: associateId, assigned_to_name: associateName, by: "admin" }
    });
    return {};
  },

  /** Claim an unassigned pool lead (Sales Associate). */
  async claimLead(leadId: string, userId: string, userName: string): Promise<{ error?: string }> {
    const { error } = await supabase
      .from("sales_notifications")
      .update({ assigned_to: userId, assigned_to_name: userName })
      .eq("id", leadId);
    if (error) return { error: errorMessage(error) };
    return {};
  },

  // ==========================================
  // FOLLOW-UPS (wrap the existing automation engine)
  // ==========================================

  async createFollowUp(input: {
    leadId: string;
    assigneeId: string;
    dueAt?: string;
    priority?: string;
    notes?: string;
    type?: string;
  }): Promise<FollowUp | null> {
    return automationService.createFollowUp({
      relatedTable: "sales_notifications",
      relatedId: input.leadId,
      assigneeId: input.assigneeId,
      followUpType: input.type || "lead_followup",
      priority: input.priority || "medium",
      dueAt: input.dueAt,
      notes: input.notes
    });
  },

  async completeFollowUp(id: string): Promise<boolean> {
    return automationService.updateFollowUpStatus(id, "completed");
  },

  async rescheduleFollowUp(id: string, dueAt: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("follow_ups").update({ due_at: dueAt, status: "open" }).eq("id", id);
      return !error;
    } catch {
      return false;
    }
  },

  /** Follow-ups related to the given lead ids (plus general ones). */
  async getFollowUpsFor(leadIds: string[]): Promise<FollowUp[]> {
    const all = await automationService.getFollowUps(400);
    if (leadIds.length === 0) return all.filter((f) => !f.related_id);
    const ids = new Set(leadIds.map(String));
    return all.filter((f) => !f.related_id || ids.has(String(f.related_id)));
  },

  // ==========================================
  // ACTIVITY TIMELINE (existing audit trail + events)
  // ==========================================

  async getLeadActivities(leadId: string): Promise<SalesActivity[]> {
    const out: SalesActivity[] = [];
    const audit: AuditEntry[] = await automationService.getAudit(400);
    for (const a of audit) {
      if (a.entity_type === "sales_notifications" && String(a.entity_id) === String(leadId)) {
        out.push({
          id: a.id,
          at: a.created_at,
          action: a.action,
          label: ACTIVITY_LABELS[a.action] || a.action,
          detail: a.reason || undefined
        });
      }
    }
    const events = await automationService.getEvents(300);
    for (const e of events) {
      if (e.source_table === "sales_notifications" && String(e.source_id) === String(leadId)) {
        out.push({
          id: e.id,
          at: e.created_at,
          action: e.event_type,
          label: ACTIVITY_LABELS[e.event_type] || e.event_type
        });
      }
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }
};

