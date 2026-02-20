// ===== TYPES =====
export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

// ===== 5 MYSTIC WORLDS =====
export type WorldId = 'enchanted_forest' | 'crystal_caverns' | 'celestial_peaks' | 'shadow_citadel' | 'eternal_abyss'

export interface WorldTheme {
  id: WorldId
  name: string
  subtitle: string
  levels: [number, number] // [startLevel, endLevel]
  bgGradient: [string, string, string]
  platformColor: string
  platformTop: string
  platformAccent: string
  ambientParticles: { color: string; type: 'firefly' | 'crystal' | 'snow' | 'ember' | 'void' }
  fogColor: string
  groundColor: string
  treeColor?: string
  foliageColors?: string[]
  waterColor?: string
  decorations: string[] // types of bg decorations
}

export const WORLDS: Record<WorldId, WorldTheme> = {
  enchanted_forest: {
    id: 'enchanted_forest',
    name: 'Enchanted Forest',
    subtitle: 'Ancient woods full of magic',
    levels: [1, 20],
    bgGradient: ['#051210', '#0A2A1A', '#061A12'],
    platformColor: '#3D2B1F',
    platformTop: '#5E8B3C',
    platformAccent: '#2E6B2E',
    ambientParticles: { color: '#7CFC00', type: 'firefly' },
    fogColor: 'rgba(10,80,40,0.15)',
    groundColor: '#2A1B0E',
    treeColor: '#1A3D1A',
    foliageColors: ['#2E8B57', '#3CB371', '#228B22', '#6B8E23'],
    decorations: ['trees', 'mushrooms', 'vines', 'flowers'],
  },
  crystal_caverns: {
    id: 'crystal_caverns',
    name: 'Crystal Caverns',
    subtitle: 'Glittering underground depths',
    levels: [21, 40],
    bgGradient: ['#05050F', '#0A0A2A', '#10081E'],
    platformColor: '#2A2A40',
    platformTop: '#6A5ACD',
    platformAccent: '#483D8B',
    ambientParticles: { color: '#9370DB', type: 'crystal' },
    fogColor: 'rgba(80,40,120,0.12)',
    groundColor: '#1A1A30',
    waterColor: '#1A0A3A',
    decorations: ['crystals', 'stalactites', 'gems', 'glowshrooms'],
  },
  celestial_peaks: {
    id: 'celestial_peaks',
    name: 'Celestial Peaks',
    subtitle: 'Floating islands in the sky',
    levels: [41, 60],
    bgGradient: ['#0A0A20', '#151540', '#0A1530'],
    platformColor: '#D4C5A0',
    platformTop: '#F0E68C',
    platformAccent: '#BDB76B',
    ambientParticles: { color: '#FFD700', type: 'snow' },
    fogColor: 'rgba(200,200,255,0.08)',
    groundColor: '#C4B587',
    decorations: ['clouds', 'stars', 'rainbows', 'temples'],
  },
  shadow_citadel: {
    id: 'shadow_citadel',
    name: 'Shadow Citadel',
    subtitle: 'Dark fortress of the cursed',
    levels: [61, 80],
    bgGradient: ['#0F0505', '#200A0A', '#150808'],
    platformColor: '#3A2020',
    platformTop: '#8B0000',
    platformAccent: '#600000',
    ambientParticles: { color: '#FF4500', type: 'ember' },
    fogColor: 'rgba(100,0,0,0.12)',
    groundColor: '#2A1515',
    decorations: ['torches', 'chains', 'banners', 'skulls'],
  },
  eternal_abyss: {
    id: 'eternal_abyss',
    name: 'Eternal Abyss',
    subtitle: 'Beyond reality itself',
    levels: [81, 100],
    bgGradient: ['#050008', '#0A0020', '#08001A'],
    platformColor: '#1A1A3A',
    platformTop: '#00CED1',
    platformAccent: '#008B8B',
    ambientParticles: { color: '#00FFFF', type: 'void' },
    fogColor: 'rgba(0,50,80,0.15)',
    groundColor: '#0A0A25',
    waterColor: '#00052A',
    decorations: ['portals', 'runes', 'eyeballs', 'tentacles'],
  },
}

