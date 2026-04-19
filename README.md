<div align="center">

# ⚡ Synapse

### Real-time collaborative document editor

*Write together. Think together. Build together.*

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Y.js](https://img.shields.io/badge/Y.js_CRDT-FF6B6B?style=for-the-badge)](https://yjs.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Groq](https://img.shields.io/badge/Groq_AI-F55036?style=for-the-badge)](https://groq.com/)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔄 **Real-time collaboration** | Multiple users edit the same document simultaneously, conflict-free |
| 🧠 **CRDT (Y.js)** | Industry-standard Conflict-free Replicated Data Types — same tech as Notion & Figma |
| 🖱️ **Live cursors** | See collaborators' cursor positions in real-time with colored labels |
| 🤖 **AI Writing Assistant** | Llama 3 (via Groq) generates, summarizes, fixes, and expands your writing |
| 🌐 **Public sharing** | Share read-only document links with anyone — no login required |
| 📤 **Export** | Download as Markdown or print to PDF |
| 🔐 **Authentication** | Google OAuth + Email/Password via Supabase Auth |
| 👥 **Permission system** | Share documents with view/edit permissions per collaborator |
| 💾 **Autosave** | Changes persist to Supabase automatically |
| 🔍 **Document search** | Instant search across all your documents |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js 16)                     │
│                                                                   │
│  TipTap Editor                                                    │
│  ├── Collaboration Extension ──── Y.Doc (CRDT state)            │
│  ├── CollaborationCursor ──────── Awareness (live cursors)       │
│  └── AI Modal ─────────────────── Groq API (streaming)           │
│                    │                        │                     │
│            SocketIOProvider           fetch /api/ai               │
└────────────────────┼───────────────────────┼─────────────────────┘
                     │ WebSocket              │ HTTPS
                     ▼                        ▼
┌────────────────────────────┐  ┌─────────────────────────────────┐
│  Socket.io Server          │  │  Next.js API Routes             │
│  (Node.js :3001)           │  │  /api/ai/complete               │
│                            │  │       │                          │
│  • Y.js room management    │  │  Groq SDK (Llama 3.3 70B)       │
│  • CRDT update relay       │  │  Streaming text response        │
│  • Awareness broadcast     │  └─────────────────────────────────┘
└──────────────┬─────────────┘
               │ persist content
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Auth + RLS)                              │
│                                                                   │
│  documents    document_shares    profiles    auth.users          │
│  ─────────    ───────────────    ────────    ──────────          │
│  id           document_id        id          id                  │
│  title        shared_with_id     full_name   email               │
│  content      permission         avatar_url  provider            │
│  owner_id     ─────────────      ─────────   ─────────           │
│  is_public                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) | Server components, streaming, file-based routing |
| **Language** | TypeScript | Type safety across the entire stack |
| **Editor** | TipTap (ProseMirror) | Extensible rich text, Y.js integration |
| **Real-time sync** | Y.js (CRDT) | Conflict-free concurrent editing, offline support |
| **WebSocket server** | Socket.io (Node.js) | Room management, Y.js update relay |
| **Database** | Supabase (PostgreSQL) | Auth, RLS policies, real-time subscriptions |
| **Authentication** | Supabase Auth | Google OAuth + Email/Password |
| **AI** | Groq API (Llama 3.3 70B) | Fast inference, free tier, streaming |
| **Styling** | Tailwind CSS | Utility-first, dark glassmorphism design |

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account (free)
- Groq account (free)

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/synapse.git
cd synapse
npm install
```

### 2. Environment variables

Create `.env.local` in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Socket.io collab server
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Groq AI (free at console.groq.com)
GROQ_API_KEY=your_groq_api_key
```

### 3. Database setup

Run the SQL schema in your Supabase SQL editor:

```bash
# Copy contents of supabase/schema.sql into Supabase SQL editor and run
```

### 4. Run both servers

```bash
npm run dev:all
```

This starts:
- **Next.js** on `http://localhost:3000`
- **Socket.io collab server** on `http://localhost:3001`

> ⚠️ You must run `npm run dev:all` (not just `npm run dev`) for real-time collaboration to work.

---

## 📁 Project Structure

```
synapse/
├── app/
│   ├── (app)/
│   │   ├── dashboard/          # Main dashboard
│   │   └── doc/[id]/           # Document editor page
│   ├── (auth)/
│   │   ├── login/              # Login page
│   │   └── signup/             # Sign up page
│   ├── api/
│   │   └── ai/complete/        # Groq streaming endpoint
│   ├── view/[id]/              # Public read-only document view
│   └── globals.css             # Design system + collaboration cursor styles
├── components/
│   ├── dashboard/              # Dashboard UI components
│   ├── editor/
│   │   ├── EditorShell.tsx     # Main editor (Y.js + Socket.io + TipTap)
│   │   ├── AiModal.tsx         # AI writing assistant modal
│   │   └── ShareModal.tsx      # Document sharing modal
│   └── viewer/
│       └── PublicViewer.tsx    # Read-only document renderer
├── lib/
│   ├── collab/
│   │   └── provider.ts         # Y.js Socket.io provider
│   ├── supabase/               # Supabase client + server utils
│   └── utils.ts                # Shared utilities
├── server/
│   └── index.ts                # Socket.io collaboration server
├── supabase/
│   └── schema.sql              # Full database schema + RLS policies
└── types/
    └── index.ts                # TypeScript type definitions
```

---

## 🔑 Key Technical Decisions

### Why Y.js (CRDT) over Operational Transform?
CRDT (Conflict-free Replicated Data Types) guarantees eventual consistency without a central arbiter. Users can edit offline and their changes merge correctly when reconnected. OT requires a central server to resolve conflicts, making it less resilient.

### Why Socket.io for WebSockets?
Socket.io provides automatic reconnection, room management, and binary message support out of the box — essential for a collaborative editor where clients join/leave frequently.

### RLS Recursion Fix
Supabase Row Level Security policies for `document_shares` caused infinite recursion when checking `documents` ownership. Fixed by creating a `SECURITY DEFINER` function (`is_document_owner`) that bypasses RLS for the ownership check.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---



</div>
