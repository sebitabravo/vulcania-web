const IMG_TAG_START = "[img]"
const IMG_TAG_END = "[/img]"
const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"])
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export function composeMessageWithImage(text: string, imageUrl?: string) {
  const base = text.trim()
  if (!imageUrl) return base
  if (!base) return `${IMG_TAG_START}${imageUrl}${IMG_TAG_END}`
  return `${base}\n${IMG_TAG_START}${imageUrl}${IMG_TAG_END}`
}

export function parseMessageMedia(mensaje: string) {
  const start = mensaje.indexOf(IMG_TAG_START)
  const end = mensaje.indexOf(IMG_TAG_END)

  if (start === -1 || end === -1 || end <= start) {
    return { text: mensaje, imageUrl: null as string | null }
  }

  const candidate = mensaje.slice(start + IMG_TAG_START.length, end).trim()
  if (!SAFE_IMAGE_DATA_URL.test(candidate)) {
    return { text: mensaje, imageUrl: null as string | null }
  }

  const imageUrl = candidate
  const text = (mensaje.slice(0, start) + mensaje.slice(end + IMG_TAG_END.length)).trim()

  return { text, imageUrl: imageUrl || null }
}

export function isImageFile(file: File) {
  return ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())
}

export function validateImageFile(file: File): { valid: boolean; message?: string } {
  if (!isImageFile(file)) {
    return { valid: false, message: "Selecciona una imagen JPG, PNG, GIF o WebP." }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, message: "La imagen debe pesar 2 MB o menos." }
  }
  return { valid: true }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      reject(new Error(validation.message))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
    reader.readAsDataURL(file)
  })
}
