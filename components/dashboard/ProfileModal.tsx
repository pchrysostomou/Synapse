'use client'

import { useState } from 'react'
import { X, User, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'

interface ProfileModalProps {
  profile: Profile
  onClose: () => void
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function ProfileModal({ profile, onClose }: ProfileModalProps) {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      setSaved(true)
      toast.success('Profile updated!')
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-sm pointer-events-auto animate-scale-in"
          style={{
            background: 'rgba(18, 18, 24, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-text font-semibold text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profile Settings
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary overflow-hidden ring-2 ring-primary/30">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile.full_name)
                )}
              </div>
              <div>
                <p className="text-text font-medium text-sm">{profile.full_name ?? 'Set your name'}</p>
                <p className="text-text-muted text-xs">{profile.email}</p>
              </div>
            </div>

            {/* Full name input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide" htmlFor="profile-name">
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Your full name"
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Email
              </label>
              <div className="w-full bg-bg-subtle border border-border rounded-lg px-3 py-2.5 text-sm text-text-muted select-none">
                {profile.email}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : null}
              {saved ? 'Saved!' : 'Save changes'}
            </button>
          </div>

          {/* Sign out */}
          <div className="px-5 pb-5">
            <button
              onClick={handleSignOut}
              className="w-full text-sm text-error/80 hover:text-error border border-error/20 hover:border-error/40 rounded-lg py-2 transition-all hover:bg-error/5"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
