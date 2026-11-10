import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import QRCode from "qrcode";

import { placeLabel } from "@/lib/chile";
import { SEX_LABELS, SIZE_SHORT, SPECIES_LABELS } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import { formatShortDate } from "@/lib/format";
import { petPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

// Cartel listo para imprimir o compartir (1080×1350), con un código QR que lleva a la publicación.

const THEME = {
  lost: {
    title: "SE BUSCA",
    color: "#dc2626",
    cta: "¿La viste? Escanea el código y avisa por el chat seguro.",
  },
  found: {
    title: "¿ES TUYA?",
    color: "#0f766e",
    cta: "¿La conoces? Escanea el código y escribe por el chat seguro.",
  },
  adoption: {
    title: "EN ADOPCIÓN",
    color: "#ea580c",
    cta: "Escanea el código para conocer su historia y postular.",
  },
} as const;

const asset = (name: string) => readFile(join(process.cwd(), "src/assets", name));

// La foto se incrusta en el cartel; si no se puede descargar, el cartel sale sin foto.
async function photoDataUri(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 6_000_000) return null;
    return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: RouteContext<"/mascotas/[id]/cartel">) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("No encontrado", { status: 404 });

  const supabase = await createClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, kind, species, sex, size, color, commune_code, event_date, status, cover_path")
    .eq("id", id)
    .maybeSingle();
  if (!pet || pet.status !== "available") return new Response("No encontrado", { status: 404 });

  const theme = THEME[pet.kind];
  const url = `${SITE_URL}/mascotas/${pet.id}`;
  const place = placeLabel(pet.commune_code);
  const facts = [SPECIES_LABELS[pet.species], SEX_LABELS[pet.sex], SIZE_SHORT[pet.size], pet.color]
    .filter(Boolean)
    .join(" · ");
  const when =
    pet.kind !== "adoption" && pet.event_date
      ? `${pet.kind === "lost" ? "Se perdió" : "Se encontró"} el ${formatShortDate(pet.event_date)}`
      : null;

  const [bold, semi, icon, qrSvg] = await Promise.all([
    asset("nunito-latin-800-normal.woff"),
    asset("nunito-latin-600-normal.woff"),
    readFile(join(process.cwd(), "public/icons/icon-192.png")),
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
  ]);
  const qr = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`;
  const logo = `data:image/png;base64,${icon.toString("base64")}`;
  const photo = await photoDataUri(petPhotoUrl(pet.cover_path));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff7ed",
        fontFamily: "Nunito",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 190,
          background: theme.color,
          color: "#fff",
          fontSize: 124,
          lineHeight: 1,
          paddingTop: 16,
          fontWeight: 800,
          letterSpacing: 6,
        }}
      >
        {theme.title}
      </div>
      <div
        style={{
          display: "flex",
          height: 600,
          background: "#ffedd5",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={photo} width={1080} height={600} style={{ objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: "#c2410c" }}>
            Mira sus fotos con el código QR
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "30px 56px 0" }}>
        <div
          style={{
            display: "flex",
            fontSize: pet.name.length > 14 ? 76 : 100,
            fontWeight: 800,
            color: "#1c1917",
            lineHeight: 1.05,
          }}
        >
          {pet.kind === "found" && /^sin nombre$/i.test(pet.name.trim()) ? "Mascota encontrada" : pet.name}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#44403c", marginTop: 10 }}>
          {facts}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: theme.color, marginTop: 6 }}>
          {[place, when].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          margin: "auto 56px 44px",
          padding: 28,
          background: "#fff",
          borderRadius: 36,
          border: "4px solid #fed7aa",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={qr} width={210} height={210} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 32, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: "#1c1917", lineHeight: 1.2 }}>
            {theme.cta}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: "#78716c", marginTop: 8 }}>
            Nunca pagues por adelantado ni compartas códigos.
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logo} width={54} height={54} style={{ borderRadius: 14 }} />
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800, color: "#c2410c", marginLeft: 14 }}>
              ayudapatitas.cl
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: [
        {
          name: "Nunito",
          data: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength) as ArrayBuffer,
          weight: 800,
          style: "normal",
        },
        {
          name: "Nunito",
          data: semi.buffer.slice(semi.byteOffset, semi.byteOffset + semi.byteLength) as ArrayBuffer,
          weight: 600,
          style: "normal",
        },
      ],
      headers: {
        "Content-Disposition": `inline; filename="cartel-ayudapatitas.png"`,
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
