import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { attemptAsync } from 'es-toolkit'
import fs from 'fs-extra'
import { getRuntimeKey } from 'hono/adapter'
import isDocker from 'is-docker'
import { getDirectories, getRunTimeEnv } from '../../../constants/env.ts'
import { createDrizzle } from '../drizzle.ts'
import { isSharedLibraryEnabled } from '../shared-rom.ts'
import { enrichSharedRomsMetadata, scanSharedRoms } from './scan-shared-roms.ts'

async function testDataDirectory() {
  const { dataDirectory } = getDirectories()
  const dataDirectoryExists = await fs.exists(dataDirectory)
  if (dataDirectoryExists) {
    return
  }

  const errorMessages = [`Data directory ${dataDirectory} does not exist.`]
  if (isDocker()) {
    errorMessages.push(
      `As you are using Docker, make sure to mount the data directory with "--volume <data_directory_path>:${dataDirectory}".`,
    )
  }
  for (const errorMessage of errorMessages) {
    console.error(errorMessage)
  }
  const errorMessage = errorMessages.join('\n')
  throw new Error(errorMessage)
}

function migrateDatabase() {
  const db = createDrizzle().library
  migrate(db, {
    migrationsFolder: 'src/databases/migrations',
    migrationsSchema: 'src/databases/schema.ts',
  })
}

async function indexSharedRoms() {
  if (!isSharedLibraryEnabled()) {
    return
  }

  // Phase 1: reconcile shared ROM rows with the mounted directory. Awaited so the library is
  // populated before the server accepts requests; cheap because it never reads file contents.
  const [scanError] = await attemptAsync(scanSharedRoms)
  if (scanError) {
    console.error('Failed to scan the shared ROM library:', scanError)
    return
  }

  // Phase 2: enrich metadata in the background. Deliberately not awaited so a large library does
  // not delay startup; fully wrapped so an unhandled rejection can never crash the process.
  void enrichSharedRomsMetadata().catch((error: unknown) => {
    console.error('Failed to enrich shared ROM metadata:', error)
  })

  startSharedRomAutoRefresh()
}

/**
 * Periodically re-scan the shared ROM directory so files added or removed on the host are picked up
 * without restarting the server. Controlled by RETROASSEMBLY_RUN_TIME_SHARED_ROM_SCAN_INTERVAL
 * (seconds; <= 0 disables). Re-scans never overlap and the timer is unref'd so it never keeps the
 * process alive on its own.
 */
function startSharedRomAutoRefresh() {
  const intervalSeconds = Number.parseInt(getRunTimeEnv().RETROASSEMBLY_RUN_TIME_SHARED_ROM_SCAN_INTERVAL, 10)
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return
  }

  let running = false
  const timer = setInterval(async () => {
    if (running) {
      return
    }
    running = true
    const [scanError] = await attemptAsync(scanSharedRoms)
    if (scanError) {
      console.error('Scheduled shared ROM rescan failed:', scanError)
    }
    const [enrichError] = await attemptAsync(enrichSharedRomsMetadata)
    if (enrichError) {
      console.error('Scheduled shared ROM enrichment failed:', enrichError)
    }
    running = false
  }, intervalSeconds * 1000)
  timer.unref?.()
}

async function main() {
  if (getRuntimeKey() !== 'node') {
    return
  }

  await testDataDirectory()
  migrateDatabase()
  await indexSharedRoms()
}

await main()
