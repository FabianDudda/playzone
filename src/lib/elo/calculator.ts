import { SportType, EloRatings } from '../supabase/types'

export interface Player {
  id: string
  name: string
  elo: EloRatings
}

export interface Team {
  players: Player[]
}

export interface MatchResult {
  teamA: Team
  teamB: Team
  sport: SportType
  result: 'team_a' | 'team_b' | 'draw'
}

export interface EloUpdate {
  playerId: string
  eloBefore: number
  eloAfter: number
  eloChange: number
}

export class EloCalculator {
  /**
   * Calculate K-factor based on team size
   * Singles (1v1): K = 32
   * Small teams (2-3 players): K = 26  
   * Large teams (4+ players): K = 18
   */
  static getKFactor(teamSize: number): number {
    if (teamSize === 1) return 32
    if (teamSize >= 2 && teamSize <= 3) return 26
    return 18
  }

  /**
   * Calculate team average Elo rating for a specific sport
   */
  static getTeamAverageElo(team: Team, sport: SportType): number {
    const totalElo = team.players.reduce((sum, player) => {
      return sum + player.elo[sport]
    }, 0)
    return totalElo / team.players.length
  }

  /**
   * Calculate expected score using standard Elo formula
   * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
   */
  static calculateExpectedScore(playerElo: number, opponentElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  }

  /**
   * Calculate new Elo rating
   * New_Elo = Old_Elo + K * (Actual_Score - Expected_Score)
   */
  static calculateNewElo(
    currentElo: number,
    expectedScore: number,
    actualScore: number,
    kFactor: number
  ): number {
    return Math.round(currentElo + kFactor * (actualScore - expectedScore))
  }

  /**
   * Update team Elo ratings based on match result
   */
  static updateTeamElo(matchResult: MatchResult): EloUpdate[] {
    const { teamA, teamB, sport, result } = matchResult
    const updates: EloUpdate[] = []

    // Calculate team average Elos
    const eloA = this.getTeamAverageElo(teamA, sport)
    const eloB = this.getTeamAverageElo(teamB, sport)

    // Calculate expected scores
    const expectedA = this.calculateExpectedScore(eloA, eloB)
    const expectedB = 1 - expectedA

    // Actual scores (1 for win, 0.5 for draw, 0 for loss)
    let actualA: number, actualB: number
    if (result === 'team_a') {
      actualA = 1
      actualB = 0
    } else if (result === 'team_b') {
      actualA = 0
      actualB = 1
    } else { // draw
      actualA = 0.5
      actualB = 0.5
    }

    // Update Team A players
    const kFactorA = this.getKFactor(teamA.players.length)
    for (const player of teamA.players) {
      const currentElo = player.elo[sport]
      const newElo = this.calculateNewElo(currentElo, expectedA, actualA, kFactorA)
      
      updates.push({
        playerId: player.id,
        eloBefore: currentElo,
        eloAfter: newElo,
        eloChange: newElo - currentElo
      })
    }

    // Update Team B players
    const kFactorB = this.getKFactor(teamB.players.length)
    for (const player of teamB.players) {
      const currentElo = player.elo[sport]
      const newElo = this.calculateNewElo(currentElo, expectedB, actualB, kFactorB)
      
      updates.push({
        playerId: player.id,
        eloBefore: currentElo,
        eloAfter: newElo,
        eloChange: newElo - currentElo
      })
    }

    return updates
  }

  /**
   * Predict match outcome probability
   */
  static predictMatchOutcome(teamA: Team, teamB: Team, sport: SportType): {
    teamAWinProbability: number
    teamBWinProbability: number
    eloAdvantage: number
  } {
    const eloA = this.getTeamAverageElo(teamA, sport)
    const eloB = this.getTeamAverageElo(teamB, sport)
    
    const teamAWinProbability = this.calculateExpectedScore(eloA, eloB)
    const teamBWinProbability = 1 - teamAWinProbability
    const eloAdvantage = eloA - eloB

    return {
      teamAWinProbability,
      teamBWinProbability,
      eloAdvantage
    }
  }

  /**
   * Calculate Elo change simulation without applying updates
   */
  static simulateEloChange(
    teamA: Team,
    teamB: Team,
    sport: SportType,
    result: 'team_a' | 'team_b' | 'draw'
  ): EloUpdate[] {
    return this.updateTeamElo({
      teamA,
      teamB,
      sport,
      result
    })
  }
}

export default EloCalculator