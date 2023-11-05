import { Composer, InlineKeyboard } from "grammy"
import type { Ctx } from "@/bot/context"

const composer = new Composer<Ctx>()

composer.command("graphs", async (ctx) => {
  await sendGraphs({
    ctx,
    chatId: ctx.chat.id,
    messageText: ctx.messages.graphsList,
  })
})

composer.callbackQuery("graphs", async (ctx) => {
  ctx.answerCallbackQuery()
  await sendGraphs({
    ctx,
    chatId: ctx.callbackQuery.from.id,
    messageText: ctx.messages.graphsList,
    editMessageId: ctx.callbackQuery.message?.message_id,
  })
})

composer.callbackQuery(/^graph:([^:]+)$/, async (ctx) => {
  ctx.answerCallbackQuery()

  const targetDbs = await ctx.monitoring.getTargetDbs()
  const messageText = targetDbs.length === 0
    ? ctx.messages.noTargetDbs
    : ctx.messages.chooseTargetForGraph("grafana")

  await ctx.editMessageText(
    messageText,
    {
      reply_markup: new InlineKeyboard([
        ...(targetDbs.map((dbId) => [{
          text: dbId,
          web_app: { url: `${ctx.config.bot.webAppUrls.graph}/grafana/${dbId}` },
        }])),
        [{ text: "« Дашборды", callback_data: "graphs" }],
      ],
      ),
    },
  )
})

export default composer

async function sendGraphs({
  messageText,
  ctx,
  chatId,
  editMessageId,
}: {
  messageText: string
  ctx: Ctx
  chatId: string | number
  editMessageId?: number
}) {
  const keyboard = new InlineKeyboard(
    ["grafana"].map((id) => [{
      text: id,
      callback_data: `graph:${id}`,
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
