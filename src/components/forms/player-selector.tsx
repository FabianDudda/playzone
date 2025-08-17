'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useQuery } from '@tanstack/react-query'
import { database } from '@/lib/supabase/database'
import { Profile } from '@/lib/supabase/types'

interface PlayerSelectorProps {
  onPlayerSelect: (playerId: string, playerName: string) => void
  selectedPlayers?: string[]
  placeholder?: string
  disabled?: boolean
}

export default function PlayerSelector({ 
  onPlayerSelect, 
  selectedPlayers = [], 
  placeholder = "Search players...",
  disabled = false 
}: PlayerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all profiles for player selection
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: () => database.profiles.getAllProfiles(),
  })

  // Filter players based on search query and exclude already selected
  const filteredPlayers = players.filter(player => {
    const matchesSearch = !searchQuery || 
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    const notSelected = !selectedPlayers.includes(player.id)
    return matchesSearch && notSelected
  })

  const handlePlayerSelect = (player: Profile) => {
    onPlayerSelect(player.id, player.name)
    setOpen(false)
    setSearchQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search players..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading players...</CommandEmpty>
            ) : filteredPlayers.length === 0 ? (
              <CommandEmpty>
                {searchQuery ? 'No players found.' : 'No available players.'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredPlayers.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={player.name}
                    onSelect={() => handlePlayerSelect(player)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={player.avatar || undefined} alt={player.name} />
                      <AvatarFallback className="text-xs">
                        {player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{player.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedPlayers.includes(player.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}