'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import {
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Sparkles,
  Download,
  FileText,
  Printer,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Document, Json } from '@/types'
import { ShareModal } from './ShareModal'
import { AiModal } from './AiModal'
import { SocketIOProvider, getUserColor } from '@/lib/collab/provider'
import toast from 'react-hot-toast'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001'

// ── Export helpers ────────────────────────────────────────────
function tiptapToMarkdown(doc: Record<string, unknown>): string {
  const lines: string[] = []
  const nodes = (doc.content as { type: string; content?: unknown[]; attrs?: Record<string, unknown>; marks?: { type: string }[]; text?: string }[]) ?? []

  function nodeToMd(node: { type: string; content?: unknown[]; attrs?: Record<string, unknown>; marks?: { type: string }[]; text?: string }, level = 0): string {
    switch (node.type) {
      case 'heading': {
        const text = (node.content as typeof nodes ?? []).map((c) => nodeToMd(c as typeof nodes[0])).join('')
        return '#'.repeat((node.attrs?.level as number) ?? 1) + ' ' + text
      }
      case 'paragraph': {
        const text = (node.content as typeof nodes ?? []).map((c) => nodeToMd(c as typeof nodes[0])).join('')
        return text || ''
      }
      case 'bulletList':
        return (node.content as typeof nodes ?? []).map((c) => nodeToMd(c as typeof nodes[0], level)).join('\n')
      case 'orderedList':
        return (node.content as typeof nodes ?? []).map((c, i) => `${i + 1}. ` + nodeToMd(c as typeof nodes[0]).replace(/^- /, '')).join('\n')
      case 'listItem': {
        const text = (node.content as typeof nodes ?? []).map((c) => nodeToMd(c as typeof nodes[0])).join('')
        return '- ' + text
      }
      case 'blockquote': {
        const text = (node.content as typeof nodes ?? []).map((c) => nodeToMd(c as typeof nodes[0])).join('\n')
        return text.split('\n').map((l) => `> ${l}`).join('\n')
      }
      case 'codeBlock':
        return '```\n' + (node.content as typeof nodes ?? []).map((c) => nodeToMd(c as typeof nodes[0])).join('') + '\n```'
      case 'horizontalRule':
        return '---'
      case 'text': {
        let t = node.text ?? ''
        const marks = node.marks ?? []
        if (marks.some((m) => m.type === 'bold')) t = `**${t}**`
        if (marks.some((m) => m.type === 'italic')) t = `_${t}_`
        if (marks.some((m) => m.type === 'strike')) t = `~~${t}~~`
        if (marks.some((m) => m.type === 'code')) t = `\`${t}\``
        return t
      }
      default:
        return (node.content as typeof nodes ?? []).map((c) => nodeToMd(c as typeof nodes[0])).join('')
    }
  }

  for (const node of nodes) {
    lines.push(nodeToMd(node))
  }

  return lines.join('\n\n')
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface EditorShellProps {
  document: Document
  userId: string
  userName: string
  userAvatar: string | null
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export function EditorShell({ document, userId, userName, userAvatar }: EditorShellProps) {
  const supabase = createClient()

  const [shareOpen, setShareOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [title, setTitle] = useState(document.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [wordCount, setWordCount] = useState(0)
  const [isPublic, setIsPublic] = useState(document.is_public)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [connected, setConnected] = useState(false)

  // ── Y.js document (one per mount, stable) ─────────────────
  const ydoc = useMemo(() => new Y.Doc(), [])

  // ── Socket.io provider — init synchronously (always client, ssr: false) ──
  const [provider] = useState<SocketIOProvider | null>(
    () => new SocketIOProvider(SOCKET_URL, document.id, ydoc, {
      id: userId,
      name: userName,
      avatar: userAvatar,
    })
  )

  const providerRef = useRef(provider)

  // Track socket connection state + cleanup on unmount
  useEffect(() => {
    if (!provider) return
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    provider.socket.on('connect', onConnect)
    provider.socket.on('disconnect', onDisconnect)
    // Cleanup provider on unmount
    return () => {
      provider.socket.off('connect', onConnect)
      provider.socket.off('disconnect', onDisconnect)
      provider.destroy()
    }
  }, [provider])

  // ── Debounced save to Supabase ────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    async (newTitle: string, content: Json | null, newIsPublic?: boolean) => {
      setSaveStatus('saving')
      const { error } = await supabase
        .from('documents')
        .update({
          title: newTitle,
          content,
          is_public: newIsPublic ?? isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id)

      if (error) {
        toast.error('Failed to save')
        setSaveStatus('unsaved')
      } else {
        setSaveStatus('saved')
      }
    },
    [document.id, isPublic, supabase]
  )

  const debouncedSave = useCallback(
    (newTitle: string, content: Json | null) => {
      setSaveStatus('unsaved')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(newTitle, content), 1500)
    },
    [save]
  )

  // ── TipTap editor with Y.js collaboration ─────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: false, // Y.js handles undo/redo
      }),
      Placeholder.configure({
        placeholder: 'Start writing… or press "/" for commands',
      }),
      CharacterCount,
      Typography,

      // ── Collaboration extension (Y.js CRDT) ─────────────
      Collaboration.configure({
        document: ydoc,
        // Uses the fragment named 'default' (standard convention)
      }),

      // ── Live cursors for all connected users ─────────────
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider,
              user: {
                name: userName,
                color: getUserColor(userId),
              },
            }),
          ]
        : []),
    ],

    // Initial content from DB (only applies when Y.Doc is fresh/empty)
    content:
      document.content && typeof document.content === 'object' && !Array.isArray(document.content)
        ? (document.content as Record<string, unknown>)
        : undefined,

    editorProps: {
      attributes: { class: 'tiptap prose-invert focus:outline-none' },
    },

    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      const words = editor.storage.characterCount?.words?.() ?? 0
      setWordCount(words)
      debouncedSave(title, editor.getJSON() as Json)
    },
  })

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    debouncedSave(newTitle, editor?.getJSON() as Json | null ?? null)
  }

  const handleTogglePublic = async () => {
    const next = !isPublic
    setIsPublic(next)
    await save(title, editor?.getJSON() as Json | null ?? null, next)
    toast.success(next ? 'Document is now public' : 'Document is now private')
  }

  // ── Active collaborators from awareness ───────────────────
  const [collaborators, setCollaborators] = useState<
    { name: string; color: string; avatar: string | null }[]
  >([])

  useEffect(() => {
    if (!provider) return
    const updateCollaborators = () => {
      const states = Array.from(provider.awareness.getStates().entries())
        .filter(([clientId]) => clientId !== ydoc.clientID)
        .map(([, state]) => state.user)
        .filter(Boolean)
      setCollaborators(states)
    }
    provider.awareness.on('change', updateCollaborators)
    return () => provider.awareness.off('change', updateCollaborators)
  }, [provider, ydoc.clientID])

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'k') {
        e.preventDefault()
        setAiOpen(true)
      }
      if (ctrl && e.key === 's') {
        e.preventDefault()
        if (saveTimer.current) clearTimeout(saveTimer.current)
        save(title, editor?.getJSON() as Json | null ?? null)
        toast.success('Saved!', { duration: 1200, icon: '✓' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [title, editor, save])

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-4 px-6 py-3 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors group shrink-0"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Dashboard
        </Link>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent text-text font-semibold text-sm placeholder:text-text-muted outline-none truncate"
            aria-label="Document title"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Connection indicator */}
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              connected ? 'text-success' : 'text-text-muted'
            )}
            title={connected ? 'Connected — real-time sync active' : 'Connecting…'}
          >
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
          </span>

          {/* Live collaborator avatars (from Y.js awareness) */}
          {collaborators.length > 0 && (
            <div className="flex -space-x-2">
              {collaborators.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  title={c.name}
                  className="w-6 h-6 rounded-full ring-2 ring-bg flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                  style={{ backgroundColor: c.color }}
                >
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    c.name.slice(0, 2).toUpperCase()
                  )}
                </div>
              ))}
              {collaborators.length > 5 && (
                <div className="w-6 h-6 rounded-full ring-2 ring-bg bg-bg-elevated flex items-center justify-center text-[10px] text-text-muted">
                  +{collaborators.length - 5}
                </div>
              )}
            </div>
          )}

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-text-muted animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-success">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {saveStatus === 'unsaved' && <span className="text-warning">Unsaved</span>}
          </div>

          {/* Word count */}
          <span className="text-xs text-text-muted hidden sm:block">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>

          {/* Toolbar toggle */}
          <button
            onClick={() => setToolbarVisible(!toolbarVisible)}
            className="btn-ghost py-1.5 px-3 text-xs"
            title="Toggle toolbar"
          >
            {toolbarVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* ✨ AI button */}
          <button
            onClick={() => setAiOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/60 transition-all font-medium"
            title="AI Writing Assistant (Llama 3)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-text-muted hover:text-text hover:border-border-strong transition-all"
              title="Export document"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 glass border border-border rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in"
                onMouseLeave={() => setExportOpen(false)}
              >
                <button
                  onClick={() => {
                    const json = editor?.getJSON()
                    if (!json) return
                    const md = tiptapToMarkdown(json as Record<string, unknown>)
                    downloadFile(`${title || 'document'}.md`, md, 'text/markdown')
                    setExportOpen(false)
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-xs text-text-muted hover:text-text hover:bg-bg-elevated transition-all text-left"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  Download Markdown
                </button>
                <button
                  onClick={() => {
                    window.print()
                    setExportOpen(false)
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-xs text-text-muted hover:text-text hover:bg-bg-elevated transition-all text-left border-t border-border"
                >
                  <Printer className="w-4 h-4 text-green-400" />
                  Print / Save PDF
                </button>
              </div>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary-light hover:bg-primary/20 hover:border-primary/60 transition-all font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share
          </button>

          {/* Public toggle */}
          <button
            onClick={handleTogglePublic}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all',
              isPublic
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text'
            )}
          >
            {isPublic ? '🌐 Public' : '🔒 Private'}
          </button>
        </div>
      </header>

      {/* Formatting toolbar */}
      {toolbarVisible && editor && (
        <div className="sticky top-[57px] z-10 flex flex-wrap items-center gap-0.5 px-6 py-2 border-b border-border bg-bg-subtle animate-fade-in overflow-x-auto">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
            <Code className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <span className="text-xs font-bold">H1</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
            <Minus className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-12">
        <EditorContent editor={editor} />
      </div>

      {/* Share Modal */}
      {shareOpen && (
        <ShareModal
          documentId={document.id}
          documentTitle={title}
          ownerId={document.owner_id}
          currentUserId={userId}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* AI Modal */}
      {aiOpen && editor && (
        <AiModal editor={editor} onClose={() => setAiOpen(false)} />
      )}
    </div>
  )
}

function ToolbarButton({
  children, onClick, active, disabled, title,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all',
        active ? 'bg-primary/20 text-primary-light' : 'text-text-muted hover:bg-bg-elevated hover:text-text',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-text-muted'
      )}
    >
      {children}
    </button>
  )
}
