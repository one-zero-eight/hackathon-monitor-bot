import type { Bot } from "grammy"

import type { MonitoringApi } from "./api"
import sleepMs from "./utils/sleepMs"
import { messages } from "./bot/messages"
import { sendActionsMessage } from "./bot/sendActionsMessage"
import type { Logger } from "./logger"
import type { Ctx } from "./bot/context"

export type StartAlertsDeliveryOptions = {
  logger: Logger
  api: MonitoringApi
  bot: Bot<Ctx>
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

  while (true) {
    try {
      const deliveries = await api.getAlertDeliveries()
      logger.info(`Got ${deliveries.length} new deliveries`)

      if (deliveries.length === 0) {
        await sleepMs(noAlertsIntervalMs)
        continue
      }

      for (const delivery of deliveries) {
        for (const receiverId of delivery.receivers) {
          const sendAlertInMs = getSleepTimeInMs(alertsPerSecond, lastAlertSentAt)
          if (sendAlertInMs >= 0) {
            await sleepMs(sendAlertInMs)
          }

          let sent
          try {
            await bot.api.sendMessage(
              receiverId,
              messages.alert(delivery),
            )
            sent = true
          } catch (err) {
            sent = false
            logger.error("Failed to send alert:", err)
          }

          try {
            if (
              delivery.status !== "resolved"
              && delivery.suggested_actions.length > 0
            ) {
              // Send suggestion actions
              const actions = await api.getActions()
              const actionsToSuggest = actions.filter((action) =>
                delivery.suggested_actions.includes(action.alias),
              )
              if (actionsToSuggest.length > 0) {
                await sendActionsMessage({
                  messageText: messages.suggestedActions,
                  botApi: bot.api,
                  chatId: receiverId,
                  actions: actionsToSuggest,
                  targetDbId: delivery.target_alias,
                })
              }
            }
          } catch (err) {
            logger.error("Failed to send suggested actions:", err)
          }

          lastAlertSentAt = performance.now()
          if (sent) {
            await api.markAlertDelivered({
              alertId: delivery.id,
              receiversTelegramIds: [receiverId],
            })
          } else {
            // TODO: mark as failed or delivered to avoid infinite retries
          }
        }
      }
    } catch (err) {
      logger.error("Failed to deliver alerts:", err)
      await sleepMs(errorRetryIntervalMs)
    }
  }
}

function getSleepTimeInMs(
  alertsPerSecond: number,
  lastAlertSentAt: number,
) {
  return 1000 / alertsPerSecond - (performance.now() - lastAlertSentAt)
}
