import type { z } from "zod"
import {
  NetworkError,
  RequestError,
  ResultParseError,
} from "./errors"
import type {
  GetActionParams,
  GetAlertParams,
  GetViewParams,
  MarkAlertDeliveredParams,
  RunActionParams,
} from "./schemas"
import {
  ZAction,
  ZAlert,
  ZGetActionsResult,
  ZGetAlertDeliveriesResult,
  ZGetTargetDbsResult,
  ZGetViewsResult,
  ZRunActionResults,
  ZView,
} from "./schemas"
import type { Logger } from "@/logger"

export type MonitoringApiOptions = {
  logger: Logger
  baseUrl: string
  token: string
}

export class MonitoringApi {
  #logger: Logger
  #baseUrl: string
  #token: string

  constructor(options: MonitoringApiOptions) {
    this.#logger = options.logger
    this.#baseUrl = options.baseUrl.endsWith("/")
      ? options.baseUrl.slice(0, -1)
      : options.baseUrl
    this.#token = options.token
  }

  public getActions() {
    return this.query({
      path: "actions",
      method: "GET",
      resultSchema: ZGetActionsResult,
    })
  }

  public getAction(params: GetActionParams) {
    return this.query({
      path: `actions/${params.id}`,
      method: "GET",
      resultSchema: ZAction,
    })
  }

  public runAction(params: RunActionParams) {
    return this.query({
      path: `actions/execute/${params.actionId}?target_alias=${params.targetDbId}`,
      data: params.arguments ?? {},
      method: "POST",
      resultSchema: ZRunActionResults,
    })
  }

  public getViews() {
    return this.query({
      path: "views",
      method: "GET",
      resultSchema: ZGetViewsResult,
    })
  }

  public getView(params: GetViewParams) {
    return this.query({
      path: `views/${params.id}`,
      method: "GET",
      resultSchema: ZView,
    })
  }

  public getAlertDeliveries() {
    return this.query({
      path: "alerts/delivery",
      method: "GET",
      resultSchema: ZGetAlertDeliveriesResult,
    })
  }

  public getAlert(params: GetAlertParams) {
    return this.query({
      path: `alerts/by-id/${params.id}`,
      method: "GET",
      resultSchema: ZAlert,
    })
  }

  public markAlertDelivered(params: MarkAlertDeliveredParams) {
    return this.query({
      path: "alerts/finish",
      data: {
        alert_id: params.alertId,
        receivers: params.receiversTelegramIds,
        // age: -1,
      },
      method: "POST",
    })
  }

  public getTargetDbs() {
    return this.query({
      path: "pg/targets",
      method: "GET",
      resultSchema: ZGetTargetDbsResult,
    })
  }

  private async query<Z extends z.ZodType = z.ZodVoid>({
    path,
    method,
    data,
    resultSchema,
  }: {
    path: string
    method: "GET" | "POST"
    data?: any
    resultSchema?: Z
  }): Promise<z.infer<Z>> {
    // Prepare options.
    let url = `${this.#baseUrl}/${path}`
    let body
    if (data && method === "GET") {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(data)) {
        searchParams.append(key, `${value}`)
      }
      url = `${url}?${searchParams.toString()}`
    } else if (data) {
      body = JSON.stringify(data)
    }

    const options: FetchRequestInit = {
      method,
      body,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.#token}`,
      },
    }

    // Perform request.
    let result
    this.#logger.info(
      `Outgoing HTTP request: [${options.method}] ${url}\n`,
      JSON.stringify({ ...options, method: undefined }),
    )
    try {
      const response = await fetch(url, options)
      result = await response.json()
      if (!response.ok) {
        throw new RequestError(`Request failed with status ${response.status}, ${JSON.stringify(result)}`)
      }
    } catch (err) {
      if (err instanceof Error) {
        throw new NetworkError(err.message, { cause: err })
      } else {
        throw new NetworkError("Unknown network error")
      }
    }

    // Validate and parse result.
    if (resultSchema) {
      const parseResult = resultSchema.safeParse(result)
      if (parseResult.success) {
        return parseResult.data
      } else {
        throw new ResultParseError(parseResult.error.message)
      }
    } else {
      return result
    }
  }
}
