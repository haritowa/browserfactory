# Development Scripts

This directory contains helpful scripts for maintaining the Browser Factory monorepo.

## Configuration Architecture

The monorepo uses a **template-based configuration system** to avoid git diffs while sharing common settings:

- **Root `deno.json`** - Source of truth for shared config (`fmt`, `lint`, `imports`, `compilerOptions`)
- **App `base-deno.json`** - App-specific templates (tasks, app-specific imports, etc.) ✅ _Tracked in git_
- **App `deno.json`** - Generated files (merged base + shared config) ❌ _In .gitignore_

## Available Scripts

### `sync-config.ts`

Generates `deno.json` files by merging app templates with shared configuration from root.

**How it works:**

1. Reads `base-deno.json` template for each app
2. Merges shared config from root `deno.json`
3. Generates final `deno.json` (gitignored)

**Merge strategy:**

- `fmt`, `lint`, `compilerOptions` - Overridden by shared config
- `imports` - **Merged** (shared + app-specific, app-specific takes precedence)
- `tasks`, `nodeModulesDir` - Preserved from base template

**Usage:**

```bash
deno task sync-config
```

**When to use:**

- After modifying shared config in root `deno.json`
- After updating app-specific config in `base-deno.json`
- When adding a new app to the monorepo
- Automatically runs when the dev container is created

### `setup-dev.ts`

Comprehensive development environment setup script that:

- Syncs shared configuration
- Checks code formatting
- Runs linting
- Performs type checking
- Shows available development commands

**Usage:**

```bash
deno task setup
```

**When to use:**

- After cloning the repository
- When setting up a new development environment
- To validate your development environment

## Automatic Integration

The `sync-config.ts` script is automatically run when:

1. **Dev container is created** - via `postCreateCommand` in `.devcontainer/devcontainer.json`
2. **Manual sync needed** - via `deno task sync-config`

## Adding New Apps

When adding a new app to the monorepo:

1. Create `apps/your-new-app/base-deno.json` with app-specific config:
   ```json
   {
       "tasks": {
           "dev": "deno run --watch your-app.ts",
           "start": "deno run your-app.ts"
       },
       "imports": {
           "your-lib": "npm:your-lib@1.0.0"
       }
   }
   ```

2. Add the app path to `scripts/sync-config.ts`:
   ```typescript
   const appPaths = [
       'apps/worker',
       'apps/api-fresh',
       'apps/your-new-app', // Add this line
   ]
   ```

3. Run `deno task sync-config` to generate the final `deno.json`

## Configuration Files

### Tracked (in git)

- **Root `deno.json`** - ✏️ Edit shared config here
- **App `base-deno.json`** - ✏️ Edit app-specific config here
- **App templates** - Tasks, app-specific imports, nodeModulesDir

### Generated (gitignored)

- **App `deno.json`** - ❌ Never edit manually, always generated

## Monorepo Structure

```
├── deno.json                       # 📝 Source of truth for shared config
├── .gitignore                      # 🚫 Ignores generated apps/*/deno.json
├── .devcontainer/
│   └── devcontainer.json           # 🔧 Auto-runs sync-config on creation
├── scripts/
│   ├── sync-config.ts              # 🔄 Merges base + shared → deno.json
│   ├── setup-dev.ts               # 🚀 Full dev environment check
│   └── README.md                  # 📚 This documentation
└── apps/
    ├── worker/
    │   ├── base-deno.json          # ✅ App template (tracked)
    │   └── deno.json               # 🤖 Generated (gitignored)
    └── api-fresh/
        ├── base-deno.json          # ✅ App template (tracked)
        └── deno.json               # 🤖 Generated (gitignored)
```

## Benefits

✅ **No git diffs** - Generated files are gitignored\
✅ **Single source of truth** - Shared config in root `deno.json`\
✅ **App-specific flexibility** - Custom tasks, imports per app\
✅ **Automatic sync** - Runs on dev container creation\
✅ **Clean merge strategy** - Smart import merging
