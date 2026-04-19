/**
 * /view/[id] — Public read-only document view
 * No authentication required. Only works for is_public = true documents.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicViewer } from '@/components/viewer/PublicViewer'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('title')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!data) return { title: 'Document not found' }

  return {
    title: `${data.title} — Synapse`,
    description: 'View this document on Synapse',
  }
}

export default async function ViewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch public document (no auth — RLS allows public docs)
  const { data: document, error } = await supabase
    .from('documents')
    .select('*, profiles!documents_owner_id_fkey(full_name, avatar_url)')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !document) notFound()

  return <PublicViewer document={document} />
}