export function getWorldForLevel(level: number): WorldTheme {
  for (const w of Object.values(WORLDS)) {
    if (level >= w.levels[0] && level <= w.levels[1]) return w
  }
  return WORLDS.enchanted_forest
}

export function getAllWorlds(): WorldTheme[] {
  return Object.values(WORLDS)
}

// ===== ANIME-INSPIRED SKINS =====
export interface SkinDef {
  id: string
  name: string
  description: string
  price: number
  currency: 'coins' | 'gold'
  bodyColor: string
  headColor: string
  eyeColor: string
  outlineColor: string
  legColor: string
  armColor: string
  hairColor?: string
  hairStyle?: 'spiky' | 'long' | 'short' | 'ponytail' | 'flame'
  auraColor?: string
  auraType?: 'none' | 'glow' | 'flame' | 'electric' | 'wind'
  special?: string
}

export const SKINS: SkinDef[] = [
  {
    id: 'default', name: 'Wanderer', description: 'Default mystic traveler',
    price: 0, currency: 'coins',
    bodyColor: '#4ECDC4', headColor: '#4ECDC4', eyeColor: '#FFF',
    outlineColor: '#2C7A7B', legColor: '#2C7A7B', armColor: '#3D9B8F',
    hairColor: '#2C7A7B', hairStyle: 'short', auraType: 'none',
  },
  {
    id: 'naruto', name: 'Leaf Ninja', description: 'Orange-clad ninja with spiky hair',
    price: 100, currency: 'coins',
    bodyColor: '#FF8C00', headColor: '#FFD39B', eyeColor: '#4169E1',
    outlineColor: '#CC7000', legColor: '#3A3A8C', armColor: '#FF8C00',
    hairColor: '#FFD700', hairStyle: 'spiky', auraColor: '#FF8C00', auraType: 'flame',
    special: 'whiskers',
  },
  {
    id: 'goku', name: 'Saiyan Warrior', description: 'Warrior with wild hair and fighting spirit',
    price: 150, currency: 'coins',
    bodyColor: '#FF6600', headColor: '#FFDAB9', eyeColor: '#000',
    outlineColor: '#CC5200', legColor: '#FF6600', armColor: '#FF6600',
    hairColor: '#1A1A1A', hairStyle: 'spiky', auraColor: '#FFFF00', auraType: 'glow',
    special: 'gi',
  },
  {
    id: 'ichigo', name: 'Soul Reaper', description: 'Dark-robed warrior with a massive blade',
    price: 120, currency: 'coins',
    bodyColor: '#1A1A1A', headColor: '#FFDAB9', eyeColor: '#8B4513',
    outlineColor: '#333', legColor: '#1A1A1A', armColor: '#1A1A1A',
    hairColor: '#FF8C00', hairStyle: 'spiky', auraColor: '#4169E1', auraType: 'electric',
  },
  {
    id: 'luffy', name: 'Straw Hat', description: 'Rubber adventurer on a quest',
    price: 100, currency: 'coins',
    bodyColor: '#DC143C', headColor: '#FFDAB9', eyeColor: '#000',
    outlineColor: '#8B0000', legColor: '#4169E1', armColor: '#FFDAB9',
    hairColor: '#1A1A1A', hairStyle: 'short', auraType: 'none',
    special: 'strawhat',
  },
  {
    id: 'tanjiro', name: 'Demon Slayer', description: 'Swordsman with checkered haori',
    price: 130, currency: 'coins',
    bodyColor: '#228B22', headColor: '#FFDAB9', eyeColor: '#8B0000',
    outlineColor: '#006400', legColor: '#2F2F2F', armColor: '#228B22',
    hairColor: '#8B0000', hairStyle: 'short', auraColor: '#00BFFF', auraType: 'wind',
    special: 'scar',
  },
  {
    id: 'zoro', name: 'Three Swords', description: 'Green-haired swordsman',
    price: 120, currency: 'coins',
    bodyColor: '#006400', headColor: '#FFDAB9', eyeColor: '#000',
    outlineColor: '#004400', legColor: '#2F2F2F', armColor: '#006400',
    hairColor: '#32CD32', hairStyle: 'short', auraColor: '#32CD32', auraType: 'wind',
    special: 'scar_eye',
  },
  {
    id: 'golden', name: 'Golden Warrior', description: 'Shining legendary skin',
    price: 50, currency: 'gold',
    bodyColor: '#FFD700', headColor: '#FFD700', eyeColor: '#FFF',
    outlineColor: '#B8860B', legColor: '#DAA520', armColor: '#FFD700',
    hairColor: '#FFF4A3', hairStyle: 'flame', auraColor: '#FFD700', auraType: 'glow',
  },
  {
    id: 'shadow', name: 'Shadow Walker', description: 'One with the darkness',
    price: 40, currency: 'gold',
    bodyColor: '#1A0A2E', headColor: '#2A1A3E', eyeColor: '#FF00FF',
    outlineColor: '#0A0018', legColor: '#150A25', armColor: '#1A0A2E',
    hairColor: '#4A0080', hairStyle: 'long', auraColor: '#8B00FF', auraType: 'glow',
  },
  {
    id: 'sakura', name: 'Cherry Blossom', description: 'Graceful warrior of spring',
    price: 30, currency: 'gold',
    bodyColor: '#FF69B4', headColor: '#FFDAB9', eyeColor: '#228B22',
    outlineColor: '#FF1493', legColor: '#DB7093', armColor: '#FF69B4',
    hairColor: '#FF69B4', hairStyle: 'long', auraColor: '#FFB6C1', auraType: 'wind',
  },
]

