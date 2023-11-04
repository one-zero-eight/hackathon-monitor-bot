import type { ConsolaInstance } from "consola"
import { createConsola } from "consola"

export type Logger = ConsolaInstance

export function createLogger(): Logger {
  return createConsola({
    level: 5,
  })
}
