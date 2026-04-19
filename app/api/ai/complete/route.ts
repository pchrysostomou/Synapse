/**
 * POST /api/ai/complete
 *
 * Groq (Llama 3) streaming endpoint for the AI writing assistant.
 * Receives a prompt + document context, streams the response back
 * as a plain text stream so the editor can insert word-by-word.
 */

import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are an expert writing assistant embedded in Synapse, a collaborative document editor.

Your role:
- Help users write, improve, and expand their content
- Match the style and tone of the existing document context
- Be concise and direct — avoid unnecessary preamble
- Never explain what you're doing, just write the content
- Respond in the same language as the user's prompt`

export async function POST(req: Request) {
  // Auth check — only logged in users can use AI
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY not configured. Add it to .env.local' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { prompt, context, mode } = await req.json() as {
    prompt: string
    context?: string   // surrounding document text for context
    mode?: 'write' | 'summarize' | 'fix' | 'expand'
  }

  const groq = new Groq({ apiKey })

  // Build the user message based on mode
  let userMessage: string
  switch (mode) {
    case 'summarize':
      userMessage = `Summarize the following text concisely:\n\n${context}`
      break
    case 'fix':
      userMessage = `Fix the grammar, spelling, and style of the following text. Return only the corrected text:\n\n${context}`
      break
    case 'expand':
      userMessage = `Expand and enrich the following text with more detail and depth:\n\n${context}`
      break
    default:
      // 'write' mode — free prompt with optional context
      userMessage = context
        ? `Document context (what was written so far):\n"""\n${context}\n"""\n\nContinue writing based on this instruction: ${prompt}`
        : prompt
  }

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    })

    // Stream response as plain text chunks
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: `Groq API error: ${message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
