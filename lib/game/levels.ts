import { type LevelData, type Platform, type Coin, type Enemy, type Checkpoint, type LevelExit, type WorldId, TILE, getWorldForLevel, clamp } from './core'

const T = TILE

// ===== HELPERS =====
function ground(x: number, y: number, w: number, h = 1): Platform {
  return { x: x * T, y: y * T, w: w * T, h: h * T, type: 'solid' }
}
function moving(x: number, y: number, w: number, axis: 'x' | 'y', range: number, speed = 1): Platform {
  return { x: x * T, y: y * T, w: w * T, h: T, type: 'moving', moveAxis: axis, moveRange: range * T, moveSpeed: speed }
}
function ice(x: number, y: number, w: number): Platform {
  return { x: x * T, y: y * T, w: w * T, h: T, type: 'ice' }
}
function trampoline(x: number, y: number): Platform {
  return { x: x * T, y: y * T, w: T * 2, h: T * 0.6, type: 'trampoline' }
}
function spike(x: number, y: number, w: number): Platform {
  return { x: x * T, y: y * T, w: w * T, h: T * 0.5, type: 'spike' }
}
function falling(x: number, y: number, w: number): Platform {
  return { x: x * T, y: y * T, w: w * T, h: T, type: 'falling' }
}
function coin(x: number, y: number, type: 'coin' | 'gold' = 'coin'): Coin {
  return { x: x * T + T / 2, y: y * T + T / 2, collected: false, type, animTimer: 0 }
}
function patrol(x: number, y: number, range = 3): Enemy {
  return { x: x * T, y: y * T, w: 32, h: 32, type: 'patrol', vel: { x: 1.5, y: 0 }, health: 1, maxHealth: 1, facing: 1, patrolRange: range * T, originX: x * T, originY: y * T, alive: true, hitTimer: 0 }
}
function flyingEnemy(x: number, y: number, range = 3): Enemy {
  return { x: x * T, y: y * T, w: 30, h: 30, type: 'flying', vel: { x: 0, y: 0 }, health: 2, maxHealth: 2, facing: 1, patrolRange: range * T, originX: x * T, originY: y * T, alive: true, hitTimer: 0 }
}
function boss(x: number, y: number, hp = 10): Enemy {
  return { x: x * T, y: y * T, w: 64, h: 56, type: 'boss', vel: { x: 1, y: 0 }, health: hp, maxHealth: hp, facing: 1, patrolRange: 5 * T, originX: x * T, originY: y * T, alive: true, hitTimer: 0, phase: 0, attackTimer: 0, attackPattern: 0 }
}
function cp(x: number, y: number): Checkpoint {
  return { x: x * T + T / 2, y: y * T, activated: false }
}
function exit(x: number, y: number): LevelExit {
  return { x: x * T, y: (y - 1) * T, w: T * 2, h: T * 2 }
}

// ===== WORLD 1: ENCHANTED FOREST (Levels 1-20) =====

const level1: LevelData = {
  id: 1, name: 'Mystic Glade', width: 2800, height: 800, worldId: 'enchanted_forest',
  playerStart: { x: 2 * T, y: 16 * T },
  platforms: [
    ground(0, 18, 60, 3),
    // Gentle terraced platforms with varied heights
    ground(5, 15, 5), ground(12, 14, 4), ground(18, 13, 6),
    ground(26, 15, 3), ground(31, 14, 4), ground(37, 12, 5),
    ground(44, 14, 3), ground(49, 13, 5), ground(56, 12, 6),
    // Some decorative small ledges
    ground(8, 16, 2), ground(23, 16, 2), ground(42, 16, 2),
  ],
  coins: [
    coin(6, 14), coin(7, 14), coin(8, 14), coin(9, 14),
    coin(13, 13), coin(14, 13), coin(15, 13),
    coin(19, 12), coin(20, 12), coin(21, 12), coin(22, 12),
    coin(27, 14), coin(28, 14),
    coin(32, 13), coin(33, 13), coin(34, 13),
    coin(38, 11), coin(39, 11), coin(40, 11), coin(41, 11),
    coin(50, 12), coin(51, 12), coin(52, 12),
    coin(57, 11), coin(58, 11, 'gold'),
  ],
  enemies: [patrol(18, 12, 4), patrol(37, 11, 4)],
  checkpoints: [cp(26, 15), cp(49, 13)],
  exit: exit(60, 12),
}

