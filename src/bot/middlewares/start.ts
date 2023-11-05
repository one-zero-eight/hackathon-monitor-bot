import { Composer } from "grammy"
import type { Ctx } from "@/bot/context"

const composer = new Composer<Ctx>()

composer.command("start", (ctx) => ctx.reply(ctx.messages.start))

export default composer
