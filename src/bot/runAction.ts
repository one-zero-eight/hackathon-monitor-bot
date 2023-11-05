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
  let detail
  try {
    const result = await ctx.monitoring.runAction({
      actionId,
      targetDbId,
      arguments: args,
    })
    ok = result.success
    detail = result.detail
  } catch (err) {
    ok = false
    ctx.logger.error("Failed to run action:", err)
  }

  const messageText = ok
    ? ctx.messages.actionSuccess(detail ?? undefined)
    : ctx.messages.actionError(detail ?? undefined)
  await ctx.api.editMessageText(
    statusMessage.chat.id,
    statusMessage.message_id,
    messageText,
  )
}
