/**
 * Webhook dispatcher — sends signed HTTP POST to all registered webhook URLs
 * for a given user + event. Includes HMAC-SHA256 signature in X-Yelha-Signature.
 */
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export type WebhookEvent =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.expired'
  | 'client.created'
  | 'client.updated'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string   // ISO 8601
  data: Record<string, unknown>
}

export function signPayload(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Dispatch a webhook event to all active subscribers for the given user.
 * Fire-and-forget (non-blocking) — errors are never thrown.
 */
export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId, isActive: true, events: { has: event } },
      select: { id: true, url: true, secret: true },
    })

    if (webhooks.length === 0) return

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }
    const body = JSON.stringify(payload)

    await Promise.allSettled(
      webhooks.map(async (wh) => {
        const signature = signPayload(wh.secret, body)
        try {
          const res = await fetch(wh.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Yelha-Signature': `sha256=${signature}`,
              'X-Yelha-Event': event,
              'X-Yelha-Delivery': crypto.randomUUID(),
            },
            body,
            signal: AbortSignal.timeout(10_000),
          })
          prisma.webhook.update({
            where: { id: wh.id },
            data: { lastTriggeredAt: new Date() },
          }).catch(() => {})
          return res
        } catch {
          // Delivery failure — silently ignore (fire-and-forget)
        }
      })
    )
  } catch {
    // Never let webhook dispatch crash the main request
  }
}