export function getSkin(id: string): SkinDef {
  return SKINS.find(s => s.id === id) || SKINS[0]
}

// ===== POWER-UP SYSTEM (purchasable + upgradable) =====
export interface PowerUpDef {
  id: string
  name: string
  description: string
  maxLevel: number
  prices: { level: number; price: number; currency: 'coins' | 'gold' }[]
  icon: string
  color: string
}

export const POWERUP_DEFS: PowerUpDef[] = [
  {
    id: 'rasengan', name: 'Rasengan', description: 'Energy sphere projectile',
    maxLevel: 3, icon: 'R',
    color: '#4FC3F7',
    prices: [
      { level: 1, price: 50, currency: 'coins' },
      { level: 2, price: 120, currency: 'coins' },
      { level: 3, price: 250, currency: 'coins' },
    ],
  },
  {
    id: 'gear5', name: 'Gear 5 / Nika', description: 'Speed + Jump + Invincible',
    maxLevel: 3, icon: 'G5',
    color: '#FF6B6B',
    prices: [
      { level: 1, price: 80, currency: 'coins' },
      { level: 2, price: 180, currency: 'coins' },
      { level: 3, price: 350, currency: 'coins' },
    ],
  },
  {
    id: 'ultrainstinct', name: 'Ultra Instinct', description: 'Intangible dash',
    maxLevel: 3, icon: 'UI',
    color: '#E0E0E0',
    prices: [
      { level: 1, price: 100, currency: 'coins' },
      { level: 2, price: 200, currency: 'coins' },
      { level: 3, price: 400, currency: 'coins' },
    ],
  },
]

// ===== BUILDER MODE BLOCKS =====
export type BuildBlockType = 'solid' | 'ice' | 'trampoline' | 'spike' | 'moving_h' | 'moving_v' | 'falling' | 'decoration' | 'coin' | 'gold' | 'enemy_patrol' | 'enemy_flying' | 'checkpoint' | 'exit' | 'start'

export interface BuildBlockDef {
  type: BuildBlockType
  name: string
  goldCost: number // golden stones to unlock
  category: 'terrain' | 'hazard' | 'item' | 'entity' | 'special'
  color: string
}

