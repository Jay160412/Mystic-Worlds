import {
  type PlayerState, type Platform, type Coin, type Enemy, type Projectile,
  type Particle, type Checkpoint, type LevelData, type Vec2, type Rect,
  type WorldTheme, type SkinDef,
  TILE, PLAYER_W, PLAYER_H, GRAVITY, MAX_FALL, RUN_SPEED, SPRINT_SPEED,
  FRICTION_GROUND, FRICTION_AIR, JUMP_VEL, DOUBLE_JUMP_VEL,
  WALL_SLIDE_SPEED, WALL_JUMP_VEL_X, WALL_JUMP_VEL_Y, TRAMPOLINE_VEL,
  ICE_FRICTION, RASENGAN_COOLDOWN, RASENGAN_SPEED, RASENGAN_DAMAGE,
  GEAR5_DURATION, GEAR5_COOLDOWN, GEAR5_SPEED_MULT, GEAR5_JUMP_MULT,
  UI_DURATION, UI_COOLDOWN, UI_DASH_SPEED,
  COLORS, lerp, clamp, rectOverlap, getWorldForLevel, getSkin,
} from './core'
import { InputManager } from './input'
import { AudioManager } from './audio'

export class GameEngine {
  canvas!: HTMLCanvasElement
  ctx!: CanvasRenderingContext2D
  input: InputManager
  audio: AudioManager
  width = 800
  height = 600

  camX = 0; camY = 0; camTargetX = 0; camTargetY = 0
  camZoom = 1; camTargetZoom = 1; screenShake = 0

  player!: PlayerState
  platforms: Platform[] = []
  coins: Coin[] = []
  enemies: Enemy[] = []
  projectiles: Projectile[] = []
  particles: Particle[] = []
  checkpoints: Checkpoint[] = []
  exitZone = { x: 0, y: 0, w: 0, h: 0 }

  currentLevel: LevelData | null = null
  world: WorldTheme | null = null
  levelCoins = 0; levelGold = 0; levelTime = 0
  paused = false; gameOver = false; levelComplete = false
  lastCheckpoint: Vec2 | null = null
  skin: SkinDef | null = null

  // Ambient particles for world theming
  ambientParticles: Particle[] = []
  ambientTimer = 0

  onLevelComplete?: (coins: number, gold: number) => void
  onGameOver?: () => void
  onCoinsChanged?: (coins: number, gold: number) => void
  onHealthChanged?: (health: number) => void
  onPowerupChanged?: () => void

  bgStars: { x: number; y: number; s: number; b: number }[] = []
  running = false; animId = 0; lastTime = 0

  constructor() {
    this.input = new InputManager()
    this.audio = new AudioManager()
    this.generateStars()
  }

  private generateStars() {
    this.bgStars = []
    for (let i = 0; i < 200; i++) {
      this.bgStars.push({ x: Math.random() * 4000, y: Math.random() * 2000, s: Math.random() * 2.5 + 0.5, b: Math.random() * 0.7 + 0.3 })
    }
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.audio.init()
    this.resize()
  }

  resize() {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width; this.height = rect.height
    this.canvas.width = rect.width * dpr; this.canvas.height = rect.height * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  loadLevel(level: LevelData, skinId = 'default') {
    this.currentLevel = level
    this.world = getWorldForLevel(level.id)
    this.skin = getSkin(skinId)
    this.platforms = level.platforms.map(p => ({ ...p, originalX: p.x, originalY: p.y, moveOffset: p.moveOffset ?? Math.random() * Math.PI * 2, fallTimer: 0, fallen: false }))
    this.coins = level.coins.map(c => ({ ...c, collected: false, animTimer: Math.random() * 100 }))
    this.enemies = level.enemies.map(e => ({ ...e, originX: e.x, originY: e.y, vel: { x: e.type === 'patrol' ? 1.5 : 0, y: 0 }, alive: true, hitTimer: 0, phase: 0, attackTimer: 0, attackPattern: 0 }))
    this.checkpoints = level.checkpoints.map(c => ({ ...c, activated: false }))
    this.exitZone = { ...level.exit }
    this.projectiles = []; this.particles = []; this.ambientParticles = []
    this.levelCoins = 0; this.levelGold = 0; this.levelTime = 0
    this.gameOver = false; this.levelComplete = false; this.paused = false
    this.lastCheckpoint = null; this.screenShake = 0; this.ambientTimer = 0

    this.player = {
      pos: { ...level.playerStart }, vel: { x: 0, y: 0 },
      facing: 1, grounded: false, wallSliding: false, wallDir: 0,
      canDoubleJump: true, health: 3, maxHealth: 3,
      invincibleTimer: 0, animState: 'idle', animFrame: 0, animTimer: 0,
      rasenganLevel: 0, rasenganCooldown: 0,
      gear5Level: 0, gear5Active: false, gear5Timer: 0, gear5Cooldown: 0,
      ultraInstinctLevel: 0, ultraInstinctActive: false, ultraInstinctTimer: 0, ultraInstinctCooldown: 0,
      dashDir: 1, skinId,
    }
    this.camX = level.playerStart.x - this.width / 2
    this.camY = level.playerStart.y - this.height / 2
  }

  start() { if (this.running) return; this.running = true; this.lastTime = performance.now(); this.loop() }
  stop() { this.running = false; cancelAnimationFrame(this.animId) }

  private loop = () => {
    if (!this.running) return
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 16.667, 3)
    this.lastTime = now
    if (!this.paused && !this.gameOver && !this.levelComplete) this.update(dt)
    this.render()
    this.input.update()
    this.animId = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    const p = this.player
    const inp = this.input.state
    this.levelTime += dt

    // ---- Player Movement ----
    const g5Lvl = Math.max(0, p.gear5Level - 1)
    const speedMult = p.gear5Active ? GEAR5_SPEED_MULT[g5Lvl] || 1.4 : 1
    const speed = (inp.sprint ? SPRINT_SPEED : RUN_SPEED) * speedMult

    if (p.ultraInstinctActive) {
      p.vel.x = UI_DASH_SPEED * p.dashDir
      p.vel.y = 0
    } else {
      let targetVx = 0
      if (inp.left) { targetVx = -speed; p.facing = -1 }
      if (inp.right) { targetVx = speed; p.facing = 1 }

      if (p.grounded) {
        const fric = this.isOnIce() ? ICE_FRICTION : FRICTION_GROUND
        p.vel.x = p.vel.x * fric + targetVx * (1 - fric)
      } else {
        p.vel.x = p.vel.x * FRICTION_AIR + targetVx * (1 - FRICTION_AIR)
      }

      if (inp.jumpPressed) {
        const jumpMult = p.gear5Active ? (GEAR5_JUMP_MULT[g5Lvl] || 1.2) : 1
        if (p.grounded) {
          p.vel.y = JUMP_VEL * jumpMult; p.grounded = false; p.canDoubleJump = true
          this.audio.jump(); this.spawnDust(p.pos.x + PLAYER_W / 2, p.pos.y + PLAYER_H, 5)
        } else if (p.wallSliding) {
          p.vel.x = WALL_JUMP_VEL_X * -p.wallDir; p.vel.y = WALL_JUMP_VEL_Y * jumpMult
          p.facing = -p.wallDir as 1 | -1; p.wallSliding = false; p.canDoubleJump = true
          this.audio.wallJump(); this.spawnDust(p.pos.x + (p.wallDir > 0 ? PLAYER_W : 0), p.pos.y + PLAYER_H / 2, 4)
        } else if (p.canDoubleJump) {
          p.vel.y = DOUBLE_JUMP_VEL * jumpMult; p.canDoubleJump = false
          this.audio.doubleJump(); this.spawnRing(p.pos.x + PLAYER_W / 2, p.pos.y + PLAYER_H / 2)
        }
      }

      p.vel.y += GRAVITY * dt
      if (p.wallSliding && p.vel.y > WALL_SLIDE_SPEED) p.vel.y = WALL_SLIDE_SPEED
      p.vel.y = Math.min(p.vel.y, MAX_FALL)
    }

    // ---- Power-Up Usage ----
    if (inp.powerupPressed && p.rasenganLevel > 0 && p.rasenganCooldown <= 0) this.fireRasengan()
    if (inp.dashPressed && p.ultraInstinctLevel > 0 && p.ultraInstinctCooldown <= 0 && !p.ultraInstinctActive) this.activateUltraInstinct()
    if (inp.sprint && p.gear5Level > 0 && p.gear5Cooldown <= 0 && !p.gear5Active) this.activateGear5()

    // Timers
    if (p.rasenganCooldown > 0) p.rasenganCooldown -= dt
    if (p.gear5Active) {
      p.gear5Timer -= dt
      if (p.gear5Timer <= 0) { p.gear5Active = false; p.gear5Cooldown = GEAR5_COOLDOWN[g5Lvl] || 900 }
      if (Math.random() < 0.4) this.particles.push({ x: p.pos.x + Math.random() * PLAYER_W, y: p.pos.y + Math.random() * PLAYER_H, vel: { x: (Math.random() - 0.5) * 2, y: -Math.random() * 2 }, life: 20, maxLife: 20, color: COLORS.gear5, size: 4 + Math.random() * 4, type: 'trail' })
    }
    if (p.gear5Cooldown > 0 && !p.gear5Active) p.gear5Cooldown -= dt
    if (p.ultraInstinctActive) {
      p.ultraInstinctTimer -= dt
      if (p.ultraInstinctTimer <= 0) { p.ultraInstinctActive = false; const uLvl = Math.max(0, p.ultraInstinctLevel - 1); p.ultraInstinctCooldown = UI_COOLDOWN[uLvl] || 1200 }
      if (Math.random() < 0.6) this.particles.push({ x: p.pos.x + Math.random() * PLAYER_W, y: p.pos.y + Math.random() * PLAYER_H, vel: { x: -p.dashDir * 3 + (Math.random() - 0.5), y: (Math.random() - 0.5) * 2 }, life: 15, maxLife: 15, color: COLORS.ultraInstinct, size: 3 + Math.random() * 5, type: 'trail' })
    }
    if (p.ultraInstinctCooldown > 0 && !p.ultraInstinctActive) p.ultraInstinctCooldown -= dt
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt

    // ---- Move & Collide ----
    this.movePlayer(dt)
    this.updatePlatforms(dt)
    this.updateEnemies(dt)
    this.updateProjectiles(dt)
    this.updateParticles(dt)
    this.updateAmbientParticles(dt)
    this.collectItems()
    this.checkCheckpoints()
    this.checkExit()
    this.checkHazards()
    this.updateAnimation(dt)
    this.updateCamera(dt)
  }

