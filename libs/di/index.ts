import { createConfigInjector } from './config.ts'
import { LoggerModule } from './logger.ts'

// Export DI-specific things
export * from './config.ts'
export * from './logger.ts'
export * from './di-utility.ts'

// Re-export business logic modules for convenience
export * from '../config/config.ts'
export * from '../logger/logger.ts'
export * from '../logger/console.ts'

// Main injector creation function that chains all modules
export function createBaseInjector() {
    // Start with the base configuration injector
    const configInjector = createConfigInjector()

    // Extend with the logger module
    const loggerInjector = LoggerModule.extend(configInjector)

    // Future modules can be chained here:
    // const queueInjector = QueueModule.extend(loggerInjector)
    // const dbInjector = DatabaseModule.extend(queueInjector)

    return loggerInjector
}

// Type helper to get the final injector type
export type AppBaseInjector = ReturnType<typeof createBaseInjector>
