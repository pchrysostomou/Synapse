'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreHorizontal, Trash2, Edit3, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import type { Document } from '@/types'
import toast from 'react-hot-toast'

interface DocumentCardProps {
  document: Document
  onDeleted: (id: string) => void
  onRenamed: (id: string, title: string) => void
}

export function DocumentCard({ document, onDeleted, onRenamed }: DocumentCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(document.title)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = createClient()

  const handleRename = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === document.title) {
      setIsRenaming(false)
      setRenameValue(document.title)
      return
    }

    const { error } = await supabase
      .from('documents')
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq('id', document.id)

    if (error) {
      toast.error('Failed to rename document')
      setRenameValue(document.title)
    } else {
      onRenamed(document.id, trimmed)
      toast.success('Renamed')
    }
    setIsRenaming(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    if (!confirm(`Delete "${document.title}"? This cannot be undone.`)) {
      setIsDeleting(false)
      return
    }

    const { error } = await supabase.from('documents').delete().eq('id', document.id)

    if (error) {
      toast.error('Failed to delete document')
      setIsDeleting(false)
    } else {
      onDeleted(document.id)
    }
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-border bg-bg-surface p-5',
        'hover:border-primary/40 hover:bg-bg-elevated transition-all duration-200',
        'cursor-pointer',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
      onClick={() => !menuOpen && !isRenaming && router.push(`/doc/${document.id}`)}
    >
      {/* Doc emoji */}
      <div className="text-2xl mb-3">📝</div>

      {/* Title */}
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') {
              setIsRenaming(false)
              setRenameValue(document.title)
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent border-b border-primary text-text font-medium text-sm outline-none pb-0.5"
        />
      ) : (
        <h3 className="font-medium text-text text-sm mb-1 line-clamp-2 leading-snug">
          {document.title || 'Untitled'}
        </h3>
      )}

      {/* Meta */}
      <p className="text-xs text-text-muted mt-2">
        {formatDate(document.updated_at)}
      </p>

      {/* Visibility badge */}
      {document.is_public && (
        <span className="absolute top-3 right-10 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
          Public
        </span>
      )}

      {/* Actions menu */}
      <div
        className="absolute top-3 right-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg text-text-muted',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-bg-elevated hover:text-text',
            menuOpen && 'opacity-100 bg-bg-elevated text-text'
          )}
          aria-label="Document options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-border bg-bg-elevated shadow-xl shadow-black/40 py-1 animate-scale-in">
              <Link
                href={`/doc/${document.id}`}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-subtle hover:text-text hover:bg-bg-surface transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setIsRenaming(true)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-subtle hover:text-text hover:bg-bg-surface transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Rename
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  handleDelete()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
