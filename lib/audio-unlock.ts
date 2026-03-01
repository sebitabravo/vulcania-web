declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

let unlocked = false

export function setupAudioUnlock() {
  if (typeof window === 'undefined' || unlocked) return

  const unlock = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0.0001
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(0)
      osc.stop(ctx.currentTime + 0.01)
      unlocked = true
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)

      // Cerrar el contexto para no dejar recursos abiertos
      setTimeout(() => {
        void ctx.close()
      }, 20)
    } catch {
      // no-op
    }
  }

  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}
