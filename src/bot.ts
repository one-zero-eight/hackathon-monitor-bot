import { z } from "zod"
import type { Api, Context, RawApi } from "grammy"
import { Bot, InlineKeyboard } from "grammy"
import { parseMode } from "@grammyjs/parse-mode"

import type { Action, MonitoringApi, View } from "./api"
import type { Logger } from "./logger"
import * as msg from "@/bot/messages"

export const ZRunActionWebAppData = z.object({
  actionId: z.string(),
  arguments: z.record(z.string(), z.any()),
})

export async function sendActionsMessage({
  messageText,
  botApi,
  chatId,
  editMessageId,
  actions,
}: {
  messageText: string
  botApi: Api<RawApi>
  chatId: string | number
  editMessageId?: number
  actions: Action[]
}) {
  const keyboard = new InlineKeyboard()
  actions.forEach((action, i) => {
    if (i > 0) {
      keyboard.row()
    }
    keyboard.text(action.title, `action:${action.alias}`)
  })

  if (editMessageId) {
    await botApi.editMessageText(
      chatId,
      editMessageId,
      messageText,
      {
        reply_markup: keyboard,
      },
    )
  } else {
    await botApi.sendMessage(
      chatId,
      messageText,
      {
        reply_markup: keyboard,
      },
    )
  }
}

async function sendViews({
  messageText,
  ctx,
  chatId,
  editMessageId,
  views,
  getViewWebAppUrl,
}: {
  messageText: string
  ctx: Context
  chatId: string | number
  editMessageId?: number
  views: View[]
  getViewWebAppUrl: (query: View) => string
}) {
  const keyboard = new InlineKeyboard()
  views.forEach((view, i) => {
    if (i > 0) {
      keyboard.row()
    }
    keyboard.webApp(view.title, getViewWebAppUrl(view))
  })

  if (editMessageId) {
    await ctx.api.editMessageText(
      chatId,
      editMessageId,
      messageText,
      {
        reply_markup: keyboard,
      },
    )
  } else {
    await ctx.api.sendMessage(
      chatId,
      messageText,
      {
        reply_markup: keyboard,
      },
    )
  }
}

async function runAction({
  ctx,
  api,
  actionId,
  arguments: args,
}: {
  ctx: Context
  api: MonitoringApi
  actionId: string
  arguments?: Record<string, any>
}) {
  const statusMessage = await ctx.reply("Действие выполняется...")

  let ok
  try {
    await api.runAction({ actionId, arguments: args })
    ok = true
  } catch (_) {
    ok = false
  }

  const messageText = ok ? "Действие выполнено" : "Ошибка выполнения действия"
  await ctx.api.editMessageText(
    statusMessage.chat.id,
    statusMessage.message_id,
    messageText,
  )
}

export type CreateBotOptions = {
  botToken: string
  logger: Logger
  api: MonitoringApi
  whitelistTelegramIds: number[]
  viewsWebAppUrl: string
  actionArgsWebAppUrl: string
}

export function createBot({
  botToken,
  logger,
  api,
  whitelistTelegramIds,
  viewsWebAppUrl,
  actionArgsWebAppUrl,
}: CreateBotOptions): Bot {
  const bot = new Bot(botToken)
  bot.api.config.use(parseMode("HTML"))

  bot.catch((error) => {
    logger.error("Unhandled error in middleware:", error)
  })

  /////////////////////////////////////////////////////////////////////////////

  // Log updates
  bot.use((ctx, next) => {
    logger.info("Incoming update:\n", JSON.stringify(ctx.update))
    return next()
  })

  // Protect bot from unauthorized users
  bot.use((ctx, next) => {
    const userId = ctx.from?.id
    if (!userId || !whitelistTelegramIds.includes(userId)) {
      return ctx.reply("You shall not pass.")
    }
    return next()
  })

  bot.command("start", async (ctx) => {
    await ctx.reply(msg.start)
  })

  bot.command("actions", async (ctx) => {
    const actions = await api.getActions()
    await sendActionsMessage({
      messageText: msg.actionsList,
      botApi: ctx.api,
      chatId: ctx.chat.id,
      actions,
    })
  })

  bot.callbackQuery(/^action:(.+)$/, async (ctx) => {
    const actionId = ctx.match[1]
    let action
    try {
      action = await api.getAction({ id: actionId })
      ctx.answerCallbackQuery()
    } catch (_) {
      ctx.answerCallbackQuery("Не удалось получить действие.")
      return
    }

    const backButton = { text: "« Назад к действиям", callback_data: "actions" }

    if (action.arguments && Object.keys(action.arguments).length > 0) {
      await ctx.editMessageText(
        msg.actionDetails(action),
        {
          reply_markup: new InlineKeyboard([
            [backButton],
          ]),
        },
      )

      // We need user to enter arguments for this action,
      // send Web App button to open the form, which then will send
      // the data back to the bot.
      const argumentsEncoded = encodeURIComponent(JSON.stringify(action.arguments))
      const queryParam = new URLSearchParams({
        actionId,
        args: argumentsEncoded,
      })
      const url = `${actionArgsWebAppUrl}?${queryParam}`
      await ctx.reply(
        "Введите аргументы действия:",
        {
          reply_markup: {
            keyboard: [
              [{ text: action.title, web_app: { url } }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      )
    } else {
      await ctx.editMessageText(
        msg.actionDetails(action),
        {
          reply_markup: new InlineKeyboard([
            [{ text: "Запустить", callback_data: `run-action:${actionId}` }],
            [backButton],
          ]),
        },
      )
    }
  })

  bot.callbackQuery(/^run-action:(.+)$/, async (ctx) => {
    ctx.answerCallbackQuery()
    const actionId = ctx.match[1]
    await runAction({
      ctx,
      api,
      actionId,
    })
  })

  bot.callbackQuery("actions", async (ctx) => {
    ctx.answerCallbackQuery()
    await sendActionsMessage({
      messageText: msg.actionsList,
      botApi: ctx.api,
      editMessageId: ctx.callbackQuery.message?.message_id,
      chatId: ctx.callbackQuery.from.id,
      actions: await api.getActions(),
    })
  })

  bot.command("views", async (ctx) => {
    const views = await api.getViews()
    await sendViews({
      ctx,
      chatId: ctx.chat.id,
      messageText: msg.viewsList,
      views,
      getViewWebAppUrl: (query) => `${viewsWebAppUrl}/${query.alias}`,
    })
  })

  bot.on("message:web_app_data", async (ctx) => {
    const {
      actionId,
      arguments: args,
    } = ZRunActionWebAppData.parse(JSON.parse(ctx.message.web_app_data.data))

    await runAction({
      ctx,
      api,
      actionId,
      arguments: args,
    })
  })

  return bot
}
