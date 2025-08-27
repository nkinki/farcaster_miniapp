export interface LotteryTicket {
  id: number
  playerFid: number
  playerAddress: string
  playerName: string
  playerAvatar?: string
  number: number // 1-100
  drawId: number
  isActive: boolean
  createdAt: Date
}

export interface LotteryDraw {
  id: number
  drawNumber: number
  winningNumber: number
  jackpot: number
  totalTickets: number
  winners: LotteryTicket[]
  status: 'pending' | 'active' | 'completed'
  startTime: Date
  endTime: Date
  createdAt: Date
}

export interface LotteryStats {
  totalTickets: number
  activeTickets: number
  totalJackpot: number
  nextDrawTime: Date
  lastDrawNumber: number
}
