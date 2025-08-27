import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), 'data')
const TICKETS_FILE = path.join(STORAGE_DIR, 'lottery_tickets.json')
const DRAWS_FILE = path.join(STORAGE_DIR, 'lottery_draws.json')
const STATS_FILE = path.join(STORAGE_DIR, 'lottery_stats.json')

// Adatbázis inicializálása
function ensureStorageExists() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }
  
  // Alapértelmezett fájlok létrehozása
  if (!fs.existsSync(TICKETS_FILE)) {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify([], null, 2))
  }
  
  if (!fs.existsSync(DRAWS_FILE)) {
    const defaultDraws = [{
      id: 1,
      drawNumber: 1,
      winningNumber: 0,
      jackpot: 1000000,
      totalTickets: 0,
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }]
    fs.writeFileSync(DRAWS_FILE, JSON.stringify(defaultDraws, null, 2))
  }
  
  if (!fs.existsSync(STATS_FILE)) {
    const defaultStats = {
      id: 1,
      totalTickets: 0,
      activeTickets: 0,
      totalJackpot: 1000000,
      nextDrawTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastDrawNumber: 0,
      updatedAt: new Date().toISOString()
    }
    fs.writeFileSync(STATS_FILE, JSON.stringify(defaultStats, null, 2))
  }
}

// Adatok olvasása
function readData<T>(filePath: string): T {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return [] as T
  }
}

// Adatok írása
function writeData<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error)
  }
}

// Lottó típusok
export interface LotteryTicket {
  id: number
  playerFid: number
  playerAddress: string
  playerName: string
  playerAvatar?: string
  number: number
  drawId: number
  isActive: boolean
  createdAt: string
}

export interface LotteryDraw {
  id: number
  drawNumber: number
  winningNumber: number
  jackpot: number
  totalTickets: number
  status: 'pending' | 'active' | 'completed'
  startTime: string
  endTime: string
  createdAt: string
}

export interface LotteryStats {
  id: number
  totalTickets: number
  activeTickets: number
  totalJackpot: number
  nextDrawTime: string
  lastDrawNumber: number
  updatedAt: string
}

// Tárolási műveletek
export class LotteryStorage {
  constructor() {
    ensureStorageExists()
  }

  // Sorsjegyek
  getTickets(): LotteryTicket[] {
    return readData<LotteryTicket[]>(TICKETS_FILE)
  }

  addTicket(ticket: Omit<LotteryTicket, 'id'>): LotteryTicket {
    const tickets = this.getTickets()
    const newTicket: LotteryTicket = {
      ...ticket,
      id: tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1
    }
    tickets.push(newTicket)
    writeData(TICKETS_FILE, tickets)
    return newTicket
  }

  updateTicket(id: number, updates: Partial<LotteryTicket>): boolean {
    const tickets = this.getTickets()
    const index = tickets.findIndex(t => t.id === id)
    if (index === -1) return false
    
    tickets[index] = { ...tickets[index], ...updates }
    writeData(TICKETS_FILE, tickets)
    return true
  }

  getActiveTickets(): LotteryTicket[] {
    return this.getTickets().filter(t => t.isActive)
  }

  // Húzások
  getDraws(): LotteryDraw[] {
    return readData<LotteryDraw[]>(DRAWS_FILE)
  }

  addDraw(draw: Omit<LotteryDraw, 'id'>): LotteryDraw {
    const draws = this.getDraws()
    const newDraw: LotteryDraw = {
      ...draw,
      id: draws.length > 0 ? Math.max(...draws.map(d => d.id)) + 1 : 1
    }
    draws.push(newDraw)
    writeData(DRAWS_FILE, draws)
    return newDraw
  }

  updateDraw(id: number, updates: Partial<LotteryDraw>): boolean {
    const draws = this.getDraws()
    const index = draws.findIndex(d => d.id === id)
    if (index === -1) return false
    
    draws[index] = { ...draws[index], ...updates }
    writeData(DRAWS_FILE, draws)
    return true
  }

  getActiveDraw(): LotteryDraw | null {
    return this.getDraws().find(d => d.status === 'active') || null
  }

  // Statisztikák
  getStats(): LotteryStats {
    return readData<LotteryStats>(STATS_FILE)
  }

  updateStats(updates: Partial<LotteryStats>): void {
    const stats = this.getStats()
    const updatedStats = { ...stats, ...updates, updatedAt: new Date().toISOString() }
    writeData(STATS_FILE, updatedStats)
  }

  // Segédfüggvények
  getNextTicketId(): number {
    const tickets = this.getTickets()
    return tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1
  }

  getNextDrawId(): number {
    const draws = this.getDraws()
    return draws.length > 0 ? Math.max(...draws.map(d => d.id)) + 1 : 1
  }
}

// Singleton instance
export const lotteryStorage = new LotteryStorage()
