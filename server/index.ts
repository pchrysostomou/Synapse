/**
 * Synapse — Socket.io Collaboration Server
 * Runs on port 3001 alongside Next.js (port 3000)
 *
 * Architecture:
 *  - Each document = a Socket.io "room" (keyed by doc UUID)
 *  - Y.js updates flow:  client → server → all other clients in room
 *  - Awareness (cursors):  client → server → all other clients in room
 *  - Y.Doc state kept in-memory per room for reconnecting clients
 */

import { createServer } from 'http'
import { Server } from 'socket.io'
import * as Y from 'yjs'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})

// ── In-memory Y.Doc store ───────────────────────────────────
// docId → Y.Doc (persists as long as server is running)
const docs = new Map<string, Y.Doc>()

function getDoc(docId: string): Y.Doc {
  if (!docs.has(docId)) {
    docs.set(docId, new Y.Doc())
  }
  return docs.get(docId)!
}

// ── Socket.io events ────────────────────────────────────────
io.on('connection', (socket) => {
  let currentRoom: string | null = null

  console.log(`🔌 [${socket.id}] connected`)

  /**
   * join-doc: Client enters a document room
   * Sends back the current Y.Doc state so late joiners catch up
   */
  socket.on('join-doc', (docId: string) => {
    if (currentRoom) socket.leave(currentRoom)
    currentRoom = docId
    socket.join(docId)

    // Send current full doc state (so late joiners are in sync)
    const doc = getDoc(docId)
    const state = Y.encodeStateAsUpdate(doc)
    socket.emit('doc-state', Array.from(state))

    // Alert others in the room
    socket.to(docId).emit('peer-joined', socket.id)
    console.log(`📄 [${socket.id}] joined room: ${docId}`)
  })

  /**
   * doc-update: Incremental Y.js CRDT update from a client
   * Apply to server Y.Doc, relay to all other clients in room
   */
  socket.on('doc-update', (docId: string, update: number[]) => {
    const doc = getDoc(docId)
    Y.applyUpdate(doc, new Uint8Array(update))
    // Relay to everyone except sender
    socket.to(docId).emit('doc-update', update)
  })

  /**
   * awareness-update: Cursor position / user presence state
   * Just relay — server doesn't need to understand awareness
   */
  socket.on('awareness-update', (docId: string, update: number[]) => {
    socket.to(docId).emit('awareness-update', socket.id, update)
  })

  socket.on('disconnect', () => {
    if (currentRoom) {
      io.to(currentRoom).emit('peer-disconnected', socket.id)
    }
    console.log(`❌ [${socket.id}] disconnected`)
  })
})

// ── Start server ────────────────────────────────────────────
const PORT = Number(process.env.SOCKET_PORT ?? 3001)
httpServer.listen(PORT, () => {
  console.log(`\n🟢 Synapse Socket.io server running on :${PORT}`)
  console.log(`   CORS allowed from: ${process.env.CLIENT_URL ?? 'http://localhost:3000'}\n`)
})
