import type { Ctx } from "./context"

export async function runAction({
  ctx,
  actionId,
  targetDbId,
  arguments: args,
}: {
  ctx: Ctx
  actionId: string
  targetDbId: string
  arguments?: Record<string, any>
}) {
  const statusMessage = await ctx.reply(ctx.messages.actionRunning)

  let ok
  try {
    await ctx.monitoring.runAction({
      actionId,
      targetDbId,
      arguments: args,
    })
    ok = true
  } catch (err) {
    ctx.logger.error("Failed to run action:", err)
  }

  const messageText = ok
    ? ctx.messages.actionSuccess
    : ctx.messages.actionError
  await ctx.api.editMessageText(
    statusMessage.chat.id,
    statusMessage.message_id,
    messageText,
  )
}
