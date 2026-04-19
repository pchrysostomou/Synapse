'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PresenceUser } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Deterministic color from user_id
const PRESENCE_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#DB2777', '#0891B2', '#7C2D12',
]

function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length]
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

interface PresenceAvatarsProps {
  docId: string
  userId: string
  userName: string
  userAvatar: string | null
}

export function PresenceAvatars({ docId, userId, userName, userAvatar }: PresenceAvatarsProps) {
  const supabase = createClient()
  const [presence, setPresence] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const color = getUserColor(userId)
    const channel = supabase.channel(`doc:${docId}`, {
      config: { presence: { key: userId } },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        const users = Object.values(state)
          .flat()
          .filter((u) => u.user_id !== userId) // exclude self
        setPresence(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            full_name: userName,
            avatar_url: userAvatar,
            color,
          })
        }
      })

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [docId, userId, userName, userAvatar, supabase])

  if (presence.length === 0) return null

  const visible = presence.slice(0, 5)
  const overflow = presence.length - 5

  return (
    <div
      className="flex items-center"
      title={`${presence.length} other${presence.length !== 1 ? 's' : ''} viewing`}
    >
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <div
            key={user.user_id}
            className="relative group"
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-bg overflow-hidden transition-transform hover:scale-110 hover:z-10 cursor-default"
              style={{ backgroundColor: user.color, boxShadow: `0 0 0 2px ${user.color}30` }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(user.full_name)
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-bg-elevated border border-border rounded-md text-xs text-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
              {user.full_name}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-border" />
            </div>

            {/* Online dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success ring-1 ring-bg"
              aria-hidden
            />
          </div>
        ))}

        {overflow > 0 && (
          <div
            className="w-7 h-7 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs font-medium text-text-muted ring-2 ring-bg"
            title={`${overflow} more`}
          >
            +{overflow}
          </div>
        )}
      </div>

      <span className="ml-2 text-xs text-text-muted hidden sm:block">
        {presence.length} online
      </span>
    </div>
  )
}
