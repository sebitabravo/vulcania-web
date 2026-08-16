import { unlockAlertAudio } from "@/lib/alert-sound"
import { logger } from "@/lib/logger"

let unlocked = false

export function setupAudioUnlock() {
  if (typeof window === 'undefined' || unlocked) return () => undefined

  const unlock = async () => {
    try {
      if (await unlockAlertAudio()) {
        unlocked = true
        window.removeEventListener('pointerdown', unlock)
        window.removeEventListener('keydown', unlock)
      }
    } catch {
      logger.warn("No se pudo preparar el audio de alerta.")
    }
  }

  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)

  return () => {
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
}
