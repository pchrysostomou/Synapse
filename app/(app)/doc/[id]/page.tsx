import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditorShell } from '@/components/editor/EditorShell'
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
    .single()

  return {
    title: data?.title || 'Untitled',
  }
}

export default async function DocPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: document, error }, { data: profile }] = await Promise.all([
    supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single(),
  ])

  if (error || !document) notFound()

  return (
    <EditorShell
      document={document}
      userId={user.id}
      userName={profile?.full_name ?? user.email ?? 'Anonymous'}
      userAvatar={profile?.avatar_url ?? null}
    />
  )
}
