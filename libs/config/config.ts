// Configuration interfaces and implementations (no DI here)

export interface AppConfig {
    name: string
    version: string
}

export interface LoggerConfig {
    level: string
    format: string
}

export interface ConfigProvider {
    getAppConfig(): AppConfig
    getLoggerConfig(): LoggerConfig
}

export class StubConfigProvider implements ConfigProvider {
    getAppConfig(): AppConfig {
        return {
            name: 'BrowserFactory',
            version: '1.0.0',
        }
    }

    getLoggerConfig(): LoggerConfig {
        return {
            level: 'info',
            format: 'text',
        }
    }
}
