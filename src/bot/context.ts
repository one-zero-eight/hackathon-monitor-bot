import type { Context } from "grammy"
import type { messages } from "./messages"
import type { MonitoringApi } from "@/api"
import type { Logger } from "@/logger"
import type { Config } from "@/config"

export type Ctx =
  & Context
  & {
    monitoring: MonitoringApi
    logger: Logger
    messages: typeof messages
    config: Config
  }
