import { SaveData, createDefaultSave } from './core'

const SAVE_KEY = 'mystic_worlds_save'

export function loadSave(): SaveData {
  if (typeof window === 'undefined') return createDefaultSave()
  try {
    const data = localStorage.getItem(SAVE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      return { ...createDefaultSave(), ...parsed }
    }
  } catch {
    // corrupted save
  }
  return createDefaultSave()
}

export function saveSave(data: SaveData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    // storage full
  }
}

export function resetSave(): SaveData {
  const fresh = createDefaultSave()
  saveSave(fresh)
  return fresh
}
