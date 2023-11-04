import { number, z } from "zod"

export const ZBackendStat = z.object({
  pid: z.number(),
  state: z.string().nullish(),
})
export type BackendStat = z.infer<typeof ZBackendStat>

export const ZGetStatActivityResult = z.object({
  meta: z.object({
    total_backends_count: z.number(),
  }),
  backends: z.array(ZBackendStat),
})

export const ZAction = z.object({
  alias: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  arguments: z.record(z.string(), z.any()).nullish(), // TODO
})
export type Action = z.infer<typeof ZAction>

export type GetActionsParams = {
  take: number
  skip: number
}
export const ZGetActionsResult = z.array(ZAction)

export type GetActionParams = {
  id: string
}

export type RunActionParams = {
  actionId: string
  arguments?: Record<string, any>
}

export const ZQuery = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
})
export type Query = z.infer<typeof ZQuery>

export type GetQueriesParams = {
  take: number
  skip: number
}
export const ZGetQueriesResult = z.array(ZQuery)

export const ZRunActionWebAppData = z.object({
  actionId: z.string(),
  arguments: z.record(z.string(), z.any()),
})

export type GetAlertDeliveriesParams = {
  age: number
}
export const ZAlertDelivery = z.object({
  alert_id: z.number(),
  receiver_id: z.number(),
  delivered: z.boolean(),
})

export type AlertDelivery = z.infer<typeof ZAlertDelivery>

export const ZGetAlertDeliveriesResult = z.array(ZAlertDelivery)

export type GetAlertParams = {
  id: number
}

export const ZAlertSeverity = z.union([
  z.literal("warning"),
  z.literal("critical"),
])

export const ZAlertStatus = z.union([
  z.literal("fired"),
  z.literal("resolved"),
  z.string(),
])

export const ZAlert = z.object({
  id: z.number(),
  alias: z.string(),
  title: z.string(),
  description: z.string(),
  timestamp: z.coerce.date(),
  status: ZAlertStatus,
  severity: ZAlertSeverity,
  suggested_actions: z.array(z.string()).default(() => []),
  related_graphs: z.array(z.string()).default(() => []),
})
export type Alert = z.infer<typeof ZAlert>

export type MarkAlertDeliveredParams = {
  alertId: number
  receiversTelegramIds: number[]
}
