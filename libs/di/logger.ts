// Logger DI registrations only
import { AppConfig, LoggerConfig } from '../config/config.ts'
import { Logger } from '../logger/logger.ts'
import { ConsoleLoggerWrapper } from '../logger/console.ts'
import { createInjectorModule } from './di-utility.ts'

// Factory functions for logger
// deno-lint-ignore no-unused-vars
function createLoggerFactory(loggerConfig: LoggerConfig) {
    return (loggerName: string): Logger => {
        return new ConsoleLoggerWrapper(loggerName)
    }
}

// deno-lint-ignore no-unused-vars
function createDefaultLogger(appConfig: AppConfig, loggerConfig: LoggerConfig): Logger {
    return new ConsoleLoggerWrapper(appConfig.name)
}

// CRITICAL: Declare dependencies using .inject property
createLoggerFactory.inject = ['loggerConfig'] as const
createDefaultLogger.inject = ['appConfig', 'loggerConfig'] as const

// Context interfaces for DI
export interface AppConfigContext {
    readonly appConfig: AppConfig
}

export interface LoggerConfigContext {
    readonly loggerConfig: LoggerConfig
}

export interface LoggerContext {
    readonly loggerFactory: (name: string) => Logger
    readonly defaultLogger: Logger
}

// Define the context requirements for logger creation
type LoggerCreationContext = AppConfigContext & LoggerConfigContext

// Create the Logger DI module
export const LoggerModule = createInjectorModule<LoggerCreationContext, LoggerContext>(
    (injector) => {
        return injector
            .provideFactory('loggerFactory', createLoggerFactory)
            .provideFactory('defaultLogger', createDefaultLogger)
    },
)
