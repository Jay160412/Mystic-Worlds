'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game/engine'
import { getLevel, getLevelCount, getLevelName } from '@/lib/game/levels'
import { loadSave, saveSave, resetSave } from '@/lib/game/save'
import {
  type SaveData, type GameScreen, type WorldId,
  COLORS, SKINS, getSkin, POWERUP_DEFS, BUILD_BLOCKS,
  getAllWorlds, getWorldForLevel,
} from '@/lib/game/core'

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [screen, setScreen] = useState<GameScreen>('menu')
  const [save, setSave] = useState<SaveData>(() => loadSave())
  const [coins, setCoins] = useState(0)
  const [gold, setGold] = useState(0)
  const [health, setHealth] = useState(3)
  const [maxHealth, setMaxHealth] = useState(3)
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [selectedWorld, setSelectedWorld] = useState<WorldId>('enchanted_forest')
  const [isMobile, setIsMobile] = useState(false)
  const [shopTab, setShopTab] = useState<'powerups' | 'skins' | 'other'>('powerups')
  const [powerupState, setPowerupState] = useState({
    rasenganCd: 0, gear5Cd: 0, gear5Active: false, uiCd: 0, uiActive: false,
  })
  const powerupInterval = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    const engine = new GameEngine()
    engine.init(canvasRef.current)
    engineRef.current = engine
    const handleResize = () => engine.resize()
    window.addEventListener('resize', handleResize)
    return () => { engine.stop(); window.removeEventListener('resize', handleResize); if (powerupInterval.current) clearInterval(powerupInterval.current) }
  }, [])

  const startLevel = useCallback((levelId: number) => {
    const engine = engineRef.current
    if (!engine) return
    const level = getLevel(levelId)
    engine.loadLevel(level, save.activeSkin)

    // Apply purchased power-up levels
    engine.player.rasenganLevel = save.powerupLevels['rasengan'] || 0
    engine.player.gear5Level = save.powerupLevels['gear5'] || 0
    engine.player.ultraInstinctLevel = save.powerupLevels['ultrainstinct'] || 0

    const totalHearts = 3 + save.extraHearts
    engine.player.maxHealth = totalHearts; engine.player.health = totalHearts
    setMaxHealth(totalHearts)

    engine.onCoinsChanged = (c, g) => { setCoins(c); setGold(g) }
    engine.onHealthChanged = (h) => setHealth(h)
    engine.onPowerupChanged = () => {
      const p = engine.player
      setPowerupState({ rasenganCd: p.rasenganCooldown, gear5Cd: p.gear5Cooldown, gear5Active: p.gear5Active, uiCd: p.ultraInstinctCooldown, uiActive: p.ultraInstinctActive })
    }
    engine.onLevelComplete = (c, g) => {
      const newSave = { ...save, coins: save.coins + c, goldStones: save.goldStones + g, currentLevel: levelId }
      if (levelId >= newSave.maxLevelReached) newSave.maxLevelReached = Math.min(levelId + 1, getLevelCount())
      newSave.levelStars = { ...newSave.levelStars, [levelId]: Math.min(3, Math.floor(c / 5) + 1) }
      setSave(newSave); saveSave(newSave); setScreen('levelcomplete')
    }
    engine.onGameOver = () => setScreen('gameover')

    setCoins(0); setGold(0); setHealth(totalHearts)
    setSelectedLevel(levelId); setScreen('playing'); engine.start()

    if (powerupInterval.current) clearInterval(powerupInterval.current)
    powerupInterval.current = setInterval(() => {
      if (!engine.player) return
      const p = engine.player
      setPowerupState({ rasenganCd: p.rasenganCooldown, gear5Cd: p.gear5Cooldown, gear5Active: p.gear5Active, uiCd: p.ultraInstinctCooldown, uiActive: p.ultraInstinctActive })
    }, 200)
  }, [save])

  useEffect(() => {
    if (screen !== 'playing') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        const engine = engineRef.current
        if (engine) { engine.paused = !engine.paused; setScreen(engine.paused ? 'paused' : 'playing') }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [screen])

  const resumeGame = () => { const e = engineRef.current; if (e) { e.paused = false; setScreen('playing') } }
  const restartLevel = () => startLevel(selectedLevel)
  const nextLevel = () => startLevel(Math.min(selectedLevel + 1, getLevelCount()))
  const goToMenu = () => { engineRef.current?.stop(); setScreen('menu') }

  // Purchase power-up upgrade
  const purchasePowerup = (puId: string, level: number, price: number, currency: 'coins' | 'gold') => {
    const newSave = { ...save }
    if (currency === 'coins' && newSave.coins >= price) newSave.coins -= price
    else if (currency === 'gold' && newSave.goldStones >= price) newSave.goldStones -= price
    else return
    newSave.powerupLevels = { ...newSave.powerupLevels, [puId]: level }
    setSave(newSave); saveSave(newSave)
    engineRef.current?.audio.purchase()
  }

  const purchaseSkin = (skinId: string, price: number, currency: 'coins' | 'gold') => {
    const newSave = { ...save }
    if (currency === 'coins' && newSave.coins >= price) newSave.coins -= price
    else if (currency === 'gold' && newSave.goldStones >= price) newSave.goldStones -= price
    else return
    newSave.ownedSkins = [...newSave.ownedSkins, skinId]
    newSave.activeSkin = skinId
    setSave(newSave); saveSave(newSave)
    engineRef.current?.audio.purchase()
  }

  const equipSkin = (skinId: string) => {
    const newSave = { ...save, activeSkin: skinId }
    setSave(newSave); saveSave(newSave)
  }

  const purchaseExtraHeart = () => {
    const cost = 25
    if (save.goldStones < cost) return
    const newSave = { ...save, goldStones: save.goldStones - cost, extraHearts: save.extraHearts + 1 }
    setSave(newSave); saveSave(newSave)
    engineRef.current?.audio.purchase()
  }

  const purchaseLevelSkip = () => {
    const cost = 75
    if (save.coins < cost) return
    const newSave = { ...save, coins: save.coins - cost, maxLevelReached: Math.min(save.maxLevelReached + 1, getLevelCount()) }
    setSave(newSave); saveSave(newSave)
    engineRef.current?.audio.purchase()
  }

  const unlockBlock = (blockType: string, goldCost: number) => {
    if (save.goldStones < goldCost) return
    const newSave = { ...save, goldStones: save.goldStones - goldCost, unlockedBlocks: [...save.unlockedBlocks, blockType] }
    setSave(newSave); saveSave(newSave)
    engineRef.current?.audio.purchase()
  }

  const handleReset = () => { const fresh = resetSave(); setSave(fresh); setScreen('menu') }

  // Touch controls
  const touchStart = (action: string) => {
    const e = engineRef.current; if (!e) return
    if (action === 'left') e.input.touchLeft = true
    if (action === 'right') e.input.touchRight = true
    if (action === 'jump') e.input.triggerTouchJump()
    if (action === 'sprint') e.input.touchSprint = true
    if (action === 'powerup') e.input.triggerTouchPowerup()
    if (action === 'dash') e.input.triggerTouchDash()
  }
  const touchEnd = (action: string) => {
    const e = engineRef.current; if (!e) return
    if (action === 'left') e.input.touchLeft = false
    if (action === 'right') e.input.touchRight = false
    if (action === 'sprint') e.input.touchSprint = false
  }

  const canvasVisible = screen === 'playing' || screen === 'paused' || screen === 'gameover' || screen === 'levelcomplete'

  const hasRasengan = (save.powerupLevels['rasengan'] || 0) > 0
  const hasGear5 = (save.powerupLevels['gear5'] || 0) > 0
  const hasUI = (save.powerupLevels['ultrainstinct'] || 0) > 0

  return (
    <div className="relative w-full h-screen overflow-hidden select-none" style={{ background: '#0B0E1A' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: canvasVisible ? 'block' : 'none' }} />

      {/* HUD */}
      {screen === 'playing' && (
        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between pointer-events-none z-10">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              {Array.from({ length: maxHealth }).map((_, i) => (
                <div key={i} className="w-7 h-7 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill={i < health ? COLORS.heart : COLORS.heartEmpty}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <div className="w-4 h-4 rounded-full" style={{ background: COLORS.gold }} />
              <span className="text-sm font-mono font-bold" style={{ color: COLORS.gold }}>{coins}</span>
              <div className="w-4 h-4 rotate-45 ml-2" style={{ background: COLORS.coinGold }} />
              <span className="text-sm font-mono font-bold" style={{ color: COLORS.coinGold }}>{gold}</span>
            </div>
          </div>
          <div className="px-3 py-1 rounded" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <span className="text-xs font-mono" style={{ color: '#AAA' }}>Lv.{selectedLevel}</span>
            <span className="text-sm font-bold ml-2" style={{ color: COLORS.text }}>{getLevelName(selectedLevel)}</span>
          </div>
          <div className="flex flex-col gap-1">
            {hasRasengan && <PowerupIndicator label="E" name="Rasengan" cd={powerupState.rasenganCd} maxCd={600} active={false} color={COLORS.rasengan} />}
            {hasGear5 && <PowerupIndicator label="Shift" name="Gear 5" cd={powerupState.gear5Cd} maxCd={900} active={powerupState.gear5Active} color={COLORS.gear5} />}
            {hasUI && <PowerupIndicator label="Q" name="UI Dash" cd={powerupState.uiCd} maxCd={1200} active={powerupState.uiActive} color={COLORS.ultraInstinct} />}
          </div>
          {isMobile && (
            <button className="pointer-events-auto absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => { const e = engineRef.current; if (e) { e.paused = true; setScreen('paused') } }}>
              <span className="text-xl font-bold" style={{ color: COLORS.text }}>||</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile Touch Controls */}
      {screen === 'playing' && isMobile && (
        <div className="absolute inset-x-0 bottom-0 p-4 z-10">
          <div className="flex justify-between items-end">
            <div className="flex gap-2">
              <TouchButton label="<" onDown={() => touchStart('left')} onUp={() => touchEnd('left')} size="lg" />
              <TouchButton label=">" onDown={() => touchStart('right')} onUp={() => touchEnd('right')} size="lg" />
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-2">
                {hasRasengan && <TouchButton label="E" onDown={() => touchStart('powerup')} color={COLORS.rasengan} />}
                {hasUI && <TouchButton label="Q" onDown={() => touchStart('dash')} color={COLORS.ultraInstinct} />}
              </div>
              <div className="flex gap-2">
                {hasGear5 && <TouchButton label="RUN" onDown={() => touchStart('sprint')} onUp={() => touchEnd('sprint')} color={COLORS.gear5} />}
                <TouchButton label="JUMP" onDown={() => touchStart('jump')} color="#4ECDC4" size="lg" round />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN MENU ===== */}
      {screen === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <MenuBackground />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-balance" style={{ color: COLORS.gold, textShadow: '0 0 40px rgba(255,215,0,0.4), 0 4px 8px rgba(0,0,0,0.8)' }}>
                MYSTIC WORLDS
              </h1>
              <p className="text-xl md:text-2xl font-bold mt-2" style={{ color: COLORS.goldLight, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                The Golden Hunt
              </p>
            </div>
            <div className="flex flex-col gap-3 w-64">
              <MenuButton onClick={() => setScreen('worldselect')}>Play</MenuButton>
              <MenuButton onClick={() => { setShopTab('powerups'); setScreen('shop') }}>Shop</MenuButton>
              <MenuButton onClick={() => setScreen('skins')}>Skins</MenuButton>
              <MenuButton onClick={() => setScreen('builder')}>Build Mode</MenuButton>
              <MenuButton onClick={handleReset} variant="danger">Reset Save</MenuButton>
            </div>
            <div className="flex gap-4 mt-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <span className="text-sm font-bold" style={{ color: COLORS.gold }}>Coins: {save.coins}</span>
              <span className="text-sm font-bold" style={{ color: COLORS.coinGold }}>Gold: {save.goldStones}</span>
              <span className="text-sm" style={{ color: '#AAA' }}>Level: {save.maxLevelReached}/{getLevelCount()}</span>
            </div>
            <div className="text-center mt-2 px-4" style={{ color: '#555' }}>
              <p className="text-xs">WASD/Arrows = Move | Space = Jump | E = Rasengan | Q = UI Dash | Shift = Gear 5</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== WORLD SELECT ===== */}
      {screen === 'worldselect' && (
        <div className="absolute inset-0 flex flex-col items-center z-20 overflow-y-auto" style={{ background: 'rgba(11,14,26,0.97)' }}>
          <div className="w-full max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={goToMenu} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: COLORS.text }}>Back</button>
              <h2 className="text-3xl font-black" style={{ color: COLORS.gold }}>Mystic Worlds</h2>
              <div className="w-16" />
            </div>
            <div className="flex flex-col gap-4">
              {getAllWorlds().map(world => {
                const unlocked = save.maxLevelReached >= world.levels[0]
                const completed = save.maxLevelReached > world.levels[1]
                return (
                  <button key={world.id} disabled={!unlocked}
                    onClick={() => { if (unlocked) { setSelectedWorld(world.id); setScreen('levelselect') } }}
                    className="p-5 rounded-xl text-left transition-all"
                    style={{
                      background: unlocked ? `linear-gradient(135deg, ${world.bgGradient[0]}, ${world.bgGradient[1]})` : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${unlocked ? world.ambientParticles.color + '40' : '#222'}`,
                      opacity: unlocked ? 1 : 0.4,
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                    }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black" style={{ color: unlocked ? world.ambientParticles.color : '#555' }}>{world.name}</h3>
                        <p className="text-sm mt-1" style={{ color: unlocked ? '#AAA' : '#444' }}>{world.subtitle}</p>
                        <p className="text-xs mt-2" style={{ color: '#666' }}>Levels {world.levels[0]} - {world.levels[1]}</p>
                      </div>
                      <div className="text-right">
                        {completed && <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: 'rgba(46,204,113,0.2)', color: COLORS.emerald }}>Complete</span>}
                        {!unlocked && <span className="text-2xl" style={{ color: '#444' }}>Locked</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== LEVEL SELECT ===== */}
      {screen === 'levelselect' && (
        <div className="absolute inset-0 flex flex-col items-center z-20 overflow-y-auto" style={{ background: 'rgba(11,14,26,0.97)' }}>
          <div className="w-full max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setScreen('worldselect')} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: COLORS.text }}>Back</button>
              <h2 className="text-2xl font-black" style={{ color: getWorldForLevel(getWorldForLevel(1).levels[0]).ambientParticles.color }}>
                {getAllWorlds().find(w => w.id === selectedWorld)?.name}
              </h2>
              <div className="w-16" />
            </div>
            {(() => {
              const world = getAllWorlds().find(w => w.id === selectedWorld)!
              return (
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {Array.from({ length: world.levels[1] - world.levels[0] + 1 }).map((_, i) => {
                    const lvl = world.levels[0] + i
                    const unlocked = lvl <= save.maxLevelReached
                    const stars = save.levelStars[lvl] || 0
                    const isBoss = lvl % 10 === 0
                    return (
                      <button key={lvl} disabled={!unlocked} onClick={() => { if (unlocked) startLevel(lvl) }}
                        className="relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all"
                        style={{
                          background: unlocked ? (isBoss ? 'rgba(231,76,60,0.25)' : `${world.ambientParticles.color}15`) : 'rgba(255,255,255,0.03)',
                          color: unlocked ? COLORS.text : '#444',
                          border: `2px solid ${unlocked ? (isBoss ? '#E74C3C50' : world.ambientParticles.color + '30') : '#1A1A1A'}`,
                        }}>
                        <span>{lvl}</span>
                        {stars > 0 && <div className="flex gap-px mt-0.5">{[1, 2, 3].map(s => <div key={s} className="w-1.5 h-1.5 rounded-full" style={{ background: s <= stars ? COLORS.gold : '#444' }} />)}</div>}
                        {!unlocked && <span className="absolute inset-0 flex items-center justify-center text-lg" style={{ color: '#333' }}>?</span>}
                        {isBoss && unlocked && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: COLORS.ruby }} />}
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ===== SHOP ===== */}
      {screen === 'shop' && (
        <div className="absolute inset-0 flex flex-col items-center z-20 overflow-y-auto" style={{ background: 'rgba(11,14,26,0.97)' }}>
          <div className="w-full max-w-2xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToMenu} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: COLORS.text }}>Back</button>
              <h2 className="text-3xl font-black" style={{ color: COLORS.gold }}>Shop</h2>
              <div className="flex gap-3">
                <span className="text-sm font-bold" style={{ color: COLORS.gold }}>C: {save.coins}</span>
                <span className="text-sm font-bold" style={{ color: COLORS.coinGold }}>G: {save.goldStones}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(['powerups', 'skins', 'other'] as const).map(tab => (
                <button key={tab} onClick={() => setShopTab(tab)}
                  className="px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all"
                  style={{ background: shopTab === tab ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)', color: shopTab === tab ? COLORS.gold : '#888', border: `2px solid ${shopTab === tab ? COLORS.gold + '40' : '#222'}` }}>
                  {tab === 'powerups' ? 'Power-Ups' : tab === 'skins' ? 'Skins' : 'Other'}
                </button>
              ))}
            </div>

            {/* Power-Ups Tab */}
            {shopTab === 'powerups' && (
              <div className="flex flex-col gap-4">
                {POWERUP_DEFS.map(pu => {
                  const currentLevel = save.powerupLevels[pu.id] || 0
                  return (
                    <div key={pu.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #ffffff10' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black" style={{ background: pu.color + '20', color: pu.color, border: `2px solid ${pu.color}40` }}>
                          {pu.icon}
                        </div>
                        <div>
                          <h3 className="font-bold" style={{ color: COLORS.text }}>{pu.name}</h3>
                          <p className="text-xs" style={{ color: '#888' }}>{pu.description}</p>
                        </div>
                        <div className="ml-auto flex gap-1">
                          {Array.from({ length: pu.maxLevel }).map((_, i) => (
                            <div key={i} className="w-3 h-3 rounded-full" style={{ background: i < currentLevel ? pu.color : '#333' }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {pu.prices.map(tier => {
                          const isOwned = currentLevel >= tier.level
                          const isNext = currentLevel === tier.level - 1
                          const canAfford = tier.currency === 'coins' ? save.coins >= tier.price : save.goldStones >= tier.price
                          return (
                            <button key={tier.level} disabled={isOwned || !isNext || !canAfford}
                              onClick={() => { if (isNext && canAfford) purchasePowerup(pu.id, tier.level, tier.price, tier.currency) }}
                              className="px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                              style={{
                                background: isOwned ? 'rgba(46,204,113,0.1)' : isNext && canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
                                color: isOwned ? COLORS.emerald : isNext && canAfford ? COLORS.gold : '#444',
                                border: `1px solid ${isOwned ? '#2ECC7130' : isNext && canAfford ? COLORS.gold + '40' : '#222'}`,
                                cursor: isOwned || !isNext || !canAfford ? 'not-allowed' : 'pointer',
                              }}>
                              <span>Lv.{tier.level}</span>
                              {isOwned ? <span>Owned</span> : <span>{tier.price} {tier.currency === 'coins' ? 'C' : 'G'}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Skins Tab */}
            {shopTab === 'skins' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SKINS.filter(s => s.id !== 'default').map(skin => {
                  const owned = save.ownedSkins.includes(skin.id)
                  const equipped = save.activeSkin === skin.id
                  const canAfford = skin.currency === 'coins' ? save.coins >= skin.price : save.goldStones >= skin.price
                  return (
                    <div key={skin.id} className="p-3 rounded-xl" style={{ background: equipped ? `${skin.bodyColor}10` : 'rgba(255,255,255,0.03)', border: `2px solid ${equipped ? skin.bodyColor + '60' : '#ffffff10'}` }}>
                      {/* Mini character preview */}
                      <div className="w-full h-20 rounded-lg mb-2 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <SkinPreview skin={skin} />
                      </div>
                      <h4 className="font-bold text-sm" style={{ color: COLORS.text }}>{skin.name}</h4>
                      <p className="text-xs mb-2" style={{ color: '#666' }}>{skin.description}</p>
                      {equipped ? (
                        <span className="text-xs font-bold" style={{ color: skin.bodyColor }}>Equipped</span>
                      ) : owned ? (
                        <button onClick={() => equipSkin(skin.id)} className="text-xs font-bold px-3 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: COLORS.text }}>Equip</button>
                      ) : (
                        <button disabled={!canAfford} onClick={() => purchaseSkin(skin.id, skin.price, skin.currency)}
                          className="text-xs font-bold px-3 py-1 rounded transition-all" style={{ background: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)', color: canAfford ? COLORS.gold : '#444', cursor: canAfford ? 'pointer' : 'not-allowed' }}>
                          {skin.price} {skin.currency === 'coins' ? 'C' : 'G'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Other Tab */}
            {shopTab === 'other' && (
              <div className="flex flex-col gap-3">
                <ShopOtherItem name="Extra Heart" desc={`+1 Max HP (Current: ${3 + save.extraHearts})`} price={25} currency="G" canAfford={save.goldStones >= 25} onClick={purchaseExtraHeart} />
                <ShopOtherItem name="Level Skip" desc="Unlock next level" price={75} currency="C" canAfford={save.coins >= 75 && save.maxLevelReached < getLevelCount()} onClick={purchaseLevelSkip} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SKINS SCREEN ===== */}
      {screen === 'skins' && (
        <div className="absolute inset-0 flex flex-col items-center z-20 overflow-y-auto" style={{ background: 'rgba(11,14,26,0.97)' }}>
          <div className="w-full max-w-2xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={goToMenu} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: COLORS.text }}>Back</button>
              <h2 className="text-3xl font-black" style={{ color: COLORS.gold }}>Skins</h2>
              <div className="w-16" />
            </div>
            <p className="text-sm mb-4" style={{ color: '#888' }}>Current: <span style={{ color: getSkin(save.activeSkin).bodyColor }}>{getSkin(save.activeSkin).name}</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SKINS.map(skin => {
                const owned = save.ownedSkins.includes(skin.id)
                const equipped = save.activeSkin === skin.id
                return (
                  <button key={skin.id} disabled={!owned}
                    onClick={() => { if (owned) equipSkin(skin.id) }}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{ background: equipped ? `${skin.bodyColor}15` : owned ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `2px solid ${equipped ? skin.bodyColor + '60' : '#ffffff08'}`, opacity: owned ? 1 : 0.4 }}>
                    <div className="w-full h-16 rounded-lg mb-2 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <SkinPreview skin={skin} />
                    </div>
                    <h4 className="font-bold text-sm" style={{ color: owned ? COLORS.text : '#555' }}>{skin.name}</h4>
                    {equipped && <span className="text-xs" style={{ color: skin.bodyColor }}>Equipped</span>}
                    {!owned && <span className="text-xs" style={{ color: '#444' }}>Not Owned - Buy in Shop</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== BUILD MODE ===== */}
      {screen === 'builder' && (
        <div className="absolute inset-0 flex flex-col items-center z-20 overflow-y-auto" style={{ background: 'rgba(11,14,26,0.97)' }}>
          <div className="w-full max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={goToMenu} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: COLORS.text }}>Back</button>
              <h2 className="text-3xl font-black" style={{ color: COLORS.gold }}>Build Mode</h2>
              <div className="flex gap-2 items-center">
                <div className="w-4 h-4 rotate-45" style={{ background: COLORS.coinGold }} />
                <span className="text-sm font-bold" style={{ color: COLORS.coinGold }}>{save.goldStones}</span>
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: '#AAA' }}>Unlock blocks with Golden Stones to build your own levels.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['terrain', 'hazard', 'item', 'entity', 'special'] as const).map(cat => (
                <div key={cat} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #ffffff08' }}>
                  <h3 className="text-sm font-bold uppercase mb-3" style={{ color: '#888' }}>{cat}</h3>
                  <div className="flex flex-wrap gap-2">
                    {BUILD_BLOCKS.filter(b => b.category === cat).map(block => {
                      const unlocked = save.unlockedBlocks.includes(block.type)
                      const canAfford = save.goldStones >= block.goldCost
                      return (
                        <div key={block.type} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          style={{ background: unlocked ? `${block.color}15` : 'rgba(255,255,255,0.02)', border: `1px solid ${unlocked ? block.color + '30' : '#222'}` }}>
                          <div className="w-5 h-5 rounded" style={{ background: block.color, opacity: unlocked ? 1 : 0.3 }} />
                          <span className="text-xs font-bold" style={{ color: unlocked ? COLORS.text : '#555' }}>{block.name}</span>
                          {!unlocked && block.goldCost > 0 && (
                            <button disabled={!canAfford} onClick={() => unlockBlock(block.type, block.goldCost)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded ml-1" style={{ background: canAfford ? 'rgba(255,140,0,0.2)' : 'rgba(255,255,255,0.03)', color: canAfford ? COLORS.coinGold : '#444', cursor: canAfford ? 'pointer' : 'not-allowed' }}>
                              {block.goldCost}G
                            </button>
                          )}
                          {unlocked && <span className="text-[10px]" style={{ color: COLORS.emerald }}>OK</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl text-center" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid #FFD70020' }}>
              <p className="text-sm" style={{ color: '#888' }}>Full interactive builder coming soon. Unlock blocks now to be ready!</p>
            </div>
          </div>
        </div>
      )}

      {/* Pause */}
      {screen === 'paused' && (
        <Overlay>
          <h2 className="text-4xl font-black mb-6" style={{ color: COLORS.gold }}>Paused</h2>
          <div className="flex flex-col gap-3 w-56">
            <MenuButton onClick={resumeGame}>Resume</MenuButton>
            <MenuButton onClick={restartLevel}>Restart</MenuButton>
            <MenuButton onClick={goToMenu} variant="danger">Quit</MenuButton>
          </div>
        </Overlay>
      )}

      {/* Game Over */}
      {screen === 'gameover' && (
        <Overlay>
          <h2 className="text-4xl font-black mb-2" style={{ color: COLORS.ruby }}>Game Over</h2>
          <p className="text-lg mb-6" style={{ color: '#AAA' }}>Collected {coins} coins</p>
          <div className="flex flex-col gap-3 w-56">
            <MenuButton onClick={restartLevel}>Try Again</MenuButton>
            <MenuButton onClick={goToMenu} variant="danger">Quit</MenuButton>
          </div>
        </Overlay>
      )}

      {/* Level Complete */}
      {screen === 'levelcomplete' && (
        <Overlay>
          <h2 className="text-4xl font-black mb-2" style={{ color: COLORS.gold }}>Level Complete!</h2>
          <div className="flex gap-6 mb-4">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full mx-auto mb-1" style={{ background: COLORS.gold }} />
              <span className="text-xl font-bold" style={{ color: COLORS.gold }}>{coins}</span>
              <p className="text-xs" style={{ color: '#888' }}>Coins</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rotate-45 mx-auto mb-1" style={{ background: COLORS.coinGold }} />
              <span className="text-xl font-bold" style={{ color: COLORS.coinGold }}>{gold}</span>
              <p className="text-xs" style={{ color: '#888' }}>Gold</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-56">
            {selectedLevel < getLevelCount() && <MenuButton onClick={nextLevel}>Next Level</MenuButton>}
            <MenuButton onClick={restartLevel}>Replay</MenuButton>
            <MenuButton onClick={goToMenu} variant="danger">Menu</MenuButton>
          </div>
        </Overlay>
      )}
    </div>
  )
}

// ===== SUB COMPONENTS =====

function MenuBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.06) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(46,204,113,0.04) 0%, transparent 50%), linear-gradient(180deg, #0B0E1A 0%, #1A1040 50%, #0B0E1A 100%)' }} />
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{ width: 2 + (i % 4), height: 2 + (i % 4), background: i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.emerald : '#FFF', opacity: 0.2 + (i % 5) * 0.1, left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animation: `float ${3 + (i % 4)}s ease-in-out infinite ${i * 0.3}s` }} />
      ))}
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(0,0,0,0.85)' }}>{children}</div>
}

function MenuButton({ children, onClick, variant = 'primary' }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'danger' }) {
  const bg = variant === 'danger' ? 'rgba(231,76,60,0.15)' : 'rgba(255,215,0,0.12)'
  const border = variant === 'danger' ? '#E74C3C50' : COLORS.gold + '35'
  const color = variant === 'danger' ? COLORS.ruby : COLORS.gold
  return <button onClick={onClick} className="px-6 py-3 rounded-xl text-lg font-bold transition-all hover:scale-105 active:scale-95" style={{ background: bg, color, border: `2px solid ${border}` }}>{children}</button>
}

function TouchButton({ label, onDown, onUp, color = 'rgba(255,255,255,0.15)', size = 'md', round = false }: {
  label: string; onDown: () => void; onUp?: () => void; color?: string; size?: 'md' | 'lg'; round?: boolean
}) {
  const sz = size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'
  return (
    <button className={`${sz} ${round ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center text-sm font-bold active:scale-95`}
      style={{ background: color + '30', color, border: `2px solid ${color}60` }}
      onTouchStart={(e) => { e.preventDefault(); onDown() }}
      onTouchEnd={() => onUp?.()}>{label}</button>
  )
}

function PowerupIndicator({ label, name, cd, maxCd, active, color }: { label: string; name: string; cd: number; maxCd: number; active: boolean; color: string }) {
  const ready = cd <= 0 && !active
  const progress = active ? 1 : cd > 0 ? 1 - cd / maxCd : 1
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="relative w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
        style={{ background: active ? color + '40' : ready ? color + '20' : '#333', color: active ? '#FFF' : ready ? color : '#666', border: `2px solid ${active ? color : ready ? color + '60' : '#444'}` }}>{label}</div>
      <div className="hidden md:flex flex-col">
        <span className="text-[10px] font-bold" style={{ color: active ? color : ready ? '#AAA' : '#555' }}>{name}</span>
        <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: '#333' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: color }} />
        </div>
      </div>
    </div>
  )
}

function SkinPreview({ skin }: { skin: typeof SKINS[0] }) {
  return (
    <div className="relative" style={{ width: 28, height: 40 }}>
      {/* Legs */}
      <div className="absolute" style={{ left: 5, bottom: 0, width: 8, height: 12, background: skin.legColor, borderRadius: 2 }} />
      <div className="absolute" style={{ right: 5, bottom: 0, width: 8, height: 12, background: skin.legColor, borderRadius: 2 }} />
      {/* Body */}
      <div className="absolute" style={{ left: 2, top: 14, width: 24, height: 16, background: skin.bodyColor, borderRadius: 3 }} />
      {/* Head */}
      <div className="absolute" style={{ left: 4, top: 2, width: 20, height: 14, background: skin.headColor, borderRadius: 4 }} />
      {/* Hair indicator */}
      {skin.hairColor && <div className="absolute" style={{ left: 3, top: 0, width: 22, height: 6, background: skin.hairColor, borderRadius: '4px 4px 0 0' }} />}
      {/* Eyes */}
      <div className="absolute" style={{ left: 14, top: 6, width: 4, height: 4, background: skin.eyeColor, borderRadius: '50%' }} />
      <div className="absolute" style={{ left: 20, top: 6, width: 4, height: 4, background: skin.eyeColor, borderRadius: '50%' }} />
    </div>
  )
}

function ShopOtherItem({ name, desc, price, currency, canAfford, onClick }: { name: string; desc: string; price: number; currency: string; canAfford: boolean; onClick: () => void }) {
  return (
    <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #ffffff10' }}>
      <div className="flex-1">
        <h3 className="font-bold text-sm" style={{ color: COLORS.text }}>{name}</h3>
        <p className="text-xs" style={{ color: '#888' }}>{desc}</p>
      </div>
      <button disabled={!canAfford} onClick={onClick}
        className="px-4 py-2 rounded-lg text-sm font-bold transition-all" style={{ background: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)', color: canAfford ? COLORS.gold : '#444', border: `2px solid ${canAfford ? COLORS.gold + '40' : '#222'}`, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
        {price} {currency}
      </button>
    </div>
  )
}