const level2: LevelData = {
  id: 2, name: 'Whispering Woods', width: 3200, height: 900, worldId: 'enchanted_forest',
  playerStart: { x: 2 * T, y: 18 * T },
  platforms: [
    ground(0, 20, 10, 3),
    ground(13, 18, 4), ground(19, 16, 3), ground(24, 18, 3),
    ground(29, 15, 5), ground(36, 17, 3), ground(41, 14, 4),
    ground(47, 16, 5), ground(54, 15, 4), ground(60, 17, 3),
    ground(65, 14, 4), ground(71, 16, 5),
  ],
  coins: [
    coin(14, 17), coin(15, 17), coin(16, 17),
    coin(20, 15), coin(21, 15),
    coin(25, 17), coin(26, 17),
    coin(30, 14), coin(31, 14), coin(32, 14), coin(33, 14),
    coin(42, 13), coin(43, 13), coin(44, 13),
    coin(48, 15), coin(49, 15), coin(50, 15),
    coin(55, 14), coin(56, 14),
    coin(66, 13), coin(67, 13, 'gold'), coin(68, 13),
    coin(72, 15), coin(73, 15),
  ],
  enemies: [patrol(29, 14, 4), patrol(47, 15, 4), flyingEnemy(58, 12, 3)],
  checkpoints: [cp(36, 17), cp(60, 17)],
  exit: exit(74, 16),
}

const level3: LevelData = {
  id: 3, name: 'Fungal Grotto', width: 3000, height: 1000, worldId: 'enchanted_forest',
  playerStart: { x: 2 * T, y: 20 * T },
  platforms: [
    ground(0, 22, 8, 3),
    trampoline(10, 21), ground(15, 17, 3), trampoline(20, 19),
    ground(25, 14, 4), ground(31, 16, 3), trampoline(36, 18),
    ground(41, 12, 5), ground(48, 15, 4), trampoline(54, 17),
    ground(59, 10, 4), ground(65, 13, 5),
  ],
  coins: [
    coin(11, 18), coin(12, 16), coin(16, 16), coin(17, 16),
    coin(21, 16), coin(22, 14), coin(26, 13), coin(27, 13), coin(28, 13),
    coin(32, 15), coin(33, 15), coin(37, 15), coin(38, 13),
    coin(42, 11), coin(43, 11), coin(44, 11), coin(45, 11),
    coin(49, 14), coin(50, 14), coin(55, 14), coin(56, 12),
    coin(60, 9), coin(61, 9, 'gold'), coin(62, 9),
    coin(66, 12), coin(67, 12), coin(68, 12),
  ],
  enemies: [flyingEnemy(18, 13, 3), patrol(25, 13, 3), flyingEnemy(46, 9, 4), patrol(59, 9, 3)],
  checkpoints: [cp(25, 14), cp(48, 15)],
  exit: exit(68, 13),
}

const level4: LevelData = {
  id: 4, name: 'Ancient Roots', width: 2400, height: 1600, worldId: 'enchanted_forest',
  playerStart: { x: 3 * T, y: 34 * T },
  platforms: [
    ground(0, 36, 15, 3),
    // Vertical shaft walls
    ground(0, 22, 2, 14), ground(13, 22, 2, 14),
    ground(4, 30, 5), ground(3, 25, 6), ground(5, 22, 4),
    // Upper section
    ground(16, 20, 5), ground(23, 18, 4), ground(29, 16, 5),
    ground(36, 18, 4), ground(42, 20, 5),
  ],
  coins: [
    coin(5, 33), coin(6, 33), coin(7, 33), coin(8, 33),
    coin(5, 29), coin(6, 29), coin(7, 29),
    coin(4, 24), coin(5, 24), coin(6, 24), coin(7, 24),
    coin(6, 21), coin(7, 21), coin(8, 21),
    coin(17, 19), coin(18, 19), coin(19, 19),
    coin(24, 17), coin(25, 17), coin(26, 17),
    coin(30, 15), coin(31, 15), coin(32, 15, 'gold'), coin(33, 15),
    coin(37, 17), coin(38, 17),
    coin(43, 19), coin(44, 19), coin(45, 19),
  ],
  enemies: [patrol(4, 29, 3), flyingEnemy(8, 23, 3), patrol(16, 19, 4), flyingEnemy(27, 14, 4)],
  checkpoints: [cp(5, 22), cp(29, 16)],
  exit: exit(45, 20),
}

