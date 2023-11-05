import { Composer, InlineKeyboard } from "grammy"
import type { InlineKeyboardButton } from "grammy/types"
import type { Ctx } from "@/bot/context"
import { sendActionsMessage } from "@/bot/sendActionsMessage"
import { runAction } from "@/bot/runAction"
import type { Action } from "@/api"

const composer = new Composer<Ctx>()

composer.command("actions", async (ctx) => {
  await sendActionsMessage({
    messageText: ctx.messages.actionsList,
    botApi: ctx.api,
    chatId: ctx.from!.id,
    actions: await ctx.monitoring.getActions(),
  })
})

composer.callbackQuery("actions", async (ctx) => {
  ctx.answerCallbackQuery()
  await sendActionsMessage({
    messageText: ctx.messages.actionsList,
    botApi: ctx.api,
    chatId: ctx.callbackQuery.from.id,
    actions: await ctx.monitoring.getActions(),
    editMessageId: ctx.callbackQuery.message?.message_id,
  })
})

composer.callbackQuery(/^action:([^:]+)$/, async (ctx) => {
  const actionId = ctx.match[1]
  let action: Action
  try {
    action = await ctx.monitoring.getAction({ id: actionId })
    ctx.answerCallbackQuery()
  } catch (err) {
    ctx.logger.error("Failed to get action", err)
    ctx.answerCallbackQuery("⚠️ Не удалось получить сценарий ⚠️")
    return
  }

  const targetDbs = await ctx.monitoring.getTargetDbs()
  const messageText = targetDbs.length === 0
    ? ctx.messages.noTargetDbs
    : ctx.messages.chooseTargetDbForAction(action)

  const buttons: InlineKeyboardButton[] = targetDbs.map((dbId) => (
    (action.arguments && Object.keys(action.arguments).length > 0)
      ? { text: dbId, web_app: { url: `${ctx.config.bot.webAppUrls.action}/${action.alias}/${dbId}` } }
      : { text: dbId, callback_data: `action:${action.alias}:${dbId}` }
  ))

  await ctx.editMessageText(
    messageText,
    {
      reply_markup: new InlineKeyboard([
        ...buttons.map((btn) => [btn]),
        [{ text: "« Сценарии", callback_data: "actions" }],
      ],
      ),
    },
  )
})

composer.callbackQuery(/^action:([^:]+):([^:]+)$/, async (ctx) => {
  const [, actionId, targetDbId] = ctx.match
  let action: Action
  try {
    action = await ctx.monitoring.getAction({ id: actionId })
    ctx.answerCallbackQuery()
  } catch (err) {
    ctx.logger.error("Failed to get action", err)
    ctx.answerCallbackQuery("⚠️ Не удалось получить сценарий ⚠️")
    return
  }

  await ctx.editMessageText(
    ctx.messages.runActionConfirm(action, targetDbId),
    {
      reply_markup: new InlineKeyboard([
        [{ text: ctx.messages.runAction, callback_data: `run-action:${actionId}:${targetDbId}` }],
        [{ text: "« Назад", callback_data: `action:${actionId}` }],
      ],
      ),
    },
  )
})

composer.callbackQuery(/^run-action:([^:]+):([^:]+)$/, async (ctx) => {
  ctx.answerCallbackQuery()
  const [, actionId, targetDbId] = ctx.match
  await runAction({
    ctx,
    actionId,
    targetDbId,
  })
})

export default composer
