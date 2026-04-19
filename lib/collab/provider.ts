/**
 * SocketIOProvider — Y.js provider over Socket.io
 *
 * Connects a Y.Doc to the Synapse Socket.io server.
 * Handles:
 *  - Document sync (full state on join + incremental updates)
 *  - Awareness (cursor positions, user presence)
 *  - Reconnection (rejoins room on reconnect)
 */

import * as Y from 'yjs'
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import { io, Socket } from 'socket.io-client'

// ── Presence colors (deterministic from userId) ─────────────
const COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#DB2777', '#0891B2', '#9333EA',
]

export function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[hash % COLORS.length]
}

export type AwarenessUser = {
  name: string
  color: string
  avatar: string | null
}

export type AwarenessState = {
  user: AwarenessUser
}

// ── Provider class ──────────────────────────────────────────
export class SocketIOProvider {
  readonly doc: Y.Doc
  readonly awareness: Awareness
  readonly socket: Socket
  readonly docId: string

  constructor(
    serverUrl: string,
    docId: string,
    doc: Y.Doc,
    user: { id: string; name: string; avatar: string | null }
  ) {
    this.doc = doc
    this.docId = docId
    this.awareness = new Awareness(doc)

    // Set this client's local state (name + color for cursor)
    this.awareness.setLocalStateField('user', {
      name: user.name,
      color: getUserColor(user.id),
      avatar: user.avatar,
    } satisfies AwarenessUser)

    // ── Connect to Socket.io server ─────────────────────────
    this.socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      // (Re)join the document room on connect / reconnect
      this.socket.emit('join-doc', docId)
    })

    this.socket.on('disconnect', () => {
      // Remove local state from awareness on disconnect
      removeAwarenessStates(this.awareness, [doc.clientID], 'disconnect')
    })

    // ── Doc sync ────────────────────────────────────────────

    // Full state from server (sent on join to sync late joiners)
    this.socket.on('doc-state', (state: number[]) => {
      Y.applyUpdate(doc, new Uint8Array(state), 'server')
    })

    // Incremental update from another client
    this.socket.on('doc-update', (update: number[]) => {
      Y.applyUpdate(doc, new Uint8Array(update), 'remote')
    })

    // Send local doc changes to server (skip updates from remote to avoid echo)
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote' && origin !== 'server') {
        this.socket.emit('doc-update', docId, Array.from(update))
      }
    })

    // ── Awareness (cursors & presence) ─────────────────────

    // Receive awareness update from another client
    this.socket.on('awareness-update', (_from: string, update: number[]) => {
      applyAwarenessUpdate(this.awareness, new Uint8Array(update), 'remote')
    })

    // Broadcast local awareness changes (cursor position, user info)
    this.awareness.on(
      'update',
      ({
        added,
        updated,
        removed,
      }: {
        added: number[]
        updated: number[]
        removed: number[]
      }) => {
        const changed = [...added, ...updated, ...removed]
        const update = encodeAwarenessUpdate(this.awareness, changed)
        this.socket.emit('awareness-update', docId, Array.from(update))
      }
    )
  }

  destroy() {
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy')
    this.awareness.destroy()
    this.socket.disconnect()
  }
}
