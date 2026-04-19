import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Synapse workspace',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: documents }, { data: sharedRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false }),
    // Shared with me: document_shares → documents + owner profile
    supabase
      .from('document_shares')
      .select('permission, documents(*, profiles!documents_owner_id_fkey(full_name, avatar_url))')
      .eq('user_id', user.id),
  ])

  return (
    <DashboardClient
      user={user}
      profile={profile}
      initialDocuments={documents ?? []}
      sharedDocuments={sharedRaw ?? []}
    />
  )
}
