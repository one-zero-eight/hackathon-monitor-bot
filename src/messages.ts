import createTextTable from "./utils/createTextTable"

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
