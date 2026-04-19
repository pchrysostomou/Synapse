'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/types'
import toast from 'react-hot-toast'

interface NewDocButtonProps {
  userId: string
  onCreated: (doc: Document) => void
}

export function NewDocButton({ userId, onCreated }: NewDocButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleCreate = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: 'Untitled',
        owner_id: userId,
        content: null,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to create document')
      setLoading(false)
      return
    }

    onCreated(data)
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      id="new-document-btn"
      className="btn-primary"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Plus className="w-4 h-4" />
      )}
      New document
    </button>
  )
}
