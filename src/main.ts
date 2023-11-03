import { parseMode } from "@grammyjs/parse-mode"
import { Bot } from "grammy"
import type { BackendStat } from "./api"
import { MonitoringApi } from "./api"
import { loadConfig } from "./config"

async function main() {
  const config = await loadConfig()

  const api = new MonitoringApi(config.api)

  const bot = new Bot(config.botToken)
  bot.api.config.use(parseMode("HTML"))

  // await bot.api.setMyCommands([
  //   { command: "start", description: "начало" },
  //   { command: "status", description: "текущее состояние БД" },
  // ])

  bot.catch(console.error)

  bot.command("start", async (ctx) => {
    await ctx.reply(`
Список доступных команд:

/status — статус БД
    `.trim())
  })

  bot.command("status", async (ctx) => {
    let stat
    try {
      stat = await api.getStatActivity()
    } catch (err) {
      console.error("failed to obtain stat", err)
    }

    if (stat) {
      await ctx.reply(`
<b>Кол-во соединений</b>: ${stat.meta.total_backends_count}

<pre>${generateBackendsTable(stat.backends)}</pre>
  `.trim(), { parse_mode: "HTML" })
    } else {
      await ctx.reply("❌ Не удалось получить статус БД")
    }
  })
  await bot.start()
}

function generateBackendsTable(backends: BackendStat[]): string {
  const table = [
    ["pid", "state"],
  ]

  for (const backend of backends) {
    table.push([backend.pid.toString(), backend.state ?? "—"])
  }

  const colLengths = table.reduce((acc, row) => {
    return acc.map((v, i) => Math.max(v, row[i].length + 1))
  }, table[0].map(() => 0))

  let lines = table.map((row) => {
    return row.map((col, i) => col.padEnd(colLengths[i])).join("|")
  })

  lines = [
    lines[0],
    colLengths.map((v) => "-".repeat(v)).join("+"),
    ...lines.slice(1),
  ]

  return lines.join("\n")
}

main()