  private isOnIce(): boolean {
    const pRect: Rect = { x: this.player.pos.x, y: this.player.pos.y + PLAYER_H, w: PLAYER_W, h: 4 }
    return this.platforms.some(pl => pl.type === 'ice' && !pl.fallen && rectOverlap(pRect, { x: pl.x, y: pl.y, w: pl.w, h: pl.h }))
  }

  // ===== IMPROVED COLLISION =====
  private movePlayer(dt: number) {
    const p = this.player

    // Move platforms first to track deltas
    const movingPlatformDelta = this.getMovingPlatformDelta(p)

    // Apply moving platform motion
    if (p.grounded && movingPlatformDelta) {
      p.pos.x += movingPlatformDelta.x
      p.pos.y += movingPlatformDelta.y
    }

    const totalVx = p.vel.x * dt
    const totalVy = p.vel.y * dt
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(totalVx), Math.abs(totalVy)) / 6))
    const sx = totalVx / steps
    const sy = totalVy / steps

    p.grounded = false
    p.wallSliding = false

    for (let i = 0; i < steps; i++) {
      // Horizontal
      p.pos.x += sx
      const xOverlap = this.resolveCollisionX()
      if (xOverlap) p.vel.x = 0

      // Vertical
      p.pos.y += sy
      const yResult = this.resolveCollisionY(sy)
      if (yResult === 'landed') {
        p.grounded = true; p.canDoubleJump = true; p.vel.y = 0
      } else if (yResult === 'trampoline') {
        p.vel.y = TRAMPOLINE_VEL; p.grounded = false
        this.audio.trampoline()
        this.spawnDust(p.pos.x + PLAYER_W / 2, p.pos.y + PLAYER_H, 8)
      } else if (yResult === 'ceiling') {
        p.vel.y = 0
      }
    }

    // Wall detection
    if (!p.grounded && !p.ultraInstinctActive) {
      const wc = 4
      const leftWall = this.platforms.some(pl => pl.type !== 'spike' && !pl.fallen && rectOverlap({ x: p.pos.x - wc, y: p.pos.y + 6, w: wc, h: PLAYER_H - 12 }, { x: pl.x, y: pl.y, w: pl.w, h: pl.h }))
      const rightWall = this.platforms.some(pl => pl.type !== 'spike' && !pl.fallen && rectOverlap({ x: p.pos.x + PLAYER_W, y: p.pos.y + 6, w: wc, h: PLAYER_H - 12 }, { x: pl.x, y: pl.y, w: pl.w, h: pl.h }))
      if ((leftWall || rightWall) && p.vel.y > 0) {
        p.wallSliding = true; p.wallDir = rightWall ? 1 : -1
      }
    }

    // Fall out
    if (p.pos.y > (this.currentLevel?.height || 2000) + 200) this.damagePlayer(p.maxHealth)
  }

  private getMovingPlatformDelta(p: PlayerState): Vec2 | null {
    const footRect: Rect = { x: p.pos.x + 2, y: p.pos.y + PLAYER_H - 2, w: PLAYER_W - 4, h: 6 }
    for (const pl of this.platforms) {
      if (pl.type !== 'moving' || pl.fallen) continue
      if (rectOverlap(footRect, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) {
        const prevX = pl.x; const prevY = pl.y
        // Calculate what the new position will be
        if (pl.moveAxis && pl.moveRange && pl.moveSpeed) {
          const nextOffset = (pl.moveOffset || 0) + pl.moveSpeed * 0.02
          const newPos = pl.moveAxis === 'x'
            ? (pl.originalX || 0) + Math.sin(nextOffset) * pl.moveRange
            : (pl.originalY || 0) + Math.sin(nextOffset) * pl.moveRange
          if (pl.moveAxis === 'x') return { x: newPos - prevX, y: 0 }
          else return { x: 0, y: newPos - prevY }
        }
      }
    }
    return null
  }

  private resolveCollisionX(): boolean {
    const p = this.player
    const pRect: Rect = { x: p.pos.x, y: p.pos.y + 2, w: PLAYER_W, h: PLAYER_H - 4 }
    for (const pl of this.platforms) {
      if (pl.type === 'spike' || pl.fallen) continue
      const plRect: Rect = { x: pl.x, y: pl.y, w: pl.w, h: pl.h }
      if (!rectOverlap(pRect, plRect)) continue

      const overlapLeft = (p.pos.x + PLAYER_W) - pl.x
      const overlapRight = (pl.x + pl.w) - p.pos.x

      if (overlapLeft < overlapRight) {
        p.pos.x = pl.x - PLAYER_W
      } else {
        p.pos.x = pl.x + pl.w
      }
      return true
    }
    return false
  }

  private resolveCollisionY(vy: number): 'landed' | 'trampoline' | 'ceiling' | null {
    const p = this.player
    const pRect: Rect = { x: p.pos.x + 2, y: p.pos.y, w: PLAYER_W - 4, h: PLAYER_H }
    for (const pl of this.platforms) {
      if (pl.type === 'spike' || pl.fallen) continue
      const plRect: Rect = { x: pl.x, y: pl.y, w: pl.w, h: pl.h }
      if (!rectOverlap(pRect, plRect)) continue

      if (vy > 0) {
        // Landing
        p.pos.y = pl.y - PLAYER_H
        if (pl.type === 'trampoline') return 'trampoline'
        if (pl.type === 'falling' && !pl.fallen) {
          pl.fallTimer = (pl.fallTimer || 0) + 1
          if (pl.fallTimer > 25) pl.fallen = true
        }
        return 'landed'
      } else {
        // Hit ceiling
        p.pos.y = pl.y + pl.h
        return 'ceiling'
      }
    }
    return null
  }

  private updatePlatforms(dt: number) {
    for (const pl of this.platforms) {
      if (pl.type === 'moving' && pl.moveAxis && pl.moveRange && pl.moveSpeed) {
        pl.moveOffset = (pl.moveOffset || 0) + pl.moveSpeed * dt * 0.02
        if (pl.moveAxis === 'x') pl.x = (pl.originalX || 0) + Math.sin(pl.moveOffset) * pl.moveRange
        else pl.y = (pl.originalY || 0) + Math.sin(pl.moveOffset) * pl.moveRange
      }
      if (pl.type === 'falling' && pl.fallen) pl.y += 4 * dt
    }
    this.platforms = this.platforms.filter(pl => !pl.fallen || pl.y < (this.currentLevel?.height || 2000) + 500)
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue
      e.hitTimer = Math.max(0, e.hitTimer - dt)

      if (e.type === 'patrol') {
        e.x += e.vel.x * dt
        if (Math.abs(e.x - e.originX) > e.patrolRange) { e.vel.x *= -1; e.facing = e.vel.x > 0 ? 1 : -1 }
        let onGround = false
        for (const pl of this.platforms) {
          if (pl.type === 'spike' || pl.fallen) continue
          if (rectOverlap({ x: e.x, y: e.y + e.h, w: e.w, h: 4 }, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) {
            onGround = true; e.y = pl.y - e.h; break
          }
        }
        if (!onGround) { e.vel.y = Math.min((e.vel.y || 0) + GRAVITY * dt, MAX_FALL); e.y += e.vel.y * dt } else { e.vel.y = 0 }
      }

      if (e.type === 'flying') {
        e.attackTimer = (e.attackTimer || 0) + dt * 0.03
        e.x = e.originX + Math.sin(e.attackTimer) * e.patrolRange
        e.y = e.originY + Math.cos(e.attackTimer * 0.7) * (e.patrolRange * 0.5)
        e.facing = Math.sin(e.attackTimer + 0.1) > Math.sin(e.attackTimer) ? 1 : -1
      }

      if (e.type === 'boss') {
        e.attackTimer = (e.attackTimer || 0) + dt
        const phase = e.health <= e.maxHealth * 0.3 ? 2 : e.health <= e.maxHealth * 0.6 ? 1 : 0
        e.phase = phase
        e.x += e.vel.x * (1.5 + phase * 0.5) * dt
        if (Math.abs(e.x - e.originX) > e.patrolRange) { e.vel.x *= -1; e.facing = e.vel.x > 0 ? 1 : -1 }
        if (e.attackTimer > 120 - phase * 30) {
          e.attackTimer = 0
          const dx = this.player.pos.x - e.x; const dy = this.player.pos.y - e.y
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          this.projectiles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vel: { x: (dx / len) * 3, y: (dy / len) * 3 }, radius: 8, damage: 1, lifetime: 300, type: 'enemy', level: 0 })
        }
      }

      // Collision with player
      if (!this.player.ultraInstinctActive && this.player.invincibleTimer <= 0) {
        const pRect: Rect = { x: this.player.pos.x, y: this.player.pos.y, w: PLAYER_W, h: PLAYER_H }
        const eRect: Rect = { x: e.x, y: e.y, w: e.w, h: e.h }
        if (rectOverlap(pRect, eRect)) {
          if (this.player.vel.y > 0 && this.player.pos.y + PLAYER_H - 10 < e.y + e.h / 2 && e.type !== 'boss') {
            this.hitEnemy(e, 1); this.player.vel.y = JUMP_VEL * 0.7; this.player.canDoubleJump = true
          } else if (!this.player.gear5Active) {
            this.damagePlayer(1)
            this.player.vel.x = this.player.pos.x < e.x ? -6 : 6; this.player.vel.y = -6
          }
        }
      }
    }
  }

  private hitEnemy(e: Enemy, damage: number) {
    e.health -= damage; e.hitTimer = 10
    this.audio.enemyHit(); this.spawnHitParticles(e.x + e.w / 2, e.y + e.h / 2)
    if (e.health <= 0) {
      e.alive = false; this.audio.enemyDeath(); this.screenShake = 8
      for (let i = 0; i < 12; i++) this.particles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vel: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }, life: 30, maxLife: 30, color: e.type === 'boss' ? COLORS.boss : COLORS.enemy, size: 4 + Math.random() * 6, type: 'hit' })
      const coinDrop = e.type === 'boss' ? 10 : 2
      for (let i = 0; i < coinDrop; i++) this.coins.push({ x: e.x + Math.random() * e.w, y: e.y + Math.random() * e.h / 2, collected: false, type: e.type === 'boss' ? 'gold' : 'coin', animTimer: Math.random() * 100 })
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      proj.x += proj.vel.x * dt; proj.y += proj.vel.y * dt; proj.lifetime -= dt
      if (Math.random() < 0.5) this.particles.push({ x: proj.x, y: proj.y, vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }, life: 10, maxLife: 10, color: proj.type === 'rasengan' ? COLORS.rasengan : COLORS.ruby, size: proj.radius * 0.5, type: 'trail' })
      if (proj.lifetime <= 0) { this.projectiles.splice(i, 1); continue }

      if (proj.type === 'rasengan') {
        let hits = 0; const maxHits = this.player.rasenganLevel >= 3 ? 99 : this.player.rasenganLevel
        for (const e of this.enemies) {
          if (!e.alive || hits >= maxHits) continue
          if (rectOverlap({ x: proj.x - proj.radius, y: proj.y - proj.radius, w: proj.radius * 2, h: proj.radius * 2 }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
            this.hitEnemy(e, RASENGAN_DAMAGE[this.player.rasenganLevel - 1] || 1); hits++
            if (this.player.rasenganLevel < 3) { this.projectiles.splice(i, 1); break }
          }
        }
        if (this.player.rasenganLevel >= 3) proj.radius = Math.min(proj.radius + 2 * dt, 200)
      }

      if (proj.type === 'enemy' && !this.player.ultraInstinctActive && this.player.invincibleTimer <= 0 && !this.player.gear5Active) {
        if (rectOverlap({ x: proj.x - proj.radius, y: proj.y - proj.radius, w: proj.radius * 2, h: proj.radius * 2 }, { x: this.player.pos.x, y: this.player.pos.y, w: PLAYER_W, h: PLAYER_H })) {
          this.damagePlayer(proj.damage); this.projectiles.splice(i, 1)
        }
      }

      // Wall collision for rasengan
      if (proj.type === 'rasengan' && this.player.rasenganLevel < 3) {
        for (const pl of this.platforms) {
          if (pl.type === 'spike' || pl.fallen) continue
          if (rectOverlap({ x: proj.x - proj.radius, y: proj.y - proj.radius, w: proj.radius * 2, h: proj.radius * 2 }, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) {
            this.projectiles.splice(i, 1); break
          }
        }
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vel.x * dt; p.y += p.vel.y * dt; p.life -= dt
      if (p.type === 'dust' || p.type === 'hit') p.vel.y += 0.1 * dt
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private updateAmbientParticles(dt: number) {
    this.ambientTimer += dt
    if (this.world && this.ambientTimer > 3) {
      this.ambientTimer = 0
      const ap = this.world.ambientParticles
      const x = this.camX + Math.random() * this.width
      const y = this.camY + Math.random() * this.height
      let vx = 0, vy = 0
      if (ap.type === 'firefly') { vx = (Math.random() - 0.5) * 0.8; vy = -0.3 - Math.random() * 0.5 }
      else if (ap.type === 'crystal') { vx = 0; vy = -0.2 - Math.random() * 0.3 }
      else if (ap.type === 'snow') { vx = (Math.random() - 0.5) * 0.5; vy = 0.5 + Math.random() * 0.5 }
      else if (ap.type === 'ember') { vx = (Math.random() - 0.5) * 1.2; vy = -0.8 - Math.random() * 0.8 }
      else if (ap.type === 'void') { vx = (Math.random() - 0.5) * 1.5; vy = (Math.random() - 0.5) * 1.5 }
      this.ambientParticles.push({ x, y, vel: { x: vx, y: vy }, life: 120, maxLife: 120, color: ap.color, size: 2 + Math.random() * 3, type: 'ambient' })
    }
    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const p = this.ambientParticles[i]
      p.x += p.vel.x * dt; p.y += p.vel.y * dt; p.life -= dt
      if (p.life <= 0) this.ambientParticles.splice(i, 1)
    }
    // Cap
    while (this.ambientParticles.length > 60) this.ambientParticles.shift()
  }

  private collectItems() {
    const p = this.player
    const pRect: Rect = { x: p.pos.x - 5, y: p.pos.y - 5, w: PLAYER_W + 10, h: PLAYER_H + 10 }
    for (const c of this.coins) {
      if (c.collected) continue
      c.animTimer += 0.05
      if (rectOverlap(pRect, { x: c.x - 10, y: c.y - 10, w: 20, h: 20 })) {
        c.collected = true
        if (c.type === 'coin') { this.levelCoins++; this.audio.coin() } else { this.levelGold++; this.audio.goldStone() }
        this.onCoinsChanged?.(this.levelCoins, this.levelGold)
        for (let i = 0; i < 8; i++) this.particles.push({ x: c.x, y: c.y, vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }, life: 20, maxLife: 20, color: c.type === 'coin' ? COLORS.gold : COLORS.coinGold, size: 3 + Math.random() * 3, type: 'sparkle' })
      }
    }
  }

  private checkCheckpoints() {
    const p = this.player
    for (const cp of this.checkpoints) {
      if (cp.activated) continue
      if (Math.abs(p.pos.x + PLAYER_W / 2 - cp.x) < TILE && Math.abs(p.pos.y + PLAYER_H / 2 - cp.y) < TILE * 1.5) {
        cp.activated = true; this.lastCheckpoint = { x: cp.x - PLAYER_W / 2, y: cp.y - PLAYER_H }
        this.audio.checkpoint()
        for (let i = 0; i < 15; i++) this.particles.push({ x: cp.x, y: cp.y, vel: { x: (Math.random() - 0.5) * 4, y: -Math.random() * 6 }, life: 40, maxLife: 40, color: COLORS.checkpointActive, size: 3 + Math.random() * 4, type: 'sparkle' })
      }
    }
  }

  private checkExit() {
    const p = this.player
    if (rectOverlap({ x: p.pos.x, y: p.pos.y, w: PLAYER_W, h: PLAYER_H }, this.exitZone) && this.enemies.filter(e => e.type === 'boss' && e.alive).length === 0) {
      this.levelComplete = true; this.audio.levelComplete(); this.screenShake = 5
      this.onLevelComplete?.(this.levelCoins, this.levelGold)
    }
  }

  private checkHazards() {
    if (this.player.ultraInstinctActive || this.player.invincibleTimer > 0) return
    const pRect: Rect = { x: this.player.pos.x + 2, y: this.player.pos.y + 2, w: PLAYER_W - 4, h: PLAYER_H - 4 }
    for (const pl of this.platforms) {
      if (pl.type === 'spike' && rectOverlap(pRect, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) {
        this.damagePlayer(1); this.player.vel.y = -8; break
      }
    }
  }

  private damagePlayer(amount: number) {
    if (this.player.invincibleTimer > 0 || this.player.gear5Active) return
    this.player.health -= amount; this.player.invincibleTimer = 90; this.player.animState = 'damage'
    this.screenShake = 12; this.audio.hit()
    this.onHealthChanged?.(this.player.health)
    this.spawnHitParticles(this.player.pos.x + PLAYER_W / 2, this.player.pos.y + PLAYER_H / 2)
    if (this.player.health <= 0) {
      if (this.lastCheckpoint) {
        this.player.pos = { ...this.lastCheckpoint }; this.player.vel = { x: 0, y: 0 }
        this.player.health = this.player.maxHealth; this.player.invincibleTimer = 120
        this.onHealthChanged?.(this.player.health)
      } else { this.gameOver = true; this.audio.gameOver(); this.onGameOver?.() }
    }
  }

  private fireRasengan() {
    const p = this.player; const lvl = p.rasenganLevel
    p.rasenganCooldown = RASENGAN_COOLDOWN[lvl - 1] || 600
    this.audio.rasengan()
    this.projectiles.push({ x: p.pos.x + PLAYER_W / 2 + p.facing * 20, y: p.pos.y + PLAYER_H / 2, vel: { x: RASENGAN_SPEED * p.facing, y: 0 }, radius: lvl >= 3 ? 20 : 12, damage: RASENGAN_DAMAGE[lvl - 1] || 1, lifetime: lvl >= 3 ? 60 : 180, type: 'rasengan', level: lvl })
    this.screenShake = 4; this.onPowerupChanged?.()
  }

  private activateGear5() {
    const p = this.player; const lvl = Math.max(0, p.gear5Level - 1)
    p.gear5Active = true; p.gear5Timer = GEAR5_DURATION[lvl] || 240; p.gear5Cooldown = 0
    this.audio.gear5(); this.screenShake = 6
    for (let i = 0; i < 20; i++) this.particles.push({ x: p.pos.x + PLAYER_W / 2, y: p.pos.y + PLAYER_H / 2, vel: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 }, life: 30, maxLife: 30, color: COLORS.gear5, size: 5 + Math.random() * 8, type: 'powerup' })
    this.onPowerupChanged?.()
  }

  private activateUltraInstinct() {
    const p = this.player; const lvl = Math.max(0, p.ultraInstinctLevel - 1)
    p.ultraInstinctActive = true; p.ultraInstinctTimer = UI_DURATION[lvl] || 150; p.ultraInstinctCooldown = 0; p.dashDir = p.facing
    this.audio.ultraInstinct(); this.camTargetZoom = 1.1
    for (let i = 0; i < 15; i++) this.particles.push({ x: p.pos.x + PLAYER_W / 2, y: p.pos.y + PLAYER_H / 2, vel: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }, life: 25, maxLife: 25, color: COLORS.ultraInstinct, size: 4 + Math.random() * 6, type: 'powerup' })
    this.onPowerupChanged?.()
  }

  private updateAnimation(dt: number) {
    const p = this.player; p.animTimer += dt
    if (p.invincibleTimer > 0 && p.animState === 'damage' && p.animTimer > 10) p.animState = 'idle'
    if (p.animState !== 'damage') {
      if (p.ultraInstinctActive) p.animState = 'dash'
      else if (p.wallSliding) p.animState = 'wallslide'
      else if (!p.grounded && p.vel.y < 0) p.animState = 'jump'
      else if (!p.grounded && p.vel.y > 0) p.animState = 'fall'
      else if (Math.abs(p.vel.x) > 1) p.animState = 'run'
      else p.animState = 'idle'
    }
    if (p.animTimer > 6) { p.animFrame = (p.animFrame + 1) % 4; p.animTimer = 0 }
  }

  private updateCamera(dt: number) {
    const p = this.player
    this.camTargetX = p.pos.x + PLAYER_W / 2 - this.width / 2 + p.vel.x * 15
    this.camTargetY = p.pos.y + PLAYER_H / 2 - this.height / 2 + p.vel.y * 5
    if (this.currentLevel) {
      this.camTargetX = clamp(this.camTargetX, 0, Math.max(0, this.currentLevel.width - this.width))
      this.camTargetY = clamp(this.camTargetY, -100, this.currentLevel.height - this.height + 100)
    }
    this.camX = lerp(this.camX, this.camTargetX, 0.08 * dt)
    this.camY = lerp(this.camY, this.camTargetY, 0.08 * dt)
    if (!this.player.ultraInstinctActive) this.camTargetZoom = 1
    this.camZoom = lerp(this.camZoom, this.camTargetZoom, 0.05 * dt)
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - 0.5 * dt)
  }

  // ===== RENDERING =====
  render() {
    const ctx = this.ctx; const w = this.width; const h = this.height
    ctx.save()
    if (this.screenShake > 0) ctx.translate((Math.random() - 0.5) * this.screenShake * 2, (Math.random() - 0.5) * this.screenShake * 2)
    this.renderBackground(ctx, w, h)

    ctx.save()
    const zoomOffX = (1 - this.camZoom) * w / 2; const zoomOffY = (1 - this.camZoom) * h / 2
    ctx.translate(zoomOffX, zoomOffY); ctx.scale(this.camZoom, this.camZoom); ctx.translate(-this.camX, -this.camY)

    this.renderWorldDecorations(ctx)
    this.renderPlatforms(ctx)
    this.renderCoins(ctx)
    this.renderCheckpoints(ctx)
    this.renderExit(ctx)
    this.renderEnemies(ctx)
    this.renderProjectiles(ctx)
    this.renderPlayer(ctx)
    this.renderParticles(ctx)
    this.renderAmbientParticles(ctx)

    ctx.restore(); ctx.restore()
  }

  private renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const world = this.world
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    if (world) {
      grad.addColorStop(0, world.bgGradient[0]); grad.addColorStop(0.5, world.bgGradient[1]); grad.addColorStop(1, world.bgGradient[2])
    } else {
      grad.addColorStop(0, '#0B0E1A'); grad.addColorStop(1, '#1A1040')
    }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

    // Stars
    for (const s of this.bgStars) {
      const px = ((s.x - this.camX * 0.1) % (w + 100)) - 50
      const py = ((s.y - this.camY * 0.05) % (h + 100)) - 50
      ctx.globalAlpha = s.b * (0.5 + Math.sin(this.levelTime * 0.02 + s.x) * 0.3)
      ctx.fillStyle = world?.ambientParticles.color || '#FFF'
      ctx.beginPath(); ctx.arc(px, py, s.s, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    // Far mountains (world-themed color)
    const mColor1 = world ? world.fogColor.replace(/[\d.]+\)$/, '0.5)') : 'rgba(20,30,50,0.6)'
    const mColor2 = world ? world.fogColor.replace(/[\d.]+\)$/, '0.7)') : 'rgba(15,20,35,0.8)'

    ctx.fillStyle = mColor1
    ctx.beginPath(); ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 50) {
      const mx = x + this.camX * 0.05
      ctx.lineTo(x, h - 140 - Math.sin(mx * 0.003) * 80 - Math.sin(mx * 0.007) * 50 - Math.cos(mx * 0.011) * 20)
    }
    ctx.lineTo(w, h); ctx.fill()

    ctx.fillStyle = mColor2
    ctx.beginPath(); ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 35) {
      const mx = x + this.camX * 0.15
      ctx.lineTo(x, h - 70 - Math.sin(mx * 0.005) * 55 - Math.sin(mx * 0.012) * 35)
    }
    ctx.lineTo(w, h); ctx.fill()

    // World fog overlay
    if (world) {
      ctx.fillStyle = world.fogColor; ctx.fillRect(0, 0, w, h)
    }
  }

  private renderWorldDecorations(ctx: CanvasRenderingContext2D) {
    if (!this.world || !this.currentLevel) return
    const world = this.world

    // Draw world-specific background elements
    if (world.id === 'enchanted_forest') {
      // Background trees
      for (let tx = 0; tx < this.currentLevel.width; tx += 180) {
        const bx = tx - this.camX * 0.3 + this.camX
        if (bx < this.camX - 100 || bx > this.camX + this.width + 100) continue
        const th = 100 + Math.sin(tx * 0.01) * 40
        // Trunk
        ctx.fillStyle = '#2A1810'
        ctx.fillRect(bx + 8, this.currentLevel.height - 120 - th + 50, 14, th)
        // Canopy layers
        const colors = world.foliageColors || ['#2E8B57']
        for (let l = 0; l < 3; l++) {
          ctx.fillStyle = colors[l % colors.length]
          ctx.globalAlpha = 0.4
          ctx.beginPath()
          ctx.arc(bx + 15, this.currentLevel.height - 120 - th + 50 - l * 15, 30 - l * 5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      // Mushrooms
      for (let mx = 50; mx < this.currentLevel.width; mx += 300) {
        const by = this.currentLevel.height - 120
        if (mx < this.camX - 50 || mx > this.camX + this.width + 50) continue
        ctx.fillStyle = '#D4A574'
        ctx.fillRect(mx, by - 10, 6, 12)
        ctx.fillStyle = '#E74C3C'
        ctx.beginPath(); ctx.arc(mx + 3, by - 12, 10, Math.PI, 0); ctx.fill()
        ctx.fillStyle = '#FFF'
        ctx.beginPath(); ctx.arc(mx, by - 16, 2.5, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(mx + 6, by - 14, 2, 0, Math.PI * 2); ctx.fill()
      }
    }

    if (world.id === 'crystal_caverns') {
      // Stalactites from top
      for (let sx = 30; sx < this.currentLevel.width; sx += 120) {
        if (sx < this.camX - 50 || sx > this.camX + this.width + 50) continue
        const sh = 30 + Math.sin(sx * 0.03) * 20
        ctx.fillStyle = '#4A3D8E'
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.moveTo(sx - 10, 0); ctx.lineTo(sx, sh); ctx.lineTo(sx + 10, 0)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      // Crystal formations
      for (let cx = 80; cx < this.currentLevel.width; cx += 250) {
        if (cx < this.camX - 50 || cx > this.camX + this.width + 50) continue
        const by = this.currentLevel.height - 120
        const colors = ['#9370DB', '#6A5ACD', '#BA55D3', '#8A2BE2']
        for (let c = 0; c < 3; c++) {
          const ch = 20 + c * 12
          const angle = (c - 1) * 0.3
          ctx.save(); ctx.translate(cx + c * 12, by); ctx.rotate(angle)
          ctx.fillStyle = colors[c % colors.length]; ctx.globalAlpha = 0.7
          ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, -ch); ctx.lineTo(4, 0); ctx.fill()
          // Crystal glow
          ctx.shadowBlur = 8; ctx.shadowColor = colors[c % colors.length]
          ctx.fill(); ctx.shadowBlur = 0
          ctx.restore(); ctx.globalAlpha = 1
        }
      }
    }

    if (world.id === 'celestial_peaks') {
      // Floating clouds
      for (let cx = 0; cx < this.currentLevel.width; cx += 200) {
        const bx = cx - this.camX * 0.2 + this.camX
        if (bx < this.camX - 200 || bx > this.camX + this.width + 200) continue
        const cy = 80 + Math.sin(cx * 0.005 + this.levelTime * 0.01) * 30
        ctx.fillStyle = 'rgba(200,200,255,0.12)'
        ctx.beginPath(); ctx.ellipse(bx, cy, 60, 20, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(bx + 30, cy - 8, 40, 15, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(bx - 20, cy + 5, 45, 18, 0, 0, Math.PI * 2); ctx.fill()
      }
      // Mini temple pillars in bg
      for (let px = 400; px < this.currentLevel.width; px += 500) {
        if (px < this.camX - 50 || px > this.camX + this.width + 50) continue
        const by = this.currentLevel.height - 120
        ctx.fillStyle = 'rgba(240,230,140,0.2)'
        ctx.fillRect(px, by - 60, 10, 60)
        ctx.fillRect(px + 20, by - 80, 10, 80)
        ctx.fillRect(px - 2, by - 64, 34, 6)
      }
    }

    if (world.id === 'shadow_citadel') {
      // Torches
      for (let tx = 100; tx < this.currentLevel.width; tx += 200) {
        if (tx < this.camX - 50 || tx > this.camX + this.width + 50) continue
        const by = this.currentLevel.height - 120
        ctx.fillStyle = '#4A3020'
        ctx.fillRect(tx, by - 40, 6, 42)
        // Flame
        const flicker = Math.sin(this.levelTime * 0.3 + tx) * 3
        ctx.fillStyle = '#FF6600'
        ctx.beginPath(); ctx.arc(tx + 3, by - 44 + flicker, 8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#FFCC00'
        ctx.beginPath(); ctx.arc(tx + 3, by - 46 + flicker, 4, 0, Math.PI * 2); ctx.fill()
        // Light glow
        ctx.globalAlpha = 0.08
        ctx.fillStyle = '#FF6600'
        ctx.beginPath(); ctx.arc(tx + 3, by - 44, 50, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      }
      // Chains hanging
      for (let cx = 60; cx < this.currentLevel.width; cx += 300) {
        if (cx < this.camX - 50 || cx > this.camX + this.width + 50) continue
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2
        for (let l = 0; l < 8; l++) {
          const swing = Math.sin(this.levelTime * 0.02 + cx) * 3
          ctx.beginPath(); ctx.arc(cx + swing, l * 12, 5, 0, Math.PI * 2); ctx.stroke()
        }
      }
    }

    if (world.id === 'eternal_abyss') {
      // Rune circles
      for (let rx = 200; rx < this.currentLevel.width; rx += 350) {
        if (rx < this.camX - 80 || rx > this.camX + this.width + 80) continue
        const ry = this.currentLevel.height - 80
        ctx.strokeStyle = '#00CED1'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.2 + Math.sin(this.levelTime * 0.05 + rx) * 0.1
        ctx.beginPath(); ctx.arc(rx, ry, 30, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.arc(rx, ry, 22, 0, Math.PI * 2); ctx.stroke()
        // Rotating inner lines
        const rot = this.levelTime * 0.02 + rx * 0.01
        for (let l = 0; l < 6; l++) {
          const a = rot + (l / 6) * Math.PI * 2
          ctx.beginPath(); ctx.moveTo(rx, ry)
          ctx.lineTo(rx + Math.cos(a) * 22, ry + Math.sin(a) * 22); ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      // Floating eye decorations
      for (let ex = 500; ex < this.currentLevel.width; ex += 600) {
        if (ex < this.camX - 50 || ex > this.camX + this.width + 50) continue
        const ey = 100 + Math.sin(this.levelTime * 0.015 + ex) * 20
        ctx.fillStyle = 'rgba(0,206,209,0.15)'
        ctx.beginPath(); ctx.ellipse(ex, ey, 20, 12, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#00CED1'
        ctx.globalAlpha = 0.4
        ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D) {
    const world = this.world
    for (const pl of this.platforms) {
      if (pl.fallen && pl.y > this.camY + this.height + 100) continue
      if (pl.x + pl.w < this.camX - 100 || pl.x > this.camX + this.width + 100) continue
      if (pl.y + pl.h < this.camY - 100 || pl.y > this.camY + this.height + 100) continue

      if (pl.type === 'spike') {
        ctx.fillStyle = COLORS.spike
        const count = Math.floor(pl.w / 20)
        for (let i = 0; i < count; i++) {
          ctx.beginPath()
          ctx.moveTo(pl.x + i * 20, pl.y + pl.h); ctx.lineTo(pl.x + i * 20 + 10, pl.y); ctx.lineTo(pl.x + i * 20 + 20, pl.y + pl.h)
          ctx.fill()
        }
        continue
      }

      if (pl.type === 'trampoline') {
        ctx.fillStyle = '#6B3FA0'; ctx.fillRect(pl.x + 2, pl.y + pl.h * 0.4, pl.w - 4, pl.h * 0.6)
        ctx.fillStyle = COLORS.trampoline; ctx.fillRect(pl.x, pl.y, pl.w, pl.h * 0.4)
        ctx.fillStyle = COLORS.trampolineTop; ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, 4)
        // Spring coils
        ctx.strokeStyle = '#8B5FBB'; ctx.lineWidth = 2
        for (let sx = pl.x + 8; sx < pl.x + pl.w - 8; sx += 12) {
          ctx.beginPath(); ctx.moveTo(sx, pl.y + pl.h * 0.4); ctx.lineTo(sx, pl.y + pl.h * 0.9); ctx.stroke()
        }
        continue
      }

      const isIce = pl.type === 'ice'; const isMoving = pl.type === 'moving'; const isFalling = pl.type === 'falling'
      if (pl.fallen) ctx.globalAlpha = 0.5

      // Use world-themed colors
      const platColor = isIce ? '#A8D8EA' : (world?.platformColor || '#3D2B1F')
      const topColor = isIce ? '#C8E8FA' : (world?.platformTop || '#5C4033')

      ctx.fillStyle = platColor; ctx.fillRect(pl.x, pl.y, pl.w, pl.h)
      ctx.fillStyle = topColor; ctx.fillRect(pl.x, pl.y, pl.w, 5)

      // Texture
      ctx.strokeStyle = isIce ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1
      for (let gx = pl.x + TILE; gx < pl.x + pl.w; gx += TILE) {
        ctx.beginPath(); ctx.moveTo(gx, pl.y + 5); ctx.lineTo(gx, pl.y + pl.h); ctx.stroke()
      }

      // Horizontal line detail
      if (pl.h > TILE) {
        for (let gy = pl.y + TILE; gy < pl.y + pl.h; gy += TILE) {
          ctx.beginPath(); ctx.moveTo(pl.x, gy); ctx.lineTo(pl.x + pl.w, gy); ctx.stroke()
        }
      }

      if (isMoving) {
        ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.setLineDash([4, 4])
        ctx.strokeRect(pl.x, pl.y, pl.w, pl.h); ctx.setLineDash([])
      }
      if (isFalling && !pl.fallen) {
        // Warning cracks
        ctx.strokeStyle = 'rgba(139,115,85,0.6)'; ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pl.x + pl.w * 0.3, pl.y + 2); ctx.lineTo(pl.x + pl.w * 0.5, pl.y + pl.h * 0.6)
        ctx.lineTo(pl.x + pl.w * 0.7, pl.y + 4); ctx.stroke()
      }
      if (isIce) {
        // Shine effect
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.beginPath()
        ctx.moveTo(pl.x + 5, pl.y + 2); ctx.lineTo(pl.x + pl.w * 0.3, pl.y + 2)
        ctx.lineTo(pl.x + pl.w * 0.2, pl.y + pl.h * 0.4); ctx.lineTo(pl.x + 5, pl.y + pl.h * 0.3)
        ctx.fill()
      }
      if (pl.fallen) ctx.globalAlpha = 1
    }
  }

  private renderCoins(ctx: CanvasRenderingContext2D) {
    for (const c of this.coins) {
      if (c.collected) continue
      const pulse = Math.sin(c.animTimer) * 0.15 + 1; const r = 8 * pulse; const isGold = c.type === 'gold'
      ctx.save(); ctx.translate(c.x, c.y)
      ctx.shadowBlur = isGold ? 15 : 10; ctx.shadowColor = isGold ? COLORS.coinGold : COLORS.gold
      ctx.fillStyle = isGold ? COLORS.coinGold : COLORS.gold
      ctx.beginPath()
      if (isGold) { ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath() }
      else { ctx.arc(0, 0, r, 0, Math.PI * 2) }
      ctx.fill()
      ctx.fillStyle = isGold ? '#FFE082' : COLORS.goldLight
      ctx.beginPath()
      if (isGold) { ctx.moveTo(0, -r + 3); ctx.lineTo(r - 3, 0); ctx.lineTo(0, 2); ctx.lineTo(-r + 3, 0); ctx.closePath() }
      else { ctx.arc(-2, -2, r * 0.5, 0, Math.PI * 2) }
      ctx.fill()
      ctx.shadowBlur = 0; ctx.restore()
    }
  }

  private renderCheckpoints(ctx: CanvasRenderingContext2D) {
    for (const cp of this.checkpoints) {
      const color = cp.activated ? COLORS.checkpointActive : COLORS.checkpoint
      ctx.fillStyle = '#666'; ctx.fillRect(cp.x - 2, cp.y - 30, 4, 50)
      ctx.fillStyle = color; ctx.beginPath()
      ctx.moveTo(cp.x + 2, cp.y - 30); ctx.lineTo(cp.x + 22, cp.y - 20); ctx.lineTo(cp.x + 2, cp.y - 10); ctx.fill()
      if (cp.activated) { ctx.shadowBlur = 10; ctx.shadowColor = COLORS.checkpointActive; ctx.fill(); ctx.shadowBlur = 0 }
    }
  }

  private renderExit(ctx: CanvasRenderingContext2D) {
    const e = this.exitZone; const pulse = Math.sin(this.levelTime * 0.05) * 0.3 + 0.7
    ctx.save(); ctx.shadowBlur = 20 * pulse; ctx.shadowColor = COLORS.gold
    ctx.fillStyle = `rgba(255,215,0,${0.15 * pulse})`; ctx.fillRect(e.x - 8, e.y - 8, e.w + 16, e.h + 16)
    ctx.fillStyle = `rgba(255,215,0,${0.35 * pulse})`; ctx.fillRect(e.x, e.y, e.w, e.h)
    // Spinning rune circle
    ctx.strokeStyle = `rgba(255,215,0,${0.5 * pulse})`; ctx.lineWidth = 2
    const cx = e.x + e.w / 2; const cy = e.y + e.h / 2
    ctx.beginPath(); ctx.arc(cx, cy, e.w / 2 + 5, 0, Math.PI * 2); ctx.stroke()
    const rot = this.levelTime * 0.03
    for (let a = 0; a < 4; a++) {
      const angle = rot + a * Math.PI / 2
      ctx.beginPath(); ctx.arc(cx, cy, e.w / 2 + 5, angle, angle + 0.5); ctx.stroke()
    }
    ctx.fillStyle = COLORS.gold; ctx.beginPath()
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 10, cy + 4); ctx.lineTo(cx - 10, cy + 4); ctx.fill()
    ctx.shadowBlur = 0; ctx.restore()
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
      if (!e.alive) continue
      ctx.save()
      if (e.hitTimer > 0) ctx.globalAlpha = 0.5 + Math.sin(e.hitTimer * 2) * 0.5

      if (e.type === 'patrol') {
        ctx.fillStyle = COLORS.enemy; ctx.fillRect(e.x + 3, e.y + 3, e.w - 6, e.h - 6)
        ctx.strokeStyle = '#A33'; ctx.lineWidth = 2; ctx.strokeRect(e.x + 3, e.y + 3, e.w - 6, e.h - 6)
        const eyeX = e.facing > 0 ? e.x + e.w * 0.6 : e.x + e.w * 0.2
        ctx.fillStyle = '#FFF'; ctx.fillRect(eyeX, e.y + 10, 6, 6); ctx.fillRect(eyeX + 10, e.y + 10, 6, 6)
        ctx.fillStyle = '#000'; ctx.fillRect(eyeX + 2, e.y + 12, 3, 3); ctx.fillRect(eyeX + 12, e.y + 12, 3, 3)
      }

      if (e.type === 'flying') {
        ctx.fillStyle = COLORS.enemyFlying; ctx.beginPath()
        ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w / 2 - 2, 0, Math.PI * 2); ctx.fill()
        const wingOff = Math.sin(this.levelTime * 0.3) * 5
        ctx.fillStyle = '#C77DBA'
        ctx.beginPath(); ctx.ellipse(e.x - 5, e.y + e.h / 2 + wingOff, 10, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(e.x + e.w + 5, e.y + e.h / 2 - wingOff, 10, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#FFF'; ctx.fillRect(e.x + e.w / 2 - 6, e.y + e.h / 2 - 5, 5, 5)
        ctx.fillRect(e.x + e.w / 2 + 1, e.y + e.h / 2 - 5, 5, 5)
      }

      if (e.type === 'boss') {
        const phase = e.phase || 0; const bossColors = ['#C0392B', '#E74C3C', '#FF6B6B']
        ctx.fillStyle = bossColors[phase]; ctx.fillRect(e.x, e.y, e.w, e.h)
        // Crown
        ctx.fillStyle = COLORS.gold; ctx.beginPath()
        ctx.moveTo(e.x + 10, e.y); ctx.lineTo(e.x + 15, e.y - 15); ctx.lineTo(e.x + e.w / 2 - 5, e.y - 5)
        ctx.lineTo(e.x + e.w / 2, e.y - 20); ctx.lineTo(e.x + e.w / 2 + 5, e.y - 5)
        ctx.lineTo(e.x + e.w - 15, e.y - 15); ctx.lineTo(e.x + e.w - 10, e.y); ctx.fill()
        ctx.fillStyle = '#FFF'; ctx.fillRect(e.x + 15, e.y + 15, 12, 10); ctx.fillRect(e.x + e.w - 27, e.y + 15, 12, 10)
        ctx.fillStyle = phase >= 2 ? '#FF0' : '#000'; ctx.fillRect(e.x + 19, e.y + 18, 6, 6); ctx.fillRect(e.x + e.w - 23, e.y + 18, 6, 6)
        // Health bar
        ctx.fillStyle = '#333'; ctx.fillRect(e.x, e.y - 30, e.w, 8)
        ctx.fillStyle = e.health > e.maxHealth * 0.3 ? COLORS.emerald : COLORS.ruby
        ctx.fillRect(e.x, e.y - 30, e.w * (e.health / e.maxHealth), 8)
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.strokeRect(e.x, e.y - 30, e.w, 8)
      }
      ctx.restore()
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const proj of this.projectiles) {
      ctx.save()
      if (proj.type === 'rasengan') {
        ctx.shadowBlur = 15; ctx.shadowColor = COLORS.rasengan; ctx.fillStyle = COLORS.rasengan; ctx.globalAlpha = 0.7
        ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius + 4, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1; ctx.fillStyle = '#E0F7FA'; ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius * 0.6, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2
        const rot = this.levelTime * 0.2
        for (let i = 0; i < 3; i++) { const a = rot + (i * Math.PI * 2) / 3; ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius * 0.8, a, a + 0.8); ctx.stroke() }
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = '#FF4444'; ctx.shadowBlur = 8; ctx.shadowColor = '#FF0000'
        ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      }
      ctx.restore()
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player; const skin = this.skin || getSkin('default')
    ctx.save()
    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer / 3) % 2 === 0) ctx.globalAlpha = 0.4
    const x = p.pos.x; const y = p.pos.y

    // Skin aura
    if (skin.auraType !== 'none' && skin.auraColor) {
      ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.2 + Math.sin(this.levelTime * 0.1) * 0.1)
      ctx.fillStyle = skin.auraColor
      if (skin.auraType === 'flame') {
        for (let i = 0; i < 3; i++) {
          const fy = Math.sin(this.levelTime * 0.15 + i * 2) * 5
          ctx.beginPath(); ctx.arc(x + PLAYER_W / 2 + (i - 1) * 8, y + PLAYER_H / 2 + fy, PLAYER_W * 0.5 + i * 3, 0, Math.PI * 2); ctx.fill()
        }
      } else if (skin.auraType === 'electric') {
        ctx.strokeStyle = skin.auraColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4
        for (let i = 0; i < 4; i++) {
          const a = this.levelTime * 0.2 + i * Math.PI / 2
          const ex = Math.cos(a) * (PLAYER_W * 0.8); const ey = Math.sin(a) * (PLAYER_H * 0.5)
          ctx.beginPath(); ctx.moveTo(x + PLAYER_W / 2, y + PLAYER_H / 2)
          ctx.lineTo(x + PLAYER_W / 2 + ex, y + PLAYER_H / 2 + ey); ctx.stroke()
        }
      } else {
        ctx.beginPath(); ctx.arc(x + PLAYER_W / 2, y + PLAYER_H / 2, PLAYER_W * 0.8, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = p.invincibleTimer > 0 && Math.floor(p.invincibleTimer / 3) % 2 === 0 ? 0.4 : 1
    }

    // Power-up glow (overrides skin aura)
    if (p.gear5Active) {
      ctx.shadowBlur = 25; ctx.shadowColor = COLORS.gear5
      ctx.fillStyle = 'rgba(255,107,107,0.2)'; ctx.beginPath(); ctx.arc(x + PLAYER_W / 2, y + PLAYER_H / 2, PLAYER_W, 0, Math.PI * 2); ctx.fill()
    }
    if (p.ultraInstinctActive) {
      ctx.shadowBlur = 30; ctx.shadowColor = COLORS.ultraInstinct
      ctx.fillStyle = 'rgba(224,224,224,0.15)'; ctx.beginPath(); ctx.arc(x + PLAYER_W / 2, y + PLAYER_H / 2, PLAYER_W * 1.2, 0, Math.PI * 2); ctx.fill()
    }

    ctx.save()
    ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2); ctx.scale(p.facing, 1); ctx.translate(-PLAYER_W / 2, -PLAYER_H / 2)

    let bodyColor = skin.bodyColor; let headColor = skin.headColor
    if (p.gear5Active) { bodyColor = COLORS.gear5; headColor = '#FFA0A0' }
    else if (p.ultraInstinctActive) { bodyColor = COLORS.ultraInstinct; headColor = '#F0F0F0' }

    const runBob = p.animState === 'run' ? Math.sin(p.animFrame * 1.5) * 2 : 0
    const jumpSquash = p.animState === 'jump' ? -2 : p.animState === 'fall' ? 2 : 0

    // Legs
    ctx.fillStyle = skin.legColor
    if (p.animState === 'run') {
      const legOff = Math.sin(p.animFrame * 1.5) * 5
      ctx.fillRect(4, PLAYER_H - 12 + runBob, 8, 12); ctx.fillRect(PLAYER_W - 12, PLAYER_H - 12 - legOff / 2, 8, 12)
    } else { ctx.fillRect(5, PLAYER_H - 12, 8, 12); ctx.fillRect(PLAYER_W - 13, PLAYER_H - 12, 8, 12) }

    // Body
    ctx.fillStyle = bodyColor; ctx.fillRect(2, 8 + runBob + jumpSquash, PLAYER_W - 4, PLAYER_H - 20 - jumpSquash)

    // Head
    ctx.fillStyle = headColor; ctx.fillRect(4, runBob + jumpSquash, PLAYER_W - 8, 14)

    // Hair
    if (skin.hairColor) {
      ctx.fillStyle = skin.hairColor
      if (skin.hairStyle === 'spiky') {
        ctx.beginPath()
        ctx.moveTo(2, 4 + runBob + jumpSquash)
        ctx.lineTo(6, -6 + runBob + jumpSquash); ctx.lineTo(10, 2 + runBob + jumpSquash)
        ctx.lineTo(14, -8 + runBob + jumpSquash); ctx.lineTo(18, 0 + runBob + jumpSquash)
        ctx.lineTo(22, -5 + runBob + jumpSquash); ctx.lineTo(PLAYER_W - 4, 4 + runBob + jumpSquash)
        ctx.closePath(); ctx.fill()
      } else if (skin.hairStyle === 'long') {
        ctx.fillRect(2, runBob + jumpSquash - 2, PLAYER_W - 4, 8)
        ctx.fillRect(0, 4 + runBob + jumpSquash, 4, 20)
      } else if (skin.hairStyle === 'flame') {
        const flicker = Math.sin(this.levelTime * 0.2) * 2
        ctx.beginPath()
        ctx.moveTo(4, 2 + runBob + jumpSquash)
        ctx.lineTo(8, -10 + flicker + runBob + jumpSquash); ctx.lineTo(14, -4 + runBob + jumpSquash)
        ctx.lineTo(18, -14 + flicker + runBob + jumpSquash); ctx.lineTo(22, -6 + runBob + jumpSquash)
        ctx.lineTo(PLAYER_W - 6, -8 + flicker + runBob + jumpSquash)
        ctx.lineTo(PLAYER_W - 4, 2 + runBob + jumpSquash)
        ctx.closePath(); ctx.fill()
      } else { // short
        ctx.fillRect(3, runBob + jumpSquash - 2, PLAYER_W - 6, 6)
      }
    }

    // Eyes
    ctx.fillStyle = skin.eyeColor || '#FFF'
    ctx.fillRect(PLAYER_W - 14, 4 + runBob + jumpSquash, 5, 5); ctx.fillRect(PLAYER_W - 8, 4 + runBob + jumpSquash, 5, 5)
    ctx.fillStyle = '#222'; ctx.fillRect(PLAYER_W - 12, 6 + runBob + jumpSquash, 3, 3); ctx.fillRect(PLAYER_W - 6, 6 + runBob + jumpSquash, 3, 3)

    // Skin specials
    if (skin.special === 'whiskers') {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1
      for (let w = 0; w < 3; w++) {
        ctx.beginPath(); ctx.moveTo(PLAYER_W - 2, 8 + w * 3 + runBob + jumpSquash); ctx.lineTo(PLAYER_W + 4, 7 + w * 3 + runBob + jumpSquash); ctx.stroke()
      }
    }
    if (skin.special === 'strawhat') {
      ctx.fillStyle = '#FFD700'; ctx.fillRect(0, runBob + jumpSquash - 4, PLAYER_W, 4)
      ctx.fillStyle = '#DAA520'; ctx.fillRect(-2, runBob + jumpSquash - 2, PLAYER_W + 4, 3)
    }
    if (skin.special === 'scar') {
      ctx.strokeStyle = '#8B0000'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(PLAYER_W - 6, 2 + runBob + jumpSquash); ctx.lineTo(PLAYER_W - 10, 10 + runBob + jumpSquash); ctx.stroke()
    }
    if (skin.special === 'scar_eye') {
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(PLAYER_W - 14, 3 + runBob + jumpSquash); ctx.lineTo(PLAYER_W - 14, 11 + runBob + jumpSquash); ctx.stroke()
    }

    // Arms
    ctx.fillStyle = skin.armColor
    if (p.animState === 'wallslide') { ctx.fillRect(-4, 12, 6, 10) }
    else if (p.animState === 'run') {
      const armOff = Math.sin(p.animFrame * 1.5 + Math.PI) * 6
      ctx.fillRect(-3, 14 + armOff, 5, 10); ctx.fillRect(PLAYER_W - 2, 14 - armOff, 5, 10)
    } else { ctx.fillRect(-2, 14, 4, 10); ctx.fillRect(PLAYER_W - 2, 14, 4, 10) }

    ctx.restore(); ctx.shadowBlur = 0; ctx.restore()
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife; ctx.globalAlpha = alpha; ctx.fillStyle = p.color
      if (p.type === 'sparkle') {
        ctx.shadowBlur = 8; ctx.shadowColor = p.color; const s = p.size * alpha
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 0.2); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore()
        ctx.shadowBlur = 0
      } else if (p.type === 'trail') { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill() }
      else { ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * alpha, p.size * alpha) }
    }
    ctx.globalAlpha = 1
  }

  private renderAmbientParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.ambientParticles) {
      const alpha = (p.life / p.maxLife) * 0.6
      ctx.globalAlpha = alpha; ctx.fillStyle = p.color
      if (this.world?.ambientParticles.type === 'firefly') {
        ctx.shadowBlur = 10; ctx.shadowColor = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      } else if (this.world?.ambientParticles.type === 'crystal') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 0.05)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore()
      } else if (this.world?.ambientParticles.type === 'snow') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2); ctx.fill()
      } else if (this.world?.ambientParticles.type === 'ember') {
        ctx.shadowBlur = 6; ctx.shadowColor = '#FF4500'
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  // ===== PARTICLE SPAWNERS =====
  private spawnDust(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) this.particles.push({ x, y, vel: { x: (Math.random() - 0.5) * 4, y: -Math.random() * 3 }, life: 15, maxLife: 15, color: this.world?.platformColor || '#9E8E7E', size: 3 + Math.random() * 3, type: 'dust' })
  }
  private spawnRing(x: number, y: number) {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; this.particles.push({ x, y, vel: { x: Math.cos(a) * 4, y: Math.sin(a) * 4 }, life: 12, maxLife: 12, color: COLORS.sapphire, size: 3, type: 'trail' }) }
  }
  private spawnHitParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) this.particles.push({ x, y, vel: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 }, life: 15, maxLife: 15, color: '#FFF', size: 2 + Math.random() * 4, type: 'hit' })
  }
}
