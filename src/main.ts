import process from "node:process"

import type { Context } from "grammy"
import { Bot, InlineKeyboard, Keyboard } from "grammy"
import { parseMode } from "@grammyjs/parse-mode"
import { run } from "@grammyjs/runner"

import * as msg from "./messages"
import type { Action, Query } from "./api"
import { MonitoringApi, ZRunActionWebAppData } from "./api"
import { loadConfig } from "./config"
import { startAlertDelivery } from "./deliver_alerts"

const ACTIONS_PAGE_SIZE = 10
const QUERIES_PAGE_SIZE = 10

// TODO: implement pagination
async function sendActionsMessage({
  ctx,
  chatId,
  editMessageId,
  actions,
  pageNo: _pageNo,
}: {
  ctx: Context
  chatId: string | number
  editMessageId?: number
  actions: Action[]
  pageNo: number
}) {
  const messageText = "Вот список доступных действий:"
  const keyboard = new InlineKeyboard()
  actions.forEach((action, i) => {
    if (i > 0 && i % 2 === 0) {
      keyboard.row()
    }
    keyboard.text(action.title, `action:${action.alias}`)
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

// TODO: implement pagination
async function sendQueriesMessage({
  ctx,
  chatId,
  editMessageId,
  queries,
  getQueryWebAppUrl,
  pageNo: _pageNo,
}: {
  ctx: Context
  chatId: string | number
  editMessageId?: number
  queries: Query[]
  getQueryWebAppUrl: (query: Query) => string
  pageNo: number
}) {
  const messageText = "Вот список доступных запросов:"
  const keyboard = new InlineKeyboard()
  queries.forEach((query, i) => {
    if (i > 0 && i % 2 === 0) {
      keyboard.row()
    }
    keyboard.webApp(query.title, getQueryWebAppUrl(query))
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

async function main() {
  const config = await loadConfig()

  const api = new MonitoringApi(config.api)

  const bot = new Bot(config.botToken)
  bot.api.config.use(parseMode("HTML"))

  await bot.api.setMyCommands([
    { command: "actions", description: "список действий" },
    { command: "queries", description: "список запросов" },
    { command: "graphs", description: "список графиков" },
  ])

  bot.catch(console.error)

  /////////////////////////////////////////////////////////////////////////////

  // Log updates
  bot.use((ctx, next) => {
    console.log(JSON.stringify(ctx.update))
    return next()
  })

  // Protect bot from unauthorized users
  bot.use((ctx, next) => {
    const userId = ctx.from?.id
    if (!userId || !config.whiteListTelegramIds.includes(userId)) {
      return ctx.reply("You shall not pass.")
    }
    return next()
  })

  bot.command("start", async (ctx) => {
    await ctx.reply(msg.start)
  })

  bot.command("actions", async (ctx) => {
    const actions = await api.getActions({ take: ACTIONS_PAGE_SIZE, skip: 0 })
    await sendActionsMessage({
      ctx,
      chatId: ctx.chat.id,
      actions,
      pageNo: 1,
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
      const url = `${config.runCommandArgumentsFormWebAppUrl}?${queryParam}`
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
      ctx,
      editMessageId: ctx.callbackQuery.message?.message_id,
      chatId: ctx.callbackQuery.from.id,
      actions: await api.getActions({ take: ACTIONS_PAGE_SIZE, skip: 0 }),
      pageNo: 1,
    })
  })

  bot.command("queries", async (ctx) => {
    // const queries = await api.getQueries({
    //   skip: 0,
    //   take: QUERIES_PAGE_SIZE,
    // })

    // await sendQueriesMessage({
    //   ctx,
    //   chatId: ctx.chat.id,
    //   queries,
    //   getQueryWebAppUrl: (query) => `${config.queryWebAppUrl}?id=${query.id}`,
    //   pageNo: 1,
    // })
    await ctx.reply(
      "Список доступных таблиц:",
      {
        reply_markup: new InlineKeyboard([
          [{ text: "pg_stat_activity", web_app: { url: `${config.queryWebAppUrl}/activity` } }],
        ]),
      },
    )
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

  /////////////////////////////////////////////////////////////////////////////

  const runner = run(bot)

  // Add signal handlers to gracefully shutdown the bot
  const stopRunner = () => runner.isRunning() && runner.stop()
  process.once("SIGINT", stopRunner)
  process.once("SIGTERM", stopRunner)

  runner.task()
  startAlertDelivery({
    api,
    bot,
    alertsPerSecond: 0.5,
    alertsAgeSeconds: 3600,
    noAlertsIntervalMs: 5000,
    errorRetryIntervalMs: 3000,
  })
}

main()
