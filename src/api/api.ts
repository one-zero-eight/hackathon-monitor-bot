import type { z } from "zod"
import {
  NetworkError,
  RequestError,
  ResultParseError,
} from "./errors"
import type { GetActionParams, GetActionsParams, GetAlertDeliveriesParams, GetAlertParams, GetQueriesParams, MarkAlertDeliveredParams, RunActionParams } from "./schemas"
import { ZAction, ZAlert, ZGetActionsResult, ZGetAlertDeliveriesResult, ZGetQueriesResult, ZGetStatActivityResult } from "./schemas"

export type MonitoringApiOptions = {
  baseUrl: string
  token: string
}

export class MonitoringApi {
  #baseUrl: string
  #token: string

  constructor(options: MonitoringApiOptions) {
    this.#baseUrl = options.baseUrl.endsWith("/")
      ? options.baseUrl.slice(0, -1)
      : options.baseUrl
    this.#token = options.token
  }

  public getStatActivity() {
    return this.query({
      path: "pg/pg-stat-activity",
      method: "GET",
      resultSchema: ZGetStatActivityResult,
    })
  }

  public registerUser({
    id,
    firstName,
    lastName,
    username,
  }: {
    id: number
    firstName: string
    lastName: string | null
    username: string | null
  }) {
    return this.query({
      path: "users/register-via-telegram",
      method: "POST",
      data: {
        telegram_id: id,
        telegram_first_name: firstName,
        telegram_last_name: lastName,
        telegram_username: username,
      },
    })
  }

  public getActions(_params: GetActionsParams) {
    return this.query({
      path: "actions",
      method: "GET",
      // data: {
      //   skip: params.skip,
      //   take: params.take,
      // },
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
      path: `actions/execute/${params.actionId}`,
      data: {
        arguments: params.arguments,
      },
      method: "POST",
    })
  }

  public getQueries(_params: GetQueriesParams) {
    return this.query({
      path: "queries",
      method: "GET",
      // data: {
      //   skip: params.skip,
      //   take: params.take,
      // },
      resultSchema: ZGetQueriesResult,
    })
  }

  public getAlertDeliveries(params: GetAlertDeliveriesParams) {
    return this.query({
      path: "alerts/delivery",
      method: "GET",
      data: {
        age: params.age,
      },
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
        age: -1,
      },
      method: "POST",
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

    let result
    try {
      const response = await fetch(url, {
        method,
        body,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.#token}`,
        },
      })
      if (!response.ok) {
        console.error("req err", await response.json())
        throw new RequestError(`Request failed with status ${response.status}`)
      }
      result = await response.json()
    } catch (err) {
      if (err instanceof Error) {
        throw new NetworkError(err.message, { cause: err })
      } else {
        throw new NetworkError("Unknown network error")
      }
    }

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
