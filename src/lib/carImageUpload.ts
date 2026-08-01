import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";

// Data-URL photos inflate the JSONB payload into the multi-MB range, which
// makes Supabase's proxy time out on insert. On the real backend we upload each
// photo to the public "car-images" storage bucket and keep only the small URLs
// in the record. In mock mode we keep the data URLs (localStorage handles them
// fine).
function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:");
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const meta = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = /data:([^;]+);/.exec(meta)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function uploadOne(url: string): Promise<string> {
  const blob = dataUrlToBlob(url);
  const path = `cars/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage.from("car-images").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false
  });
  if (error) throw error;
  return supabase.storage.from("car-images").getPublicUrl(path).data.publicUrl;
}

// Replaces data-URL entries with public storage URLs; http(s)/relative URLs pass
// through untouched. Returns the original array unchanged in mock mode.
export async function uploadCarImages(imageList: string[] | undefined): Promise<string[]> {
  if (!isRealSupabase || !Array.isArray(imageList) || imageList.length === 0) {
    return imageList || [];
  }
  const out: string[] = [];
  for (const img of imageList) {
    if (!isDataUrl(img)) {
      out.push(img);
      continue;
    }
    try {
      out.push(await uploadOne(img));
    } catch (e) {
      console.error("Failed to upload car image to storage:", e);
      out.push(img);
    }
  }
  return out;
}
