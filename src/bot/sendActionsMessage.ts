import type { Api, RawApi } from "grammy"
import { InlineKeyboard } from "grammy"
import type { Action } from "@/api"

export async function sendActionsMessage({
  messageText,
  botApi,
  chatId,
  actions,
  targetDbId,
  editMessageId,
}: {
  messageText: string
  botApi: Api<RawApi>
  chatId: string | number
  actions: Action[]
  // If provided, actions will run for this DB, otherwise,
  // additional step for choosing DB will be added.
  targetDbId?: string
  // When provided, will edit the message instead of sending a new one.
  editMessageId?: number
}) {
  const keyboard = new InlineKeyboard(
    actions.map((action) => [{
      text: action.title,
      callback_data: `action:${action.alias}${targetDbId ? `:${targetDbId}` : ""}`,
    }]),
  )

  if (editMessageId) {
    await botApi.editMessageText(
      chatId,
      editMessageId,
      messageText,
      {
        reply_markup: keyboard,
      },
    )
  } else {
    await botApi.sendMessage(
      chatId,
      messageText,
      {
        reply_markup: keyboard,
      },
    )
  }
}
