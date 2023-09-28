import { Client } from '@elastic/elasticsearch'

export function log(msg: string, {
    level = 'INFO'
}: {
    level?: 'WARN' | 'INFO' | 'ERROR'
} = {}): void {
    console.log(`[geoarq ${level}]:`, msg)
}

export function timedLog(msgGen: (t: number) => string, {
    intervalMs = 1000,
    times = 3,
}: {
    intervalMs?: number
    times?: number
} = {}): Promise<void> {
    return new Promise((res, rej) => {
        let current = 0
        const id = setInterval(() => {
            log(msgGen(times))
            times++
        }, intervalMs)
    })
}

export async function createIndexIfNotExists(index: string, client: Client) {
  const indexExists = await client.indices.exists({ index })

  const destructive = process.argv.includes('--destructive')
  
  if (indexExists) {
    console.log('[geoarq] ERROR: index already exists')

    if (destructive) {
      // timedLog
      console.log('[geoarq] WARN: destroying index...')
      await client.indices.delete({ index })
    } else {
      return
    }
  }

  console.log('[geoarq] WARN: creating index...')
  await client.indices.create({ index })
}