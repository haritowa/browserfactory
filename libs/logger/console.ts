import { Logger } from './logger.ts'

export class ConsoleLoggerWrapper implements Logger {
    constructor(private readonly _scope: string) {}

    log(message: string): void {
        console.log(`[${this._scope}] ${message}`)
    }

    error(error: Error): void {
        console.error(`[${this._scope}] ERROR:`, error.message, { error })
    }

    errorMessage(message: string): void {
        console.error(`[${this._scope}] ERROR: ${message}`)
    }

    warn(message: string): void {
        console.warn(`[${this._scope}] WARN: ${message}`)
    }

    info(message: string): void {
        console.info(`[${this._scope}] INFO: ${message}`)
    }

    debug(message: string): void {
        console.debug(`[${this._scope}] DEBUG: ${message}`)
    }

    createChildLogger(scope: string): Logger {
        return new ConsoleLoggerWrapper(`${this._scope}:${scope}`)
    }
}
