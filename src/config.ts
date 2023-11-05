import { z } from "zod"

const ZConfig = z.object({
  bot: z.object({
    token: z.string(),
    webAppUrls: z.object({
      view: z.string(),
      action: z.string(),
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

  access: z.object({
    /**
     * Users with these Telegram IDs will always have access to the bot.
     */
    whitelistTelegramIds: z.array(z.number()).default(() => []),

    /**
     * Users that are not in the whitelist initially, can be added to it
     * by starting the bot with the secret key (/start <secretKey>).
     */
    secretKey: z.string().nullish(),
  }),
})

export type Config = z.infer<typeof ZConfig>

export async function loadConfig(): Promise<Config> {
  const file = Bun.file("config.json")
  const raw = await file.json()
  return ZConfig.parse(raw)
}
