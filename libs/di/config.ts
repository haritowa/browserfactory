// Configuration DI registrations only
import { createInjector } from 'typed-inject'
import { AppConfig, ConfigProvider, LoggerConfig, StubConfigProvider } from '../config/config.ts'

// Factory functions for configuration
function appConfigFactory(configProvider: ConfigProvider): AppConfig {
    return configProvider.getAppConfig()
}

function loggerConfigFactory(configProvider: ConfigProvider): LoggerConfig {
    return configProvider.getLoggerConfig()
}

// CRITICAL: Declare dependencies using .inject property
appConfigFactory.inject = ['configProvider'] as const
loggerConfigFactory.inject = ['configProvider'] as const

// Create the base configuration injector
export function createConfigInjector() {
    return createInjector()
        .provideClass('configProvider', StubConfigProvider)
        .provideFactory('appConfig', appConfigFactory)
        .provideFactory('loggerConfig', loggerConfigFactory)
}
