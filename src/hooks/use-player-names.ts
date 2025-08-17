import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'

export function usePlayerNames(playerIds: string[]) {
  return useQuery({
    queryKey: ['player-names', playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return {}
      
      const players = await database.profiles.getAllProfiles()
      const playerMap: Record<string, string> = {}
      
      players.forEach(player => {
        if (playerIds.includes(player.id)) {
          playerMap[player.id] = player.name
        }
      })
      
      return playerMap
    },
    enabled: playerIds.length > 0,
  })
}