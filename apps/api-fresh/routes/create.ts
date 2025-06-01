import { Handlers } from '$fresh/server.ts'
import { QueueClient } from '../../../libs/queue/client.ts'
import { JobPayload } from '../../../libs/queue/types.ts'
import { createErrorResponse, generateSessionId, getRequiredEnvVar } from '../../../libs/shared.ts'

const queueClient = new QueueClient(getRequiredEnvVar('REDIS_URL'))

export const handler: Handlers = {
    async POST(req) {
        try {
            const body = await req.json().catch(() => ({}))

            const sessionId = generateSessionId()
            const now = Date.now()

            const payload: JobPayload = {
                sessionId,
                browserConfig: {
                    viewport: body.viewport || { width: 1920, height: 1080 },
                    userAgent: body.userAgent,
                    headless: body.headless !== false, // default to true
                },
                timeout: body.timeout || 300000, // 5 minutes default
                createdAt: now,
            }

            await queueClient.addBrowserJob(payload)

            return new Response(
                JSON.stringify({
                    sessionId,
                    status: 'accepted',
                    message: 'Browser creation request queued',
                }),
                {
                    status: 202,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    },
                },
            )
        } catch (error) {
            console.error('Error creating browser request:', error)

            return new Response(
                JSON.stringify(
                    createErrorResponse(
                        'Failed to create browser request',
                        'CREATION_FAILED',
                        error.message,
                    ),
                ),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                },
            )
        }
    },

    // Handle CORS preflight
    OPTIONS() {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        })
    },
}
