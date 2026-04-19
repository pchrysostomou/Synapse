'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Loader2, Wand2, FileText, Wrench, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import toast from 'react-hot-toast'

interface AiModalProps {
  editor: Editor
  onClose: () => void
}

type AiMode = 'write' | 'summarize' | 'fix' | 'expand'

const MODES: { id: AiMode; label: string; icon: React.ReactNode; desc: string; needsSelection: boolean }[] = [
  {
    id: 'write',
    icon: <Wand2 className="w-4 h-4" />,
    label: 'Write',
    desc: 'Generate new content from a prompt',
    needsSelection: false,
  },
  {
    id: 'summarize',
    icon: <FileText className="w-4 h-4" />,
    label: 'Summarize',
    desc: 'Condense selected text',
    needsSelection: true,
  },
  {
    id: 'fix',
    icon: <Wrench className="w-4 h-4" />,
    label: 'Fix writing',
    desc: 'Grammar, spelling & style',
    needsSelection: true,
  },
  {
    id: 'expand',
    icon: <ZoomIn className="w-4 h-4" />,
    label: 'Expand',
    desc: 'Add more detail & depth',
    needsSelection: true,
  },
]

export function AiModal({ editor, onClose }: AiModalProps) {
  const [mode, setMode] = useState<AiMode>('write')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-switch to 'write' when no selection
  const hasSelection = !editor.state.selection.empty

  useEffect(() => {
    if (!hasSelection && mode !== 'write') setMode('write')
  }, [hasSelection, mode])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const getContext = () => {
    if (mode !== 'write') {
      // For edit modes, get selected text
      const { from, to } = editor.state.selection
      return editor.state.doc.textBetween(from, to, ' ')
    }
    // For write mode, get last ~500 chars of document as context
    const fullText = editor.state.doc.textContent
    return fullText.slice(-500)
  }

  const handleSubmit = async () => {
    if (mode === 'write' && !prompt.trim()) return
    setLoading(true)

    const context = getContext()

    try {
      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), context, mode }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'AI request failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      // Insert position: end of selection (or current cursor)
      const insertPos = editor.state.selection.to

      // For edit modes, replace the selection
      if (mode !== 'write' && hasSelection) {
        editor.chain().focus().deleteSelection().run()
      } else {
        // Move cursor to end, add newline
        editor.chain().focus().setTextSelection(insertPos).insertContent('\n').run()
      }

      // Stream text chunks into the editor
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer = decoder.decode(value, { stream: true })
        if (buffer) {
          editor.chain().focus().insertContent(buffer).run()
        }
      }

      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI failed. Check your GROQ_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-scale-in">
        <div className="glass rounded-2xl border border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">AI Writing Assistant</p>
              <p className="text-xs text-text-muted">Powered by Llama 3 via Groq</p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode selector */}
          <div className="flex gap-1 p-3 border-b border-border bg-bg-subtle">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                disabled={m.needsSelection && !hasSelection}
                title={m.needsSelection && !hasSelection ? 'Select text first' : m.desc}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  mode === m.id
                    ? 'bg-primary/20 text-primary-light border border-primary/30'
                    : 'text-text-muted hover:text-text hover:bg-bg-elevated',
                  m.needsSelection && !hasSelection && 'opacity-40 cursor-not-allowed'
                )}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* Prompt input (only for write mode) */}
          {mode === 'write' && (
            <div className="p-4">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                  if (e.key === 'Escape') onClose()
                }}
                placeholder="What should I write? e.g. 'Write an intro about climate change'"
                rows={3}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary/50 resize-none leading-relaxed"
              />
              <p className="text-xs text-text-muted mt-2">
                Press <kbd className="px-1 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">Enter</kbd> to generate · <kbd className="px-1 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">Shift+Enter</kbd> for new line
              </p>
            </div>
          )}

          {/* Selection mode info */}
          {mode !== 'write' && (
            <div className="px-5 py-4">
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-xs text-primary-light">
                <span className="font-medium">{MODES.find(m => m.id === mode)?.label}:</span>{' '}
                {MODES.find(m => m.id === mode)?.desc}.
                <br />
                <span className="text-text-muted mt-1 block">
                  {hasSelection
                    ? `${editor.state.selection.to - editor.state.selection.from} characters selected ✓`
                    : 'Select text in the editor first'}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between px-5 pb-4 gap-3">
            <button onClick={onClose} className="btn-ghost text-sm py-2">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (mode === 'write' && !prompt.trim()) || (mode !== 'write' && !hasSelection)}
              className="btn-primary text-sm py-2 px-5 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
