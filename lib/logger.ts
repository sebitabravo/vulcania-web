type LogLevel = "debug" | "info" | "warn" | "error"

const isProduction = process.env.NODE_ENV === "production"
const debugEnabled = (process.env.NEXT_PUBLIC_DEBUG_LOGS || "").toLowerCase() === "true"

function shouldLog(level: LogLevel) {
  if (level === "error" || level === "warn") return true
  if (!isProduction) return true
  return debugEnabled
}

function emit(level: LogLevel, ...args: unknown[]) {
  if (!shouldLog(level)) return

  if (level === "error") {
    console.error(...args)
    return
  }

  if (level === "warn") {
    console.warn(...args)
    return
  }

  console.log(...args)
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", ...args),
  info: (...args: unknown[]) => emit("info", ...args),
  warn: (...args: unknown[]) => emit("warn", ...args),
  error: (...args: unknown[]) => emit("error", ...args),
}
