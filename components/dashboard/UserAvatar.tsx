import Image from 'next/image'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface UserAvatarProps {
  profile: Profile | null
  email: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { container: 'w-8 h-8 text-xs', image: 32 },
  md: { container: 'w-10 h-10 text-sm', image: 40 },
  lg: { container: 'w-12 h-12 text-base', image: 48 },
}

export function UserAvatar({ profile, email, size = 'md' }: UserAvatarProps) {
  const { container, image } = sizes[size]
  const initials = getInitials(profile?.full_name, email)

  if (profile?.avatar_url) {
    return (
      <div className={cn('rounded-full overflow-hidden shrink-0 ring-2 ring-border', container)}>
        <Image
          src={profile.avatar_url}
          alt={profile.full_name || email}
          width={image}
          height={image}
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full shrink-0 ring-2 ring-border',
        'bg-primary/20 flex items-center justify-center font-semibold text-primary-light',
        container
      )}
      aria-label={`Avatar for ${profile?.full_name || email}`}
    >
      {initials}
    </div>
  )
}