export const BUILD_BLOCKS: BuildBlockDef[] = [
  { type: 'solid', name: 'Stone Block', goldCost: 0, category: 'terrain', color: '#5C4033' },
  { type: 'ice', name: 'Ice Block', goldCost: 5, category: 'terrain', color: '#A8D8EA' },
  { type: 'trampoline', name: 'Trampoline', goldCost: 8, category: 'terrain', color: '#FF6B9D' },
  { type: 'moving_h', name: 'Moving (H)', goldCost: 10, category: 'terrain', color: '#FFD700' },
  { type: 'moving_v', name: 'Moving (V)', goldCost: 10, category: 'terrain', color: '#FFD700' },
  { type: 'falling', name: 'Crumble Block', goldCost: 12, category: 'terrain', color: '#8B7355' },
  { type: 'spike', name: 'Spike Trap', goldCost: 5, category: 'hazard', color: '#E74C3C' },
  { type: 'coin', name: 'Coin', goldCost: 0, category: 'item', color: '#FFD700' },
  { type: 'gold', name: 'Gold Stone', goldCost: 3, category: 'item', color: '#FF8C00' },
  { type: 'enemy_patrol', name: 'Patrol Enemy', goldCost: 8, category: 'entity', color: '#E74C3C' },
  { type: 'enemy_flying', name: 'Flying Enemy', goldCost: 12, category: 'entity', color: '#9B59B6' },
  { type: 'decoration', name: 'Decoration', goldCost: 2, category: 'terrain', color: '#6B8E23' },
  { type: 'checkpoint', name: 'Checkpoint', goldCost: 5, category: 'special', color: '#3498DB' },
  { type: 'exit', name: 'Exit Portal', goldCost: 0, category: 'special', color: '#FFD700' },
  { type: 'start', name: 'Start Point', goldCost: 0, category: 'special', color: '#4ECDC4' },
]

export interface BuilderPlacement {
  type: BuildBlockType
  gridX: number
  gridY: number
}

export interface CustomLevel {
  name: string
  width: number
  height: number
  worldId: WorldId
  placements: BuilderPlacement[]
}

// ===== PLAYER STATE =====
export interface PlayerState {
  pos: Vec2
  vel: Vec2
  facing: number
  grounded: boolean
  wallSliding: boolean
  wallDir: number
  canDoubleJump: boolean
  health: number
  maxHealth: number
  invincibleTimer: number
  animState: AnimState
  animFrame: number
  animTimer: number
  // Power-up states
  rasenganLevel: number // 0 = not owned
  rasenganCooldown: number
  gear5Level: number // 0 = not owned
  gear5Active: boolean
  gear5Timer: number
  gear5Cooldown: number
  ultraInstinctLevel: number // 0 = not owned
  ultraInstinctActive: boolean
  ultraInstinctTimer: number
  ultraInstinctCooldown: number
  dashDir: number
  skinId: string
}

export type AnimState = 'idle' | 'run' | 'jump' | 'fall' | 'wallslide' | 'dash' | 'damage' | 'powerup'

export interface Platform {
  x: number; y: number; w: number; h: number
  type: 'solid' | 'moving' | 'ice' | 'trampoline' | 'falling' | 'spike'
  moveAxis?: 'x' | 'y'
  moveRange?: number
  moveSpeed?: number
  moveOffset?: number
  originalX?: number
  originalY?: number
  fallTimer?: number
  fallen?: boolean
}

export interface Coin {
  x: number; y: number
  collected: boolean
  type: 'coin' | 'gold'
  animTimer: number
}

export interface Enemy {
  x: number; y: number; w: number; h: number
  type: 'patrol' | 'flying' | 'boss'
  vel: Vec2
  health: number; maxHealth: number
  facing: number
  patrolRange: number
  originX: number; originY: number
  alive: boolean
  hitTimer: number
  phase?: number
  attackTimer?: number
  attackPattern?: number
}

export interface Projectile {
  x: number; y: number
  vel: Vec2
  radius: number; damage: number; lifetime: number
  type: 'rasengan' | 'enemy'
  level: number
}

export interface Particle {
  x: number; y: number
  vel: Vec2
  life: number; maxLife: number
  color: string; size: number
  type: 'coin' | 'hit' | 'powerup' | 'trail' | 'dust' | 'sparkle' | 'ambient'
  rotation?: number
}

export interface Checkpoint {
  x: number; y: number; activated: boolean
}

export interface LevelExit {
  x: number; y: number; w: number; h: number
}

