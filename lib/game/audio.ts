export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private initialized = false

  init() {
    if (this.initialized) return
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.gain.value = 0.5

      this.musicGain = this.ctx.createGain()
      this.musicGain.connect(this.masterGain)
      this.musicGain.gain.value = 0.3

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.connect(this.masterGain)
      this.sfxGain.gain.value = 0.6

      this.initialized = true
    } catch {
      // Audio not available
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.3, detune = 0) {
    if (!this.ctx || !this.sfxGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  private playNoise(duration: number, volume = 0.2) {
    if (!this.ctx || !this.sfxGain) return
    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5
    }
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    const gain = this.ctx.createGain()
    source.connect(gain)
    gain.connect(this.sfxGain)
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    source.start()
  }

  jump() {
    this.playTone(400, 0.15, 'square', 0.2)
    setTimeout(() => this.playTone(600, 0.1, 'square', 0.15), 50)
  }

  doubleJump() {
    this.playTone(500, 0.1, 'square', 0.2)
    setTimeout(() => this.playTone(700, 0.1, 'square', 0.2), 40)
    setTimeout(() => this.playTone(900, 0.1, 'square', 0.15), 80)
  }

  wallJump() {
    this.playTone(350, 0.1, 'triangle', 0.25)
    setTimeout(() => this.playTone(550, 0.12, 'square', 0.2), 50)
  }

  coin() {
    this.playTone(988, 0.08, 'square', 0.2)
    setTimeout(() => this.playTone(1319, 0.15, 'square', 0.2), 60)
  }

  goldStone() {
    this.playTone(784, 0.1, 'triangle', 0.25)
    setTimeout(() => this.playTone(988, 0.1, 'triangle', 0.25), 80)
    setTimeout(() => this.playTone(1319, 0.2, 'triangle', 0.2), 160)
  }

  hit() {
    this.playNoise(0.15, 0.3)
    this.playTone(200, 0.2, 'sawtooth', 0.2)
  }

  enemyHit() {
    this.playTone(300, 0.1, 'square', 0.2)
    this.playNoise(0.1, 0.15)
  }

  enemyDeath() {
    this.playTone(400, 0.1, 'square', 0.2)
    setTimeout(() => this.playTone(300, 0.1, 'square', 0.2), 60)
    setTimeout(() => this.playTone(200, 0.2, 'square', 0.15), 120)
  }

  rasengan() {
    this.playTone(200, 0.3, 'sawtooth', 0.15)
    this.playTone(400, 0.3, 'sine', 0.2)
    setTimeout(() => this.playTone(600, 0.2, 'sine', 0.15), 100)
  }

  gear5() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playTone(300 + i * 150, 0.15, 'triangle', 0.2), i * 60)
    }
  }

  ultraInstinct() {
    this.playTone(800, 0.3, 'sine', 0.2)
    this.playTone(1200, 0.3, 'sine', 0.1)
    setTimeout(() => this.playTone(1000, 0.2, 'sine', 0.15), 100)
  }

  checkpoint() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.2, 'triangle', 0.2), i * 80)
    })
  }

  levelComplete() {
    const notes = [523, 659, 784, 659, 784, 1047]
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.25, 'triangle', 0.25), i * 100)
    })
  }

  gameOver() {
    const notes = [400, 350, 300, 200]
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.3, 'sawtooth', 0.15), i * 150)
    })
  }

  purchase() {
    this.playTone(600, 0.1, 'square', 0.2)
    setTimeout(() => this.playTone(800, 0.15, 'square', 0.2), 80)
    setTimeout(() => this.playTone(1000, 0.2, 'triangle', 0.2), 160)
  }

  buttonClick() {
    this.playTone(800, 0.06, 'square', 0.15)
  }

  trampoline() {
    this.playTone(300, 0.1, 'sine', 0.25)
    setTimeout(() => this.playTone(600, 0.15, 'sine', 0.2), 50)
    setTimeout(() => this.playTone(900, 0.2, 'sine', 0.15), 100)
  }
}
