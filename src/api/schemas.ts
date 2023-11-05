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
  targetDbId: string
  arguments?: Record<string, any>
}

export const ZRunActionResults = z.object({
  success: z.boolean(),
  detail: z.string().nullish(),
})

export const ZView = z.object({
  alias: z.string(),
  title: z.string(),
  description: z.string().nullish(),
})
export type View = z.infer<typeof ZView>

export const ZGetViewsResult = z.array(ZView)

export type GetViewParams = {
  id: string
}

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
  target_alias: z.string(),
  description: z.string(),
  timestamp: z.coerce.date(),
  status: ZAlertStatus,
  severity: ZAlertSeverity,
  suggested_actions: z.array(z.string()).default(() => []),
  related_views: z.array(z.string()).default(() => []),
})
export type Alert = z.infer<typeof ZAlert>

export const ZAlertDelivery = ZAlert.merge(z.object({
  receivers: z.array(z.number()),
}))

export type AlertDelivery = z.infer<typeof ZAlertDelivery>

export const ZGetAlertDeliveriesResult = z.array(ZAlertDelivery)

export type MarkAlertDeliveredParams = {
  alertId: number
  receiversTelegramIds: number[]
}

export const ZGetTargetDbsResult = z.array(z.string())
