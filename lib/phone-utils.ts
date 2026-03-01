export function normalizePhoneSpaces(value: string): string {
  return value.replace(/\s/g, "")
}

export function isValidChileanMobile(telefono: string): { valid: boolean; message?: string } {
  const numeroLimpio = normalizePhoneSpaces(telefono)

  if (!numeroLimpio.startsWith("+569")) {
    return { valid: false, message: "Debe ser un número móvil chileno (+56 9...)" }
  }

  if (numeroLimpio.length < 10) {
    return { valid: false, message: "El número es muy corto" }
  }

  const formatoMovil = /^\+56\s?9\s?[\d\s]+$/.test(telefono)
  if (!formatoMovil) {
    return { valid: false, message: "Formato inválido. Use +56 9 seguido de números" }
  }

  return { valid: true }
}

export function formatTelefonoInput(value: string, current: string): string {
  if (value.length < current.length) {
    if (value.length <= 4 || !value.startsWith("+56")) {
      return "+56 9 "
    }

    return value
  }

  if (value === current) {
    return value
  }

  let cleaned = value.replace(/[^\d+\s]/g, "")

  if (!cleaned || cleaned === "+" || cleaned === "+5" || cleaned === "+56") {
    return "+56 9 "
  }

  if (!cleaned.startsWith("+56")) {
    if (/^\d/.test(cleaned)) {
      cleaned = "+56 9 " + cleaned
    } else if (cleaned.startsWith("+")) {
      cleaned = "+56 9 " + cleaned.slice(1)
    }
  }

  if (cleaned.startsWith("+56") && !cleaned.includes("9")) {
    const afterCode = cleaned.substring(3).trim()
    cleaned = "+56 9 " + afterCode
  }

  if (cleaned.startsWith("+56")) {
    const numerosPuros = cleaned.replace(/^\+56\s?9?\s?/, "").replace(/\s/g, "")

    let result = "+56 9"

    if (numerosPuros.length > 0) {
      const grupo1 = numerosPuros.slice(0, 4)
      result += " " + grupo1

      if (numerosPuros.length > 4) {
        const grupo2 = numerosPuros.slice(4, 8)
        result += " " + grupo2
      }
    }

    return result
  }

  return cleaned
}
