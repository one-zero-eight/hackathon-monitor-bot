import type { Bot } from "grammy"

import type { AlertDelivery, MonitoringApi } from "./api"
import sleepMs from "./utils/sleepMs"
import * as msg from "./messages"

export type StartAlertsDeliveryOptions = {
  api: MonitoringApi
  bot: Bot
  alertsPerSecond: number
  alertsAgeSeconds: number
  noAlertsIntervalMs: number
  errorRetryIntervalMs: number
}

export async function startAlertDelivery({
  api,
  bot,
  alertsPerSecond,
  alertsAgeSeconds,
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

        let sent
        try {
          const alert = await api.getAlert({ id: delivery.alert_id })
          await bot.api.sendMessage(
            delivery.receiver_id,
            msg.alert(alert),
          )
          sent = true
        } catch (err) {
          sent = false
          console.error("error sending alert", err)
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

      const newDeliveries = await api.getAlertDeliveries({ age: alertsAgeSeconds })
      console.log(`got ${newDeliveries.length} new deliveries`)
      deliveriesQueue.push(...newDeliveries)

      // If we've sent all the alerts and do not have more,
      // then sleep for a while.
      if (deliveriesQueue.length === 0) {
        await sleepMs(noAlertsIntervalMs)
      }
    } catch (err) {
      console.error("error in alert delivery loop", err)
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
