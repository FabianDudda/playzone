/**
 * Utility functions for parsing scores and determining match winners
 */

export interface ScoreResult {
  result: 'team_a' | 'team_b' | 'draw' | null
  scoreA: string
  scoreB: string
}

/**
 * Parse numeric scores and determine winner
 * Examples: "21" vs "19" -> team_a_wins, "6-4" vs "6-2" -> comparison of total sets
 */
export function parseScore(scoreA: string, scoreB: string): ScoreResult {
  if (!scoreA.trim() || !scoreB.trim()) {
    return {
      result: null,
      scoreA: scoreA.trim(),
      scoreB: scoreB.trim()
    }
  }

  const normalizedScoreA = scoreA.trim()
  const normalizedScoreB = scoreB.trim()

  try {
    // Try to parse as simple numbers first
    const numA = parseFloat(normalizedScoreA)
    const numB = parseFloat(normalizedScoreB)
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return {
        result: numA > numB ? 'team_a' : numB > numA ? 'team_b' : 'draw',
        scoreA: normalizedScoreA,
        scoreB: normalizedScoreB
      }
    }

    // Try to parse set scores (e.g., "6-4", "21-19")
    const setScoreA = parseSetScore(normalizedScoreA)
    const setScoreB = parseSetScore(normalizedScoreB)
    
    if (setScoreA !== null && setScoreB !== null) {
      return {
        result: setScoreA > setScoreB ? 'team_a' : setScoreB > setScoreA ? 'team_b' : 'draw',
        scoreA: normalizedScoreA,
        scoreB: normalizedScoreB
      }
    }

    // If we can't parse the scores, return null for manual selection
    return {
      result: null,
      scoreA: normalizedScoreA,
      scoreB: normalizedScoreB
    }

  } catch (error) {
    return {
      result: null,
      scoreA: normalizedScoreA,
      scoreB: normalizedScoreB
    }
  }
}

/**
 * Parse set-based scores like "6-4", "21-19", "3-1" (for sets won)
 * Returns the total score or set count
 */
function parseSetScore(score: string): number | null {
  // Handle set notation like "6-4", "21-19", etc.
  if (score.includes('-')) {
    const parts = score.split('-').map(part => parseInt(part.trim()))
    if (parts.length === 2 && parts.every(p => !isNaN(p))) {
      // For tennis-style scoring, we sum the games/points
      // For volleyball/other sports, this represents the final score
      return parts[0]
    }
  }
  
  // Handle simple numbers
  const num = parseInt(score)
  return isNaN(num) ? null : num
}

/**
 * Get a human-readable description of the score result
 */
export function getScoreDescription(scoreResult: ScoreResult): string {
  const { result, scoreA, scoreB } = scoreResult
  
  if (!result) {
    return scoreA && scoreB ? `${scoreA} - ${scoreB} (Winner to be selected manually)` : 'Enter scores to auto-detect winner'
  }
  
  const scoreDisplay = `${scoreA} - ${scoreB}`
  
  switch (result) {
    case 'team_a':
      return `${scoreDisplay} (Team A wins)`
    case 'team_b':
      return `${scoreDisplay} (Team B wins)`
    case 'draw':
      return `${scoreDisplay} (Draw)`
    default:
      return scoreDisplay
  }
}