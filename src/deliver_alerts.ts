import type { Bot } from "grammy"

import type { AlertDelivery, MonitoringApi } from "./api"
import sleepMs from "./utils/sleepMs"
import * as msg from "./bot/messages"
import { sendActionsMessage } from "./bot"
import type { Logger } from "./logger"

export type StartAlertsDeliveryOptions = {
  logger: Logger
  api: MonitoringApi
  bot: Bot
  alertsPerSecond: number
  noAlertsIntervalMs: number
  errorRetryIntervalMs: number
}

export async function startAlertDelivery({
  logger,
  api,
  bot,
  alertsPerSecond,
  noAlertsIntervalMs,
  errorRetryIntervalMs,
}: StartAlertsDeliveryOptions) {
  let lastAlertSentAt: number = Number.NEGATIVE_INFINITY
  let deliveriesQueue: AlertDelivery[] = []

  while (true) {
    try {
      while (deliveriesQueue.length > 0) {
        const sendAlertInMs = getSleepTimeInMs(alertsPerSecond, lastAlertSentAt)
        if (sendAlertInMs >= 0) {
          await sleepMs(sendAlertInMs)
        }

        const delivery = deliveriesQueue.shift()!

        const alert = await api.getAlert({ id: delivery.alert_id })

        let sent
        try {
          await bot.api.sendMessage(
            delivery.receiver_id,
            msg.alert(alert),
          )
          sent = true
        } catch (err) {
          sent = false
          logger.error("Failed to send alert:", err)
        }

        try {
          if (
            alert.status !== "resolved"
            && alert.suggested_actions.length > 0
          ) {
            // Send suggestion actions
            const actions = await api.getActions({ skip: 0, take: 100 })
            const actionsToSuggest = actions.filter((action) =>
              alert.suggested_actions.includes(action.alias),
            )
            if (actionsToSuggest.length > 0) {
              await sendActionsMessage({
                botApi: bot.api,
                chatId: delivery.receiver_id,
                actions: actionsToSuggest,
                pageNo: 1,
              })
            }
          }
        } catch (err) {
          logger.error("Failed to send suggested actions:", err)
        }

        lastAlertSentAt = performance.now()
        if (sent) {
          await api.markAlertDelivered({
            alertId: delivery.alert_id,
            receiversTelegramIds: [delivery.receiver_id],
          })
        } else {
          // TODO
        }
      }

      const newDeliveries = await api.getAlertDeliveries()
      logger.info(`Got ${newDeliveries.length} new deliveries`)
      deliveriesQueue.push(...newDeliveries)

      // If we've sent all the alerts and do not have more,
      // then sleep for a while.
      if (deliveriesQueue.length === 0) {
        await sleepMs(noAlertsIntervalMs)
      }
    } catch (err) {
      logger.error("Failed to deliver alerts:", err)
      await sleepMs(errorRetryIntervalMs)
      deliveriesQueue = []
    }
  }
}

function getSleepTimeInMs(
  alertsPerSecond: number,
  lastAlertSentAt: number,
) {
  return 1000 / alertsPerSecond - (performance.now() - lastAlertSentAt)
}
