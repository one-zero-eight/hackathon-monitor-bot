import type { Action, Alert, View } from "@/api"
import escapeHtml from "@/utils/escapeHtml"

export const messages = {
  accessDenied: "🙈",

  start: `Доступные команды:

/actions - сценарии
/views - представления
/graphs - графики`,

  alert: (alert: Alert): string => {
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
    lines.push(`База данных: <u>${escapeHtml(alert.target_alias)}</u>`)
    lines.push(`Время: ${alert.timestamp.toISOString()}`)

    if (alert.description) {
      lines.push("")
      lines.push(`ℹ️ <i>${escapeHtml(alert.description)}</i>`)
    }

    return lines.join("\n")
  },

  actionsList: "Выберите сценарий:",
  viewsList: "Выберите представление:",

  runAction: "Запустить сценарий",
  suggestedActions: "Рекомендуемые сценарии:",
  actionRunning: "Сценарий выполняется... ⏳",
  actionSuccess: "Сценарий выполнен ✅",
  actionError: "Ошибка выполнения сценария ❌",

  noTargetDbs: "Не найдено ни одной базы данных",

  chooseTargetDbForAction: (action: Action) => {
    let message = `Сценарий "<b>${escapeHtml(action.title)}</b>"`

    if (action.description) {
      message += `\n\nℹ️ <i>${escapeHtml(action.description)}</i>`
    }

    message += "\n\nВыберите базу данных:"

    return message
  },

  runActionConfirm: (action: Action, targetDbId: string) => {
    return `Запустить сценарий "<b>${escapeHtml(action.title)}</b>" для базы данных <u>${escapeHtml(targetDbId)}</u>?`
  },

  chooseTargetDbForView: (view: View) => {
    let message = `Представление "<b>${escapeHtml(view.title)}</b>"`

    if (view.description) {
      message += `\n\nℹ️ <i>${escapeHtml(view.description)}</i>`
    }

    message += "\n\nВыберите базу данных:"

    return message
  },
}
