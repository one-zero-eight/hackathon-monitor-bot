import type { MiddlewareFn } from "grammy"
import type { Ctx } from "@/bot/context"

const updatesLogger: MiddlewareFn<Ctx> = (ctx, next) => {
  ctx.logger.info("Incoming update:\n", JSON.stringify(ctx.update))
  return next()
}

export default updatesLogger
