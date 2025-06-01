#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

async function runCommand(cmd: string, args: string[] = []) {
    console.log(`🚀 Running: ${cmd} ${args.join(' ')}`)
    const command = new Deno.Command(cmd, { args })
    const { code, stdout, stderr } = await command.output()

    if (code !== 0) {
        console.error(`❌ Command failed with code ${code}`)
        console.error(new TextDecoder().decode(stderr))
        return false
    }

    const output = new TextDecoder().decode(stdout)
    if (output.trim()) {
        console.log(output)
    }
    return true
}

async function setupDev() {
    console.log('🔧 Setting up development environment...\n')

    // 1. Sync shared configuration
    console.log('📝 Syncing shared configuration (fmt, lint, imports, compilerOptions)...')
    const syncSuccess = await runCommand('deno', ['task', 'sync-config'])
    if (!syncSuccess) {
        console.error('❌ Failed to sync shared configuration')
        return
    }

    // 2. Check formatting across all apps
    console.log('\n✨ Checking code formatting...')
    const fmtSuccess = await runCommand('deno', ['fmt', '--check'])
    if (!fmtSuccess) {
        console.log('⚠️  Some files need formatting. Run `deno fmt` to fix them.')
    }

    // 3. Run linting
    console.log('\n🔍 Running linter...')
    const lintSuccess = await runCommand('deno', ['lint'])
    if (!lintSuccess) {
        console.log('⚠️  Linting issues found. Please fix them.')
    }

    // 4. Type check
    console.log('\n🔍 Type checking...')
    const typeSuccess = await runCommand('deno', ['check', 'apps/**/*.ts', 'libs/**/*.ts', 'scripts/**/*.ts'])
    if (!typeSuccess) {
        console.log('⚠️  Type errors found. Please fix them.')
    }

    console.log('\n✅ Development environment setup complete!')
    console.log('\n📚 Available commands:')
    console.log('  • deno task sync-config  - Sync shared config (fmt, lint, imports, compilerOptions)')
    console.log('  • deno task format       - Format all code')
    console.log('  • deno task lint         - Run linter')
    console.log('  • deno task check        - Full check (format + lint + types)')
    console.log('  • cd apps/worker && deno task dev  - Start worker dev mode')
    console.log('  • cd apps/api-fresh && deno task dev  - Start API dev mode')
}

if (import.meta.main) {
    await setupDev()
}
