// Shared utilities and constants across the browser factory project

export const CONFIG = {
    DEFAULT_TIMEOUT: 300000, // 5 minutes
    BROWSER_PORT_RANGE: {
        start: 9222,
        end: 9322,
    },
    MAX_CONCURRENT_BROWSERS: 10,
    BROWSER_IMAGE: 'browserless/chrome:latest',
    DEFAULT_VIEWPORT: {
        width: 1920,
        height: 1080,
    },
} as const

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Finds an available port in the configured range
 */
export function findAvailablePort(usedPorts: Set<number>): number {
    for (
        let port = CONFIG.BROWSER_PORT_RANGE.start;
        port <= CONFIG.BROWSER_PORT_RANGE.end;
        port++
    ) {
        if (!usedPorts.has(port)) {
            return port
        }
    }
    throw new Error('No available ports in the configured range')
}

/**
 * Validates a session ID format
 */
export function isValidSessionId(sessionId: string): boolean {
    return /^session_\d+_[a-z0-9]{9}$/.test(sessionId)
}

/**
 * Creates a standardized error response
 */
export interface ErrorResponse {
    error: string
    code: string
    // deno-lint-ignore no-explicit-any
    details?: any
}

export function createErrorResponse(
    error: string,
    code: string,
    // deno-lint-ignore no-explicit-any
    details?: any,
): ErrorResponse {
    return { error, code, details }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number
        baseDelay?: number
        maxDelay?: number
    } = {},
): Promise<T> {
    const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = options

    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error as Error

            if (attempt === maxAttempts) {
                throw lastError
            }

            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
            await sleep(delay)
        }
    }

    throw lastError!
}

/**
 * Validates environment variables
 */
export function getRequiredEnvVar(name: string): string {
    const value = Deno.env.get(name)
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set`)
    }
    return value
}

export function getEnvVar(name: string, defaultValue: string): string {
    return Deno.env.get(name) ?? defaultValue
}
