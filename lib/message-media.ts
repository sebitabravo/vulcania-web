const IMG_TAG_START = "[img]"
const IMG_TAG_END = "[/img]"

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

  const imageUrl = mensaje.slice(start + IMG_TAG_START.length, end).trim()
  const text = (mensaje.slice(0, start) + mensaje.slice(end + IMG_TAG_END.length)).trim()

  return { text, imageUrl: imageUrl || null }
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/")
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
    reader.readAsDataURL(file)
  })
}
