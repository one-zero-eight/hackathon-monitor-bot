import type { Action, Alert } from "@/api"
import createTextTable from "@/utils/createTextTable"
import escapeHtml from "@/utils/escapeHtml"

export function pgStatActivitySummary(data: {
  success: true
  stats: {
    processCountByState: {
      active: number
      idle: number
      idleInTransaction: number
      idleInTransactionAborted: number
      fastpathFunctionCall: number
      disabled: number
      noState: number
    }
  }
} | {
  success: false
  message: string
}): string {
  if (data.success) {
    return createTextTable({
      header: ["State", "Process Count"],
      body: [
        ["Active", data.stats.processCountByState.active.toString()],
        ["Idle", data.stats.processCountByState.idle.toString()],
        ["Idle TX", data.stats.processCountByState.idleInTransaction.toString()],
        ["Idle TX Aborted", data.stats.processCountByState.idleInTransactionAborted.toString()],
        ["Fastpath Func Call", data.stats.processCountByState.fastpathFunctionCall.toString()],
        ["Disabled", data.stats.processCountByState.disabled.toString()],
        ["No State", data.stats.processCountByState.noState.toString()],
      ],
    })
  } else {
    return `❌ Ошибка ❌\n\n${data.message}`
  }
}

export function actionDetails(action: Action) {
  return `Действие: <b>${escapeHtml(action.title)}</b>${action.description ? `\n\nОписание: ${escapeHtml(action.description)}` : ""}`
}

export const start = `Доступные команды:

/actions - список сценариев
/views - список представлений
/graphs - список графиков`

export function alert(alert: Alert): string {
  const lines = []

  if (alert.status === "resolved") {
    lines.push(`Проблема устранена: <b>${escapeHtml(alert.title)}</b> ✅`)
  } else {
    const emoji = alert.severity === "warning"
      ? "⚠️"
      : "🚨"
    lines.push(`${emoji} <b>${escapeHtml(alert.title)}</b> ${emoji}`)
  }

  lines.push("")
  lines.push(`Время: ${alert.timestamp.toISOString()}`)

  if (alert.description) {
    lines.push("")
    lines.push(escapeHtml(alert.description))
  }

  return lines.join("\n")
}

export const actionsList = "Выберите сценарий:"
export const viewsList = "Выберите представление:"

export const suggestedActions = "Рекомендуемые действия:"
