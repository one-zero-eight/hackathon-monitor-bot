import { z } from "zod"

export const ZAction = z.object({
  alias: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  arguments: z.record(z.string(), z.any()).nullish(), // TODO
})
export type Action = z.infer<typeof ZAction>

export const ZGetActionsResult = z.array(ZAction)

export type GetActionParams = {
  id: string
}

export type RunActionParams = {
  actionId: string
  arguments?: Record<string, any>
}

export const ZView = z.object({
  alias: z.string(),
  title: z.string(),
  description: z.string().nullish(),
})
export type View = z.infer<typeof ZView>

export const ZGetViewsResult = z.array(ZView)

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
