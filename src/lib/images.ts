// Procesa imágenes en el navegador antes de subirlas:
//  - corrige la orientación,
//  - reduce el tamaño (máx. 1600 px por lado),
//  - re-codifica a JPEG, lo que ELIMINA los metadatos EXIF (incluida la ubicación GPS
//    que muchos celulares guardan en las fotos y que podría revelar tu domicilio).

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export class ImageError extends Error {}

export async function prepareImage(file: File, { maxSide = 1600, quality = 0.82 } = {}): Promise<Blob> {
  if (!ACCEPTED.includes(file.type) && !file.type.startsWith("image/")) {
    throw new ImageError("Solo se permiten imágenes (JPG, PNG o WebP).");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError("La imagen es demasiado grande (máximo 20 MB).");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("No pudimos leer esta imagen. Prueba con una foto JPG o PNG.");
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Tu navegador no permite procesar imágenes.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new ImageError("No pudimos procesar la imagen.");
  return blob;
}

export function randomFileName(extension = "jpg") {
  return `${crypto.randomUUID()}.${extension}`;
}