const level5: LevelData = {
  id: 5, name: 'Thornvine Pass', width: 3600, height: 900, worldId: 'enchanted_forest',
  playerStart: { x: 2 * T, y: 18 * T },
  platforms: [
    ground(0, 20, 8, 3),
    ground(10, 18, 4), spike(14, 19, 2), ground(16, 18, 3),
    ground(21, 16, 3), spike(24, 17, 2), ground(26, 16, 4),
    ground(32, 18, 3), falling(37, 15, 3), ground(42, 14, 5),
    spike(47, 15, 2), ground(49, 13, 4), trampoline(55, 16),
    ground(60, 10, 5), moving(67, 12, 3, 'x', 4, 1.2),
    ground(74, 14, 6), ground(82, 16, 4),
  ],
  coins: [
    coin(11, 17), coin(12, 17), coin(13, 17),
    coin(17, 17), coin(18, 17),
    coin(22, 15), coin(23, 15),
    coin(27, 15), coin(28, 15), coin(29, 15),
    coin(33, 17), coin(34, 17),
    coin(38, 14), coin(39, 14),
    coin(43, 13), coin(44, 13), coin(45, 13), coin(46, 13),
    coin(50, 12), coin(51, 12), coin(52, 12),
    coin(56, 13), coin(57, 11),
    coin(61, 9), coin(62, 9, 'gold'), coin(63, 9),
    coin(68, 11), coin(69, 11),
    coin(75, 13), coin(76, 13), coin(77, 13), coin(78, 13),
    coin(83, 15), coin(84, 15),
  ],
  enemies: [patrol(10, 17, 3), flyingEnemy(30, 13, 4), patrol(42, 13, 4), flyingEnemy(65, 8, 5), patrol(74, 13, 5)],
  checkpoints: [cp(32, 18), cp(49, 13), cp(74, 14)],
  exit: exit(84, 16),
}

// World 1 Boss: Guardian of the Grove
const level10: LevelData = {
  id: 10, name: 'Guardian of the Grove', width: 2000, height: 800, worldId: 'enchanted_forest', isBossLevel: true,
  playerStart: { x: 3 * T, y: 16 * T },
  platforms: [
    ground(0, 18, 50, 3),
    ground(5, 14, 4), ground(15, 12, 4), ground(25, 14, 4),
    ground(35, 12, 4), ground(45, 14, 4),
    ground(10, 8, 6), ground(30, 8, 6),
    ground(0, 0, 1, 18), ground(49, 0, 1, 18),
  ],
  coins: [
    coin(6, 13), coin(7, 13), coin(8, 13),
    coin(16, 11), coin(17, 11), coin(18, 11),
    coin(26, 13), coin(27, 13), coin(28, 13),
    coin(36, 11), coin(37, 11), coin(38, 11),
    coin(46, 13), coin(47, 13), coin(48, 13),
    coin(11, 7), coin(12, 7, 'gold'), coin(13, 7, 'gold'), coin(14, 7),
    coin(31, 7), coin(32, 7, 'gold'), coin(33, 7, 'gold'), coin(34, 7),
  ],
  enemies: [boss(22, 14, 15)],
  checkpoints: [cp(10, 18)],
  exit: exit(47, 18),
}

// Level 20: World 1 Final Boss
const level20: LevelData = {
  id: 20, name: 'The Forest King', width: 2400, height: 800, worldId: 'enchanted_forest', isBossLevel: true,
  playerStart: { x: 3 * T, y: 16 * T },
  platforms: [
    ground(0, 18, 58, 3),
    ground(5, 14, 3), ground(12, 11, 5), ground(20, 14, 3),
    ground(28, 11, 5), ground(36, 14, 3), ground(44, 11, 5), ground(52, 14, 3),
    ground(0, 0, 1, 18), ground(57, 0, 1, 18),
    trampoline(8, 17), trampoline(24, 17), trampoline(40, 17),
  ],
  coins: [
    coin(6, 13), coin(7, 13), coin(13, 10), coin(14, 10), coin(15, 10),
    coin(21, 13), coin(22, 13), coin(29, 10), coin(30, 10), coin(31, 10),
    coin(37, 13), coin(38, 13), coin(45, 10), coin(46, 10), coin(47, 10),
    coin(53, 13), coin(54, 13),
    coin(14, 10, 'gold'), coin(30, 10, 'gold'), coin(46, 10, 'gold'),
  ],
  enemies: [boss(26, 14, 25)],
  checkpoints: [cp(12, 18), cp(36, 18)],
  exit: exit(55, 18),
}

