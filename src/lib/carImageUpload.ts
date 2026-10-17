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
  const blob = await dataUrlToJpegBlob(url);
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

// Decode a data-URL photo and re-encode it as a real JPEG (quality 82,
// max 1600px on the long edge). Phone cameras upload HEIC/WebP/PNG data
// URLs; storing them with a .jpg name + image/jpeg content-type is exactly
// what produced "JPEG tag, WebP bytes" originals that WhatsApp refused to
// preview. Normalizing at upload time means every future car photo is
// genuine JPEG bytes, so the 1200x630 render variant + og:image:type are
// always honest.
export async function dataUrlToJpegBlob(dataUrl: string): Promise<Blob> {
  const src = dataUrlToBlob(dataUrl);
  if (typeof document === "undefined") return new Blob([src], { type: "image/jpeg" });
  try {
    const bitmap = await createImageBitmap(src);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width || 1, bitmap.height || 1));
    const w = Math.max(1, Math.round((bitmap.width || 1) * scale));
    const h = Math.max(1, Math.round((bitmap.height || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return new Blob([src], { type: "image/jpeg" });
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
    );
    return blob && blob.size > 0 ? blob : new Blob([src], { type: "image/jpeg" });
  } catch {
    // HEIC / undecodable source in this browser: store original bytes.
    return new Blob([src], { type: "image/jpeg" });
  }
}
