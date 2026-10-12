import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["", "/perritos", "/adoptados", "/seguridad", "/adopcion-responsable", "/terminos", "/privacidad"].map(
    (path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "daily" as const }),
  );

  const supabase = await createClient();
  const { data: dogs } = await supabase
    .from("dogs")
    .select("id, updated_at")
    .eq("status", "available")
    .eq("hidden", false)
    .order("updated_at", { ascending: false })
    .limit(1000);

  return [
    ...staticPages,
    ...(dogs ?? []).map((dog) => ({ url: `${SITE_URL}/perritos/${dog.id}`, lastModified: dog.updated_at })),
  ];
}
