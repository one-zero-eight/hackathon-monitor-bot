import type { Context } from "grammy"
import type { MonitoringApi } from "@/api"

export type Ctx =
  & Context
  & {
    monitoring: MonitoringApi
  }
