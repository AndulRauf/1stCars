// CMS <-> Supabase sync helpers, extracted from AdminCMS to keep that file
// focused on UI/orchestration. These mirror local CRUD edits into the real
// Supabase tables (and tombstone deleted testimonials) so the admin panel,
// the public site, and other devices share the same data.
import { supabase } from "./supabaseClient";

const DELETED_TESTIMONIALS_KEY = "1stcars_cms_testimonials_deleted";

export function readDeletedTestimonialNames(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_TESTIMONIALS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeDeletedTestimonialNames(names: string[]): void {
  try {
    localStorage.setItem(DELETED_TESTIMONIALS_KEY, JSON.stringify(names));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function addDeletedTestimonialName(name: string): void {
  const n = name.trim().toLowerCase();
  if (!n) return;
  const deleted = readDeletedTestimonialNames();
  if (!deleted.includes(n)) {
    deleted.push(n);
    writeDeletedTestimonialNames(deleted);
  }
}

export function removeDeletedTestimonialName(name: string): void {
  const n = name.trim().toLowerCase();
  if (!n) return;
  writeDeletedTestimonialNames(readDeletedTestimonialNames().filter((x) => x !== n));
}

const isUuid = (value: string | null | undefined): boolean =>
  !!value && typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// Mirrors a CMS record into the matching Supabase table. Unsupported modules
// are skipped (their localStorage copy is still updated by the caller).
export const mirrorRecordToSupabase = async (module: string, record: any, editingId: string | null) => {
  const dbId = isUuid(editingId) ? editingId : null;
  try {
    if (module === "faqs") {
      // Always key FAQ rows by `id` so the admin `faqs` module and the
      // PageEditor FAQ tab (which upserts by id) never diverge, and we don't
      // collide with the UNIQUE(question) constraint on public.faq.
      const isUuidVal = (v: unknown) => isUuid(v as string);
      const rowId = isUuidVal(record.id)
        ? String(record.id)
        : typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `id-faqs-${Math.random().toString(36).substr(2, 9)}`;
      const row = {
        id: rowId,
        question: record.question,
        answer: record.answer,
        category: record.category || "General",
        display_order: Number(record.display_order) || 0,
      };
      if (dbId) {
        await supabase.from("faq").update(row).eq("id", dbId);
      } else {
        await supabase.from("faq").upsert(row, { onConflict: "id" });
      }
    } else if (module === "testimonials") {
      const row = {
        author_name: record.name,
        author_role: record.role || "Private Buyer",
        rating: Math.min(5, Math.max(1, Number(record.rating) || 5)),
        comment: record.content,
        is_featured: true,
      };
      if (dbId) {
        await supabase.from("testimonials").update(row).eq("id", dbId);
      } else {
        await supabase.from("testimonials").insert([row]);
        // A deliberately re-added review must be visible again: lift any
        // delete tombstone keyed by the same author name.
        const name = String(record.name || "").trim().toLowerCase();
        if (name) removeDeletedTestimonialName(name);
      }
    } else if (module === "models") {
      if (!record.brand_id && !record.brand) return;
      const row = {
        name: record.name,
        body_type: record.category || "Luxury Car",
      };
      if (dbId) {
        await supabase.from("models").update(row).eq("id", dbId);
      } else {
        const { data: existing } = await supabase
          .from("models")
          .select("id")
          .eq("brand_id", record.brand_id)
          .eq("name", row.name)
          .maybeSingle();
        if (existing) {
          await supabase.from("models").update(row).eq("id", existing.id);
        } else {
          await supabase.from("models").insert([{ ...row, brand_id: record.brand_id }]);
        }
      }
    } else if (module === "cities") {
      const row = {
        name: record.name,
        state: record.state || "",
        branch_manager: record.branch_manager || "",
        support_number: record.support_number || "",
        is_active: record.is_active !== false,
      };
      if (dbId) {
        await supabase.from("cities").update(row).eq("id", dbId);
      } else {
        const { data: existing } = await supabase.from("cities").select("id").eq("name", row.name).maybeSingle();
        if (existing) {
          await supabase.from("cities").update(row).eq("id", existing.id);
        } else {
          await supabase.from("cities").insert([row]);
        }
      }
    } else if (module === "finance") {
      const row = {
        name: record.name,
        rate: record.rate || "",
        tenure_months: record.tenure_months || "",
        max_funding: record.max_funding || "",
        approval_hours: record.approval_hours || "",
      };
      if (dbId) {
        await supabase.from("finance_partners").update(row).eq("id", dbId);
      } else {
        const { data: existing } = await supabase.from("finance_partners").select("id").eq("name", row.name).maybeSingle();
        if (existing) {
          await supabase.from("finance_partners").update(row).eq("id", existing.id);
        } else {
          await supabase.from("finance_partners").insert([row]);
        }
      }
    } else if (module === "expenses") {
      const row = {
        title: record.title,
        category: record.category || "Operations",
        amount: Number(record.amount) || 0,
        date: record.date || "",
        logged_by: record.logged_by || "",
      };
      if (dbId) {
        await supabase.from("expenses").update(row).eq("id", dbId);
      } else {
        const { data: existing } = await supabase
          .from("expenses")
          .select("id")
          .eq("title", row.title)
          .eq("date", row.date)
          .maybeSingle();
        if (existing) {
          await supabase.from("expenses").update(row).eq("id", existing.id);
        } else {
          await supabase.from("expenses").insert([row]);
        }
      }
    }
  } catch (e) {
    console.error(`AdminCMS: Supabase mirror failed for ${module}:`, e);
  }
};

// Best-effort Supabase delete for a CMS record. Testimonials are tombstoned by
// author name first (so they hide even when RLS blocks the DB delete).
export const deleteRecordFromSupabase = async (
  module: string,
  id: string,
  record?: any
): Promise<{ dbError: boolean }> => {
  const uuid = isUuid(id);
  if (module === "testimonials") {
    if (record?.name) {
      const name = String(record.name).trim().toLowerCase();
      if (name) addDeletedTestimonialName(name);
    }
    let dbError = false;
    if (uuid) {
      try {
        const { error } = await supabase.from("testimonials").delete().eq("id", id);
        if (error) {
          dbError = true;
          console.error("AdminCMS: Supabase delete failed for testimonials (check RLS policy). Review is hidden locally:", error);
        }
      } catch (e) {
        dbError = true;
        console.error("AdminCMS: Supabase delete threw for testimonials:", e);
      }
    }
    return { dbError };
  }

  if (!uuid) return { dbError: false };
  try {
    if (module === "faqs") {
      const { error } = await supabase.from("faq").delete().eq("id", id);
      if (error) throw error;
    } else if (module === "models") {
      const { error } = await supabase.from("models").delete().eq("id", id);
      if (error) throw error;
    } else if (module === "cities") {
      const { error } = await supabase.from("cities").delete().eq("id", id);
      if (error) throw error;
    } else if (module === "finance") {
      const { error } = await supabase.from("finance_partners").delete().eq("id", id);
      if (error) throw error;
    } else if (module === "expenses") {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    }
  } catch (e) {
    console.error(`AdminCMS: Supabase delete failed for ${module}:`, e);
    throw e;
  }
  return { dbError: false };
};