const handcraftedLevels: Record<number, LevelData> = {
  1: level1, 2: level2, 3: level3, 4: level4, 5: level5,
  10: level10, 20: level20,
}

// ===== PROCEDURAL LEVEL GENERATOR =====
function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function getWorldIdForLevel(id: number): WorldId {
  const w = getWorldForLevel(id)
  return w.id
}

const WORLD_NAMES: Record<WorldId, { adj: string[]; noun: string[] }> = {
  enchanted_forest: {
    adj: ['Mystic', 'Ancient', 'Whispering', 'Moonlit', 'Verdant', 'Twilight', 'Sacred', 'Enchanted'],
    noun: ['Glade', 'Woods', 'Thicket', 'Grove', 'Hollow', 'Canopy', 'Roots', 'Dell', 'Clearing'],
  },
  crystal_caverns: {
    adj: ['Crystal', 'Glittering', 'Deep', 'Amethyst', 'Shimmering', 'Prismatic', 'Frozen', 'Echo'],
    noun: ['Cavern', 'Depths', 'Grotto', 'Mines', 'Chamber', 'Tunnels', 'Vault', 'Chasm'],
  },
  celestial_peaks: {
    adj: ['Celestial', 'Floating', 'Divine', 'Starlit', 'Golden', 'Radiant', 'Eternal', 'Ascended'],
    noun: ['Peak', 'Summit', 'Temple', 'Spire', 'Bridge', 'Island', 'Sanctuary', 'Observatory'],
  },
  shadow_citadel: {
    adj: ['Shadow', 'Dark', 'Cursed', 'Burning', 'Obsidian', 'Crimson', 'Ruined', 'Haunted'],
    noun: ['Citadel', 'Fortress', 'Throne', 'Dungeon', 'Gates', 'Tower', 'Arena', 'Keep'],
  },
  eternal_abyss: {
    adj: ['Eternal', 'Void', 'Astral', 'Quantum', 'Infinite', 'Null', 'Beyond', 'Fracture'],
    noun: ['Abyss', 'Rift', 'Nexus', 'Expanse', 'Singularity', 'Edge', 'Threshold', 'Maw'],
  },
}

