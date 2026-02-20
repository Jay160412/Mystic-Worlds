export interface InputState {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  jump: boolean
  jumpPressed: boolean
  sprint: boolean
  powerup: boolean
  powerupPressed: boolean
  pause: boolean
  pausePressed: boolean
  restart: boolean
  restartPressed: boolean
  dash: boolean
  dashPressed: boolean
}

export class InputManager {
  private keys: Set<string> = new Set()
  private prevKeys: Set<string> = new Set()
  // Touch
  touchLeft = false
  touchRight = false
  touchJump = false
  touchJumpPressed = false
  touchSprint = false
  touchPowerup = false
  touchPowerupPressed = false
  touchDash = false
  touchDashPressed = false
  touchPause = false
  touchPausePressed = false

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        this.keys.add(e.code)
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault()
        }
      })
      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code)
      })
      window.addEventListener('blur', () => {
        this.keys.clear()
      })
    }
  }

  update() {
    this.prevKeys = new Set(this.keys)
    // Reset single-frame touch presses
    this.touchJumpPressed = false
    this.touchPowerupPressed = false
    this.touchDashPressed = false
    this.touchPausePressed = false
  }

  private justPressed(code: string): boolean {
    return this.keys.has(code) && !this.prevKeys.has(code)
  }

  get state(): InputState {
    return {
      left: this.keys.has('ArrowLeft') || this.keys.has('KeyA') || this.touchLeft,
      right: this.keys.has('ArrowRight') || this.keys.has('KeyD') || this.touchRight,
      up: this.keys.has('ArrowUp') || this.keys.has('KeyW'),
      down: this.keys.has('ArrowDown') || this.keys.has('KeyS'),
      jump: this.keys.has('Space') || this.touchJump,
      jumpPressed: this.justPressed('Space') || this.touchJumpPressed,
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchSprint,
      powerup: this.keys.has('KeyE') || this.touchPowerup,
      powerupPressed: this.justPressed('KeyE') || this.touchPowerupPressed,
      pause: this.keys.has('Escape') || this.keys.has('KeyP') || this.touchPause,
      pausePressed: this.justPressed('Escape') || this.justPressed('KeyP') || this.touchPausePressed,
      restart: this.keys.has('KeyR'),
      restartPressed: this.justPressed('KeyR'),
      dash: this.keys.has('KeyQ') || this.touchDash,
      dashPressed: this.justPressed('KeyQ') || this.touchDashPressed,
    }
  }

  triggerTouchJump() {
    this.touchJump = true
    this.touchJumpPressed = true
    setTimeout(() => { this.touchJump = false }, 100)
  }

  triggerTouchPowerup() {
    this.touchPowerup = true
    this.touchPowerupPressed = true
    setTimeout(() => { this.touchPowerup = false }, 100)
  }

  triggerTouchDash() {
    this.touchDash = true
    this.touchDashPressed = true
    setTimeout(() => { this.touchDash = false }, 100)
  }

  triggerTouchPause() {
    this.touchPause = true
    this.touchPausePressed = true
    setTimeout(() => { this.touchPause = false }, 100)
  }
}