export interface LevelData {
  id: number
  name: string
  width: number
  height: number
  platforms: Platform[]
  coins: Coin[]
  enemies: Enemy[]
  checkpoints: Checkpoint[]
  exit: LevelExit
  playerStart: Vec2
  worldId: WorldId
  isBossLevel?: boolean
}

// ===== SHOP =====
export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  currency: 'coins' | 'gold'
  type: 'skin' | 'powerup' | 'levelskip' | 'builder' | 'hearts'
  icon: string
  purchased: boolean
  level?: number
}

// ===== SAVE =====
export interface SaveData {
  coins: number
  goldStones: number
  currentLevel: number
  maxLevelReached: number
  purchasedItems: string[]
  // Power-up levels owned: { rasengan: 2, gear5: 1, ... }
  powerupLevels: Record<string, number>
  activeSkin: string
  ownedSkins: string[]
  levelStars: Record<number, number>
  // Builder
  unlockedBlocks: string[] // block types unlocked
  customLevels: CustomLevel[]
  extraHearts: number
}

export type GameScreen = 'menu' | 'worldselect' | 'levelselect' | 'playing' | 'paused' | 'shop' | 'gameover' | 'levelcomplete' | 'builder' | 'skins'

// ===== CONSTANTS =====
export const TILE = 40
export const PLAYER_W = 28
export const PLAYER_H = 40
export const GRAVITY = 0.55
export const MAX_FALL = 14
export const RUN_SPEED = 4.5
export const SPRINT_SPEED = 7.5
export const ACCEL = 0.45
export const FRICTION_GROUND = 0.82
export const FRICTION_AIR = 0.92
export const JUMP_VEL = -11.5
export const DOUBLE_JUMP_VEL = -10
export const WALL_SLIDE_SPEED = 2.5
export const WALL_JUMP_VEL_X = 7
export const WALL_JUMP_VEL_Y = -11
export const TRAMPOLINE_VEL = -16
export const ICE_FRICTION = 0.97

export const RASENGAN_COOLDOWN = [600, 480, 360]
export const RASENGAN_SPEED = 8
export const RASENGAN_DAMAGE = [1, 2, 5]
export const GEAR5_DURATION = [240, 300, 420]
export const GEAR5_COOLDOWN = [900, 720, 540]
export const GEAR5_SPEED_MULT = [1.4, 1.6, 1.8]
export const GEAR5_JUMP_MULT = [1.2, 1.3, 1.5]
export const UI_DURATION = [150, 180, 240]
export const UI_COOLDOWN = [1200, 960, 720]
export const UI_DASH_SPEED = 12

export const COLORS = {
  bg: '#0B0E1A',
  gold: '#FFD700',
  goldDark: '#B8860B',
  goldLight: '#FFF4A3',
  emerald: '#2ECC71',
  ruby: '#E74C3C',
  sapphire: '#3498DB',
  coin: '#FFD700',
  coinGold: '#FF8C00',
  heart: '#E74C3C',
  heartEmpty: '#555',
  checkpoint: '#3498DB',
  checkpointActive: '#2ECC71',
  exit: '#FFD700',
  rasengan: '#4FC3F7',
  gear5: '#FF6B6B',
  ultraInstinct: '#E0E0E0',
  trampoline: '#FF6B9D',
  trampolineTop: '#FF8FB8',
  spike: '#E74C3C',
  text: '#FFFDE7',
  textShadow: '#000',
  enemy: '#E74C3C',
  enemyFlying: '#9B59B6',
  boss: '#C0392B',
}

// ===== UTILITY =====
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
export function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)) }
export function rectOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
export function dist(a: Vec2, b: Vec2): number { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }

export function createDefaultSave(): SaveData {
  return {
    coins: 0,
    goldStones: 0,
    currentLevel: 1,
    maxLevelReached: 1,
    purchasedItems: [],
    powerupLevels: {},
    activeSkin: 'default',
    ownedSkins: ['default'],
    levelStars: {},
    unlockedBlocks: ['solid', 'coin', 'exit', 'start'],
    customLevels: [],
    extraHearts: 0,
  }
}
