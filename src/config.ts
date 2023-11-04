import { z } from "zod"

const ZConfig = z.object({
  botToken: z.string(),

  api: z.object({
    baseUrl: z.string(),
    token: z.string(),
  }),

  queryWebAppUrl: z.string(),
  runCommandArgumentsFormWebAppUrl: z.string(),
  whiteListTelegramIds: z.array(z.number()),
})

type Config = z.infer<typeof ZConfig>

export async function loadConfig(): Promise<Config> {
  const file = Bun.file("config.json")
  const raw = await file.json()
  return ZConfig.parse(raw)
}