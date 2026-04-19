'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import {
  FileText,
  Users,
  Search,
  Settings,
  Clock,
  Eye,
  Edit3,
} from 'lucide-react'
import { DocumentCard } from './DocumentCard'
import { NewDocButton } from './NewDocButton'
import { UserAvatar } from './UserAvatar'
import { ProfileModal } from './ProfileModal'
import type { Document, Profile } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Tab = 'mine' | 'shared'

// Shape from supabase join query
type SharedDocRaw = {
  permission: 'view' | 'edit'
  documents: (Document & {
    profiles: { full_name: string | null; avatar_url: string | null } | null
  }) | null
}

interface DashboardClientProps {
  user: User
  profile: Profile | null
  initialDocuments: Document[]
  sharedDocuments: SharedDocRaw[]
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return email[0].toUpperCase()
}

export function DashboardClient({
  user,
  profile,
  initialDocuments,
  sharedDocuments,
}: DashboardClientProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('mine')
  const [profileOpen, setProfileOpen] = useState(false)

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'

  const filteredMine = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  )

  const filteredShared = sharedDocuments
    .filter((s) => s.documents !== null)
    .filter((s) =>
      (s.documents?.title ?? '').toLowerCase().includes(search.toLowerCase())
    )

  const handleDocumentCreated = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev])
    router.push(`/doc/${doc.id}`)
  }

  const handleDocumentDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  const handleDocumentRenamed = (id: string, title: string) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)))
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-bg-subtle flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
            S
          </div>
          <span className="font-semibold text-text">Synapse</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('mine')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === 'mine'
                ? 'bg-primary/10 text-primary-light'
                : 'text-text-muted hover:bg-bg-elevated hover:text-text'
            )}
          >
            <FileText className="w-4 h-4 shrink-0" />
            My Documents
            {documents.length > 0 && (
              <span className="ml-auto text-xs bg-bg-elevated text-text-muted rounded-full px-2 py-0.5">
                {documents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('shared')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === 'shared'
                ? 'bg-primary/10 text-primary-light'
                : 'text-text-muted hover:bg-bg-elevated hover:text-text'
            )}
          >
            <Users className="w-4 h-4 shrink-0" />
            Shared with me
            {sharedDocuments.length > 0 && (
              <span className="ml-auto text-xs bg-primary/20 text-primary-light rounded-full px-2 py-0.5">
                {sharedDocuments.length}
              </span>
            )}
          </button>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <UserAvatar profile={profile} email={user.email!} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">{displayName}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => setProfileOpen(true)}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-text-muted hover:text-text hover:bg-bg-elevated transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-border bg-bg/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-text">
              Good {getGreeting()}, {displayName.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {activeTab === 'mine'
                ? documents.length === 0
                  ? 'Create your first document'
                  : `${documents.length} document${documents.length !== 1 ? 's' : ''} in your workspace`
                : sharedDocuments.length === 0
                ? 'No documents shared with you yet'
                : `${sharedDocuments.length} shared document${sharedDocuments.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {activeTab === 'mine' && (
            <NewDocButton userId={user.id} onCreated={handleDocumentCreated} />
          )}
        </header>

        {/* Content */}
        <div className="flex-1 p-8">
          {/* Search */}
          {(documents.length > 0 || sharedDocuments.length > 0) && (
            <div className="relative mb-6 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search documents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-base pl-10 py-2.5 text-sm"
                id="dashboard-search"
              />
            </div>
          )}

          {/* MY DOCUMENTS TAB */}
          {activeTab === 'mine' && (
            <>
              {filteredMine.length === 0 ? (
                <EmptyState
                  isSearching={search.length > 0}
                  userId={user.id}
                  onCreated={handleDocumentCreated}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                  {filteredMine.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onDeleted={handleDocumentDeleted}
                      onRenamed={handleDocumentRenamed}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* SHARED WITH ME TAB */}
          {activeTab === 'shared' && (
            <>
              {filteredShared.length === 0 ? (
                <SharedEmptyState isSearching={search.length > 0} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                  {filteredShared.map((share) => {
                    const doc = share.documents!
                    const owner = doc.profiles
                    const ownerName = owner?.full_name ?? 'Unknown'
                    return (
                      <Link
                        key={doc.id}
                        href={`/doc/${doc.id}`}
                        className="group block"
                      >
                        <div className="h-full bg-bg-elevated border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-bg-surface transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 flex flex-col gap-3">
                          {/* Title */}
                          <div className="flex-1">
                            <h3 className="text-text font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary-light transition-colors">
                              {doc.title || 'Untitled'}
                            </h3>
                          </div>

                          {/* Permission badge */}
                          <div className="flex items-center gap-1.5">
                            {share.permission === 'edit' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-primary-light bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                                <Edit3 className="w-2.5 h-2.5" /> Can edit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-bg-subtle border border-border rounded-full px-2 py-0.5">
                                <Eye className="w-2.5 h-2.5" /> View only
                              </span>
                            )}
                          </div>

                          {/* Owner */}
                          <div className="flex items-center gap-2 pt-1 border-t border-border">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden">
                              {owner?.avatar_url ? (
                                <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(owner?.full_name ?? null, 'U')
                              )}
                            </div>
                            <span className="text-xs text-text-muted truncate">
                              Shared by {ownerName}
                            </span>
                            <span className="ml-auto shrink-0 flex items-center gap-1 text-xs text-text-muted">
                              <Clock className="w-3 h-3" />
                              {formatDate(doc.updated_at)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Profile Modal */}
      {profileOpen && (
        <ProfileModal
          profile={profile ?? {
            id: user.id,
            email: user.email ?? '',
            full_name: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          }}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  )
}

function EmptyState({
  isSearching,
  userId,
  onCreated,
}: {
  isSearching: boolean
  userId: string
  onCreated: (doc: Document) => void
}) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <Search className="w-10 h-10 text-text-muted mb-4" />
        <p className="text-text font-medium">No documents found</p>
        <p className="text-sm text-text-muted mt-1">Try a different search term</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
        <FileText className="w-9 h-9 text-primary-light" />
      </div>
      <h2 className="text-xl font-semibold text-text mb-2">No documents yet</h2>
      <p className="text-text-muted text-sm mb-8 max-w-xs">
        Create your first document and start writing. Everything syncs automatically.
      </p>
      <NewDocButton userId={userId} onCreated={onCreated} />
    </div>
  )
}

function SharedEmptyState({ isSearching }: { isSearching: boolean }) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <Search className="w-10 h-10 text-text-muted mb-4" />
        <p className="text-text font-medium">No shared documents found</p>
        <p className="text-sm text-text-muted mt-1">Try a different search term</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-bg-elevated flex items-center justify-center mb-6 border border-border">
        <Users className="w-9 h-9 text-text-muted" />
      </div>
      <h2 className="text-xl font-semibold text-text mb-2">Nothing shared yet</h2>
      <p className="text-text-muted text-sm max-w-xs">
        When someone shares a document with you, it will appear here.
      </p>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
