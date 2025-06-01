#!/usr/bin/env -S deno run --allow-read --allow-write

interface Config {
    fmt?: Record<string, unknown>
    lint?: Record<string, unknown>
    imports?: Record<string, unknown>
    compilerOptions?: Record<string, unknown>
    tasks?: Record<string, unknown>
    nodeModulesDir?: string
    [key: string]: unknown
}

function mergeImports(
    baseImports: Record<string, unknown> = {},
    sharedImports: Record<string, unknown> = {},
): Record<string, unknown> {
    return { ...sharedImports, ...baseImports }
}

async function syncSharedConfig() {
    // Read the root deno.json as source of truth for shared config
    const rootConfigText = await Deno.readTextFile('deno.json')
    const rootConfig: Config = JSON.parse(rootConfigText)

    const sectionsToSync = ['fmt', 'lint', 'compilerOptions'] as const
    const missingSharedSections = sectionsToSync.filter((section) => !rootConfig[section])

    if (missingSharedSections.length > 0) {
        console.warn(`⚠️  Missing sections in root deno.json: ${missingSharedSections.join(', ')}`)
    }

    // Define app paths
    const appPaths = [
        'apps/worker',
        'apps/api-fresh',
        // Add more app paths here as needed
    ]

    for (const appPath of appPaths) {
        try {
            // Read the app's base config template
            const baseConfigPath = `${appPath}/base-deno.json`
            const baseConfigText = await Deno.readTextFile(baseConfigPath)
            const baseConfig: Config = JSON.parse(baseConfigText)

            // Start with base config
            const finalConfig: Config = { ...baseConfig }

            // Merge shared sections from root (these override base if present)
            for (const section of sectionsToSync) {
                if (rootConfig[section]) {
                    finalConfig[section] = rootConfig[section]
                }
            }

            // Special handling for imports - merge rather than override
            if (rootConfig.imports || baseConfig.imports) {
                finalConfig.imports = mergeImports(
                    baseConfig.imports as Record<string, unknown>,
                    rootConfig.imports as Record<string, unknown>,
                )
            }

            // Write the final merged config
            const finalConfigPath = `${appPath}/deno.json`
            const updatedConfig = JSON.stringify(finalConfig, null, 4)
            await Deno.writeTextFile(finalConfigPath, updatedConfig + '\n')

            console.log(`✅ Generated ${finalConfigPath} from base template + shared config`)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.warn(`⚠️  Could not process ${appPath}: ${errorMessage}`)
        }
    }

    console.log('\n📋 Merged sections:')
    console.log('  ✅ imports (base + shared)')
    for (const section of sectionsToSync) {
        const status = rootConfig[section] ? '✅' : '❌'
        console.log(`  ${status} ${section} (from shared)`)
    }

    console.log('\n💡 Note: Generated deno.json files should be in .gitignore')
}

if (import.meta.main) {
    await syncSharedConfig()
}
