import { z } from "zod"

const ZConfig = z.object({
  bot: z.object({
    token: z.string(),
    webAppUrls: z.object({
      views: z.string(),
      actionArgs: z.string(),
    }),
  }),

  api: z.object({
    baseUrl: z.string(),
    token: z.string(),
  }),

  alerts: z.object({
    alertsPerSecond: z.number(),
    noAlertsIntervalMs: z.number(),
    errorRetryIntervalMs: z.number(),
  }),

  whitelistTelegramIds: z.array(z.number()),
})

type Config = z.infer<typeof ZConfig>

export async function loadConfig(): Promise<Config> {
  const file = Bun.file("config.json")
  const raw = await file.json()
  return ZConfig.parse(raw)
}
