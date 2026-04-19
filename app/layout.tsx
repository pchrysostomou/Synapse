import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Synapse — Collaborative Documents',
    template: '%s | Synapse',
  },
  description:
    'A real-time collaborative document editor. Write, share, and build knowledge together.',
  keywords: ['documents', 'collaboration', 'real-time', 'notes', 'editor'],
  authors: [{ name: 'Synapse' }],
  openGraph: {
    title: 'Synapse — Collaborative Documents',
    description: 'Write, share, and build knowledge together.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#16161f',
              color: '#e2e8f0',
              border: '1px solid #1e1e2e',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#16161f',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#16161f',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
