import { Composer, InlineKeyboard } from "grammy"
import type { Ctx } from "@/bot/context"
import type { View } from "@/api"

const composer = new Composer<Ctx>()

composer.command("views", async (ctx) => {
  await sendViews({
    ctx,
    chatId: ctx.chat.id,
    messageText: ctx.messages.viewsList,
    views: await ctx.monitoring.getViews(),
  })
})

composer.callbackQuery("views", async (ctx) => {
  ctx.answerCallbackQuery()
  await sendViews({
    ctx,
    chatId: ctx.callbackQuery.from.id,
    messageText: ctx.messages.viewsList,
    views: await ctx.monitoring.getViews(),
    editMessageId: ctx.callbackQuery.message?.message_id,
  })
})

composer.callbackQuery(/^view:([^:]+)$/, async (ctx) => {
  const viewId = ctx.match[1]
  let view: View
  try {
    view = await ctx.monitoring.getView({ id: viewId })
    ctx.answerCallbackQuery()
  } catch (err) {
    ctx.logger.error("Failed to get view", err)
    ctx.answerCallbackQuery("⚠️ Не удалось получить представление ⚠️")
    return
  }

  const targetDbs = await ctx.monitoring.getTargetDbs()
  const messageText = targetDbs.length === 0
    ? ctx.messages.noTargetDbs
    : ctx.messages.chooseTargetDbForView(view)

  await ctx.editMessageText(
    messageText,
    {
      reply_markup: new InlineKeyboard([
        ...(targetDbs.map((dbId) => [{
          text: dbId,
          web_app: { url: `${ctx.config.bot.webAppUrls.view}/${view.alias}/${dbId}` },
        }])),
        [{ text: "« Представления", callback_data: "views" }],
      ],
      ),
    },
  )
})

export default composer

async function sendViews({
  messageText,
  ctx,
  chatId,
  editMessageId,
  views,
}: {
  messageText: string
  ctx: Ctx
  chatId: string | number
  editMessageId?: number
  views: View[]
}) {
  const keyboard = new InlineKeyboard(
    views.map((view) => [{
      text: view.title,
      callback_data: `view:${view.alias}`,
    }]),
  )

  if (editMessageId) {
    await ctx.api.editMessageText(
      chatId,
      editMessageId,
      messageText,
      { reply_markup: keyboard },
    )
  } else {
    await ctx.api.sendMessage(
      chatId,
      messageText,
      { reply_markup: keyboard },
    )
  }
}
