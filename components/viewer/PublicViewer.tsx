'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'

interface PublicViewerProps {
  document: {
    id: string
    title: string
    content: unknown
    updated_at: string
    profiles: { full_name: string | null; avatar_url: string | null } | null
  }
}

export function PublicViewer({ document }: PublicViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
    ],
    content: (document.content && typeof document.content === 'object' && !Array.isArray(document.content))
      ? (document.content as Record<string, unknown>)
      : undefined,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'tiptap prose-invert focus:outline-none' },
    },
  })

  const owner = document.profiles
  const ownerName = owner?.full_name ?? 'Anonymous'
  const ownerInitials = getInitials(owner?.full_name, ownerName)

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Synapse logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-semibold text-text group-hover:text-primary-light transition-colors">
              Synapse
            </span>
          </Link>

          {/* Open in editor CTA */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Edit in Synapse
          </Link>
        </div>
      </header>

      {/* Document */}
      <main className="max-w-3xl mx-auto px-8 py-12">
        {/* Title */}
        <h1 className="text-3xl font-bold text-text mb-4 leading-tight">
          {document.title || 'Untitled'}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-10 pb-8 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-light overflow-hidden ring-2 ring-primary/20">
            {owner?.avatar_url ? (
              <img src={owner.avatar_url} alt={ownerName} className="w-full h-full object-cover" />
            ) : (
              ownerInitials
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-text">{ownerName}</p>
            <p className="text-xs text-text-muted">
              Last updated {formatDate(document.updated_at)}
            </p>
          </div>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
            🌐 Public
          </span>
        </div>

        {/* Content */}
        <div className="prose-view">
          <EditorContent editor={editor} />
        </div>

        {/* Footer CTA */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-text-muted mb-3">
            Created with <span className="text-primary-light font-medium">Synapse</span> — the real-time collaborative editor
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-all"
          >
            <span>✨</span>
            Start writing for free
          </Link>
        </div>
      </main>
    </div>
  )
}
