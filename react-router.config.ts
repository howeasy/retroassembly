import path from 'node:path'
import type { Config } from '@react-router/dev/config'
import fs from 'fs-extra'
import { build } from 'tsdown'
import { normalizeBaseUrl } from './src/constants/env.ts'
import { getTargetRuntime } from './scripts/utils.ts'

export default {
  appDirectory: 'src/pages',
  // Router basename for subpath hosting (e.g. /retro). Read from the same env as Vite's base so the
  // client and server router strip the prefix; see utils/server/base-url.ts for the full picture.
  basename: normalizeBaseUrl(process.env.RETROASSEMBLY_RUN_TIME_BASE_URL) || '/',
  buildDirectory: 'dist',
  async buildEnd() {
    if (getTargetRuntime() === 'node') {
      const entries = [
        { entry: 'src/server/node.ts', outDir: 'dist/server' },
        { entry: 'scripts/serve.ts', outDir: 'dist/scripts' },
      ]
      for (const { entry, outDir } of entries) {
        await build({
          alias: { '#@': path.resolve('src') },
          clean: false,
          entry,
          fixedExtension: false,
          logLevel: 'warn',
          outDir,
        })
      }
      await fs.move('dist/scripts', 'dist/server', { overwrite: true })
    }
  },
  future: {
    unstable_optimizeDeps: true,
    v8_middleware: true,
    v8_passThroughRequests: true,
    v8_splitRouteModules: true,
    v8_trailingSlashAwareDataRequests: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config
