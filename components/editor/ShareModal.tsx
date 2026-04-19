'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, UserPlus, Loader2, Shield, Eye, ChevronDown, Check, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ShareWithProfile } from '@/types'
import toast from 'react-hot-toast'

interface ShareModalProps {
  documentId: string
  documentTitle: string
  ownerId: string
  currentUserId: string
  onClose: () => void
}

type Permission = 'view' | 'edit'

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function ShareModal({
  documentId,
  documentTitle,
  ownerId,
  currentUserId,
  onClose,
}: ShareModalProps) {
  const supabase = createClient()
  const isOwner = currentUserId === ownerId

  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<Permission>('edit')
  const [loading, setLoading] = useState(false)
  const [loadingShares, setLoadingShares] = useState(true)
  const [shares, setShares] = useState<ShareWithProfile[]>([])
  const [permDropdown, setPermDropdown] = useState<string | null>(null)

  const fetchShares = useCallback(async () => {
    const { data } = await supabase
      .from('document_shares')
      .select('*, profiles!document_shares_user_id_fkey(id, full_name, avatar_url, email)')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (data) setShares(data as unknown as ShareWithProfile[])
    setLoadingShares(false)
  }, [documentId, supabase])

  useEffect(() => {
    fetchShares()
  }, [fetchShares])

  const handleInvite = async () => {
    if (!email.trim()) return
    setLoading(true)

    try {
      // Find user by email via profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (profileError || !profile) {
        toast.error('No user found with that email address')
        setLoading(false)
        return
      }

      if (profile.id === ownerId) {
        toast.error("You can't invite yourself")
        setLoading(false)
        return
      }

      // Check if already shared
      const alreadyShared = shares.some((s) => s.user_id === profile.id)
      if (alreadyShared) {
        toast.error('This user already has access')
        setLoading(false)
        return
      }

      const { error } = await supabase.from('document_shares').insert({
        document_id: documentId,
        user_id: profile.id,
        permission,
      })

      if (error) {
        toast.error('Failed to share document')
      } else {
        toast.success(`Shared with ${profile.full_name ?? profile.email}`)
        setEmail('')
        await fetchShares()
      }
    } catch {
      toast.error('Something went wrong')
    }

    setLoading(false)
  }

  const handleRemove = async (shareId: string, userName: string | null) => {
    const { error } = await supabase
      .from('document_shares')
      .delete()
      .eq('id', shareId)

    if (error) {
      toast.error('Failed to remove access')
    } else {
      toast.success(`Removed ${userName ?? 'user'}`)
      await fetchShares()
    }
  }

  const handleChangePermission = async (shareId: string, newPermission: Permission) => {
    const { error } = await supabase
      .from('document_shares')
      .update({ permission: newPermission })
      .eq('id', shareId)

    if (!error) {
      await fetchShares()
    }
    setPermDropdown(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md pointer-events-auto animate-scale-in"
          style={{
            background: 'rgba(18, 18, 24, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="text-text font-semibold text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Share "{documentTitle}"
              </h2>
              <p className="text-text-muted text-xs mt-0.5">
                Invite people to view or edit this document
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Invite section */}
          {isOwner && (
            <div className="p-5 border-b border-border">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  placeholder="colleague@example.com"
                  className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  id="share-email-input"
                />

                {/* Permission selector */}
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as Permission)}
                  className="bg-bg-elevated border border-border rounded-lg px-2 py-2 text-sm text-text outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="edit">Can edit</option>
                  <option value="view">Can view</option>
                </select>

                <button
                  onClick={handleInvite}
                  disabled={loading || !email.trim()}
                  className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Invite
                </button>
              </div>
            </div>
          )}

          {/* Collaborators list */}
          <div className="p-5 max-h-64 overflow-y-auto">
            {loadingShares ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-text-muted text-sm">No collaborators yet</p>
                <p className="text-text-muted/60 text-xs mt-1">
                  Invite someone using their email address
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {shares.map((share) => {
                  const user = share.profiles as unknown as {
                    id: string; full_name: string | null; avatar_url: string | null; email: string
                  }
                  return (
                    <li
                      key={share.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-elevated transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(user?.full_name ?? null)
                        )}
                      </div>

                      {/* Name & email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-text text-sm font-medium truncate">
                          {user?.full_name ?? 'Unknown'}
                        </p>
                        <p className="text-text-muted text-xs truncate">{user?.email}</p>
                      </div>

                      {/* Permission badge + dropdown */}
                      {isOwner ? (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setPermDropdown(permDropdown === share.id ? null : share.id)
                            }
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-text border border-border rounded-md px-2 py-1 transition-colors"
                          >
                            {share.permission === 'edit' ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                            {share.permission}
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {permDropdown === share.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-bg-elevated border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                              {(['view', 'edit'] as Permission[]).map((p) => (
                                <button
                                  key={p}
                                  onClick={() => handleChangePermission(share.id, p)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text hover:bg-bg-subtle transition-colors"
                                >
                                  {share.permission === p && <Check className="w-3 h-3 text-primary" />}
                                  <span className={share.permission === p ? 'ml-0' : 'ml-5'}>
                                    Can {p}
                                  </span>
                                </button>
                              ))}
                              <div className="border-t border-border" />
                              <button
                                onClick={() => handleRemove(share.id, user?.full_name ?? null)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error/10 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove access
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border',
                            share.permission === 'edit'
                              ? 'border-primary/30 bg-primary/10 text-primary-light'
                              : 'border-border bg-bg-elevated text-text-muted'
                          )}
                        >
                          {share.permission}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-bg-subtle/50 rounded-b-2xl">
            <p className="text-xs text-text-muted">
              {isOwner
                ? 'Collaborators will see this document in their "Shared with me" section.'
                : 'You have access to this document.'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