function generateLevel(id: number): LevelData {
  const rand = seededRandom(id * 7919 + 1234)
  const worldId = getWorldIdForLevel(id)
  const difficulty = Math.min((id - 1) / 99, 1)
  const worldDiff = ((id - 1) % 20) / 19 // difficulty within the world 0..1

  const tilesWide = 60 + Math.floor(difficulty * 40 + rand() * 20)
  const tilesHigh = 25 + Math.floor(difficulty * 10)
  const width = tilesWide * T
  const height = tilesHigh * T
  const isBossLevel = id % 10 === 0

  const platforms: Platform[] = []
  const coins: Coin[] = []
  const enemies: Enemy[] = []
  const checkpoints: Checkpoint[] = []

  const floorY = tilesHigh - 3

  // Ground segments with gaps for variety
  let gx = 0
  while (gx < 8) { platforms.push(ground(gx, floorY, 1, 3)); gx++ }

  let lastX = 8
  let lastY = floorY - 2
  const segments = 10 + Math.floor(difficulty * 12 + rand() * 5)

  for (let s = 0; s < segments; s++) {
    const gapSize = 2 + Math.floor(rand() * (2 + difficulty * 3))
    const platWidth = 3 + Math.floor(rand() * 4)
    const yShift = Math.floor((rand() - 0.4) * (3 + difficulty * 3))

    lastX += gapSize
    lastY = clamp(lastY - yShift, 4, floorY - 2)

    // World-specific platform types
    const typeRoll = rand()
    if (worldId === 'crystal_caverns' && typeRoll < 0.25) {
      platforms.push(ice(lastX, lastY, platWidth))
    } else if (worldId === 'celestial_peaks' && typeRoll < 0.2) {
      platforms.push(moving(lastX, lastY, platWidth, rand() < 0.5 ? 'x' : 'y', 2 + Math.floor(rand() * 3), 0.8 + rand() * 0.7))
    } else if (worldId === 'shadow_citadel' && typeRoll < 0.2) {
      platforms.push(falling(lastX, lastY, platWidth))
    } else if (worldId === 'eternal_abyss' && typeRoll < 0.3) {
      if (rand() < 0.5) platforms.push(moving(lastX, lastY, platWidth, 'x', 3 + Math.floor(rand() * 3), 1 + rand()))
      else platforms.push(ice(lastX, lastY, platWidth))
    } else if (difficulty > 0.3 && typeRoll < 0.15) {
      platforms.push(moving(lastX, lastY, platWidth, rand() < 0.5 ? 'x' : 'y', 2 + Math.floor(rand() * 3), 0.8 + rand() * 0.8))
    } else {
      platforms.push(ground(lastX, lastY, platWidth))
    }

    // Trampoline
    if (rand() < 0.12 + worldDiff * 0.05) {
      platforms.push(trampoline(lastX + platWidth + 1, lastY + 2))
    }

    // Spikes
    if (difficulty > 0.15 && rand() < 0.15 + worldDiff * 0.1) {
      platforms.push(spike(lastX + Math.floor(rand() * Math.max(1, platWidth - 1)), lastY + 1, 1))
    }

    // Coins
    const coinCount = 2 + Math.floor(rand() * 3)
    for (let ci = 0; ci < coinCount && ci < platWidth; ci++) {
      const isGold = rand() < 0.06 + difficulty * 0.04
      coins.push(coin(lastX + ci, lastY - 1, isGold ? 'gold' : 'coin'))
    }

    // Extra floating coins
    if (rand() < 0.3) {
      coins.push(coin(lastX + Math.floor(platWidth / 2), lastY - 3))
    }

    // Enemies
    if (rand() < 0.22 + difficulty * 0.18 && s > 0) {
      if (rand() < 0.35 + difficulty * 0.15) {
        enemies.push(flyingEnemy(lastX + 1, lastY - 3 - Math.floor(rand() * 3), 2 + Math.floor(rand() * 3)))
      } else {
        enemies.push(patrol(lastX, lastY - 1, Math.min(platWidth, 3)))
      }
    }

    // Checkpoint every ~4 segments
    if (s > 0 && s % 4 === 0) {
      checkpoints.push(cp(lastX + 1, lastY))
    }

    lastX += platWidth
  }

  // Boss for boss levels
  if (isBossLevel) {
    const bossX = lastX - 6
    const bossY = lastY - 2
    enemies.push(boss(bossX, bossY, 12 + Math.floor(difficulty * 20)))
    // Arena walls
    platforms.push(ground(lastX - 10, 0, 1, floorY))
    platforms.push(ground(lastX + 5, 0, 1, floorY))
    // Arena floor
    platforms.push(ground(lastX - 9, floorY, 14, 3))
    // Arena platforms
    platforms.push(ground(lastX - 7, lastY - 4, 3))
    platforms.push(ground(lastX + 1, lastY - 4, 3))
  }

  // Exit
  lastX += 3
  platforms.push(ground(lastX, lastY + 1, 4, 3))
  const exitObj = exit(lastX + 1, lastY + 1)

  // Name
  const names = WORLD_NAMES[worldId]
  const adj = names.adj[Math.floor(rand() * names.adj.length)]
  const noun = names.noun[Math.floor(rand() * names.noun.length)]

  return {
    id, name: `${adj} ${noun}`, width: (lastX + 8) * T, height,
    worldId, playerStart: { x: 3 * T, y: (floorY - 2) * T },
    platforms, coins, enemies, checkpoints, exit: exitObj,
    isBossLevel,
  }
}

// ===== EXPORTS =====
export function getLevel(id: number): LevelData {
  if (handcraftedLevels[id]) return handcraftedLevels[id]
  return generateLevel(id)
}

export function getLevelCount(): number { return 100 }

export function getLevelName(id: number): string {
  if (handcraftedLevels[id]) return handcraftedLevels[id].name
  return getLevel(id).name
}
