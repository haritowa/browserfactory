import { Handlers } from '$fresh/server.ts'
import { QueueClient } from '../../../libs/queue/client.ts'
import { createErrorResponse, getRequiredEnvVar, isValidSessionId } from '../../../libs/shared.ts'

const queueClient = new QueueClient(getRequiredEnvVar('REDIS_URL'))

export const handler: Handlers = {
    async POST(req) {
        try {
            const body = await req.json().catch(() => ({}))
            const sessionId = body.sessionId

            if (!sessionId) {
                return new Response(
                    JSON.stringify(
                        createErrorResponse(
                            'Missing sessionId in request body',
                            'MISSING_SESSION_ID',
                        ),
                    ),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                )
            }

            if (!isValidSessionId(sessionId)) {
                return new Response(
                    JSON.stringify(
                        createErrorResponse(
                            'Invalid sessionId format',
                            'INVALID_SESSION_ID',
                        ),
                    ),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                )
            }

            // Check if session exists first
            const status = await queueClient.getJobStatus(sessionId)
            if (!status) {
                return new Response(
                    JSON.stringify(
                        createErrorResponse('Session not found', 'SESSION_NOT_FOUND'),
                    ),
                    {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                )
            }

            // Add termination job to queue
            await queueClient.addTerminationJob(sessionId)

            return new Response(
                JSON.stringify({
                    sessionId,
                    status: 'termination_requested',
                    message: 'Browser termination request queued',
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
            console.error('Error terminating session:', error)

            return new Response(
                JSON.stringify(
                    createErrorResponse(
                        'Failed to terminate session',
                        'TERMINATION_FAILED',
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
