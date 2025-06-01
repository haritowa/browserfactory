export interface Logger {
    log(message: string): void
    error(error: Error): void
    errorMessage(message: string): void
    warn(message: string): void
    info(message: string): void
    debug(message: string): void
    createChildLogger(scope: string): Logger
}
