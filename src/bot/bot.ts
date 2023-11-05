import { z } from "zod"
import { Bot } from "grammy"
import { parseMode } from "@grammyjs/parse-mode"

import type { Ctx } from "./context"
import { messages } from "./messages"
import * as mw from "./middlewares"
import type { MonitoringApi } from "@/api"
import type { Logger } from "@/logger"
import type { Config } from "@/config"

export const ZRunActionWebAppData = z.object({
  actionId: z.string(),
  arguments: z.record(z.string(), z.any()),
})

export type CreateBotOptions = {
  logger: Logger
  api: MonitoringApi
  config: Config
}

export function createBot({
  logger,
  api,
  config,
}: CreateBotOptions): Bot<Ctx> {
  const bot = new Bot<Ctx>(config.bot.token)
  bot.api.config.use(parseMode("HTML"))
  const whitelist = config.access.whitelistTelegramIds

  bot.catch((error) => {
    logger.error("Unhandled error in middleware:", error)
  })

  // Inject dependencies
  bot.use((ctx, next) => {
    ctx.logger = logger
    ctx.monitoring = api
    ctx.messages = messages
    ctx.config = config
    return next()
  })

  // Log updates
  bot.use(mw.updatesLogger)

  // Add users to whitelist after using secret key
  bot
    .chatType("private")
    .command("start", (ctx, next) => {
      if (
        ctx.from
        && ctx.config.access.secretKey
        && ctx.match.trim() === ctx.config.access.secretKey
        && !whitelist.includes(ctx.from.id)
      ) {
        whitelist.push(ctx.from.id)
      }
      return next()
    })

  // Protect bot from unauthorized users
  bot.use((ctx, next) => {
    if (ctx.from) {
      if (!whitelist.includes(ctx.from.id)) {
        return ctx.reply(ctx.messages.accessDenied)
      }
    }
    return next()
  })

  bot.use(mw.start)
  bot.use(mw.actions)
  bot.use(mw.views)
  bot.use(mw.graphs)

  return bot
}
