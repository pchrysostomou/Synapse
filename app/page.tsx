import Link from 'next/link'
import { ArrowRight, Zap, Users, Lock, GitBranch } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Real-time collaboration',
    description: 'Edit together with zero latency. See cursors, selections, and changes as they happen.',
  },
  {
    icon: Users,
    title: 'Team workspaces',
    description: 'Organize documents by team. Share with granular view and edit permissions.',
  },
  {
    icon: Lock,
    title: 'Built-in privacy',
    description: 'Row-level security on every document. Only you see what\'s yours.',
  },
  {
    icon: GitBranch,
    title: 'Version history',
    description: 'Every change is tracked. Roll back to any point in your document\'s history.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border/50 glass">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="font-semibold text-text">Synapse</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary-light text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse" />
            Real-time collaboration powered by CRDTs
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
            Think together,{' '}
            <span className="gradient-text">build together</span>
          </h1>

          <p className="text-lg md:text-xl text-text-subtle max-w-2xl mx-auto mb-10 leading-relaxed">
            Synapse is a collaborative document editor where ideas connect in real time.
            No lag. No conflicts. No limits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary px-8 py-3.5 text-base">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-ghost px-8 py-3.5 text-base">
              Sign in to your workspace
            </Link>
          </div>
        </div>

        {/* Preview mockup */}
        <div className="relative mt-20 w-full max-w-4xl animate-slide-up">
          <div className="glass rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-subtle">
              <div className="w-3 h-3 rounded-full bg-error/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <div className="flex-1 flex justify-center">
                <div className="h-5 w-48 rounded-md bg-bg-elevated" />
              </div>
            </div>
            <div className="p-8 space-y-4 min-h-[280px]">
              <div className="h-8 w-2/3 rounded-lg bg-bg-elevated" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-bg-elevated" />
                <div className="h-4 w-5/6 rounded bg-bg-elevated" />
                <div className="h-4 w-4/5 rounded bg-bg-elevated" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded bg-bg-elevated opacity-70" />
                <div className="h-4 w-3/4 rounded bg-bg-elevated opacity-70" />
              </div>
              {/* Fake cursors */}
              <div className="flex gap-2 pt-2">
                <div className="h-5 w-20 rounded bg-primary/20 border border-primary/40 flex items-center px-2">
                  <div className="w-0.5 h-3 bg-primary rounded" />
                </div>
                <div className="h-5 w-16 rounded bg-success/20 border border-success/40 flex items-center px-2">
                  <div className="w-0.5 h-3 bg-success rounded" />
                </div>
              </div>
            </div>
          </div>
          {/* Bottom gradient fade */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl border border-border bg-bg-surface hover:border-primary/40 hover:bg-bg-elevated transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-muted flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary-light" />
                  </div>
                  <h3 className="font-semibold text-text mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-subtle leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border text-center">
        <p className="text-sm text-text-muted">
          Built with Next.js, Supabase, TipTap & Y.js ·{' '}
          <span className="text-text-subtle">Synapse © 2026</span>
        </p>
      </footer>
    </div>
  )
}
