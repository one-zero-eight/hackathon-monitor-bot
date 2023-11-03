import type { z } from "zod"
import {
  NetworkError,
  RequestError,
  ResultParseError,
} from "./errors"
import { ZGetStatActivityResult } from "./schemas"

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
    let result
    try {
      const response = await fetch(`${this.#baseUrl}/${path}`, {
        method,
        body: data === undefined ? undefined : JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.#token}`,
        },
      })
      if (!response.ok) {
        throw new RequestError(`Request failed with status ${response.status}`)
      }
      result = await response.json()
    } catch (err) {
      console.error(err)
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
