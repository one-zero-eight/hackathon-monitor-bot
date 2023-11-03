import { z } from "zod"

export type TerminateBackendOptions = {
  pid: number
}
export const ZTerminateBackendResult = z.object({})
export type TerminateBackendResult = z.infer<typeof ZTerminateBackendResult>

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

export const ZGetActionsResult = z.array()

export const ZAction = z.object({})
