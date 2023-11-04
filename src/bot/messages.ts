import type { Action, Alert } from "@/api"
import escapeHtml from "@/utils/escapeHtml"

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
