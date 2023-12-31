import process from "node:process"

import { run } from "@grammyjs/runner"

import { MonitoringApi } from "./api"
import { loadConfig } from "./config"
import { createLogger } from "./logger"
import { startAlertDelivery } from "./deliver_alerts"
import { createBot } from "./bot/bot"

async function main() {
  const config = await loadConfig()
  const logger = createLogger()
  const monitoringApi = new MonitoringApi({
    logger: logger.withTag("MonitoringAPI"),
    baseUrl: config.api.baseUrl,
    token: config.api.token,
  })
  const bot = createBot({
    logger: logger.withTag("Bot"),
    api: monitoringApi,
    config,
  })

  logger.start("Testing Bot API token...")
  const botUsername = (await bot.api.getMe()).username
  logger.box(`→ https://t.me/${botUsername} ←`)

  await bot.api.setMyCommands([
    { command: "actions", description: "список сценариев" },
    { command: "views", description: "список представлений" },
    { command: "graphs", description: "список графиков" },
  ])

  const runner = run(bot)

  // Add signal handlers to gracefully shutdown the bot
  const stopRunner = () => runner.isRunning() && runner.stop()
  process.once("SIGINT", stopRunner)
  process.once("SIGTERM", stopRunner)

  runner.task()
  startAlertDelivery({
    logger: logger.withTag("Alerts"),
    api: monitoringApi,
    bot,
    alertsPerSecond: config.alerts.alertsPerSecond,
    noAlertsIntervalMs: config.alerts.noAlertsIntervalMs,
    errorRetryIntervalMs: config.alerts.errorRetryIntervalMs,
  })
}

main()
