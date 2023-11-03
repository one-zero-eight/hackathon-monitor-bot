/**
 * Creates a text table from a header and a body.
 *
 * Example:
 * ```ts
 * createTextTable({
 *   header: ["pid", "state"],
 *   body: [
 *     ["1", "active"],
 *     ["2", "idle"],
 *     ["3", "idle"],
 *     ["4", "idle"],
 *   ]
 * })
 * ```
 *
 * ```plain
 * pid | state
 * ————+————————
 * 1   | active
 * 2   | idle
 * 3   | idle
 * 4   | idle
 * ```
 */
export default function createTextTable({
  header = null,
  body,
}: {
  header: string[] | null
  body: string[][]
}) {
  const width = Math.max(
    header?.length ?? 0,
    ...body.map((v) => v.length),
  )

  if (width === 0) {
    return ""
  }

  // Make sure all rows have the same size
  header = header?.concat(Array(width - header.length).fill("")) ?? null
  body = body.map((row) => {
    return row.concat(Array(width - row.length).fill(""))
  })

  const allRows = header ? [header, ...body] : body

  const colLengths = allRows.reduce((acc, row) => {
    return acc.map((v, i) => Math.max(v, row[i].length + 1))
  }, allRows[0].map(() => 0))

  let headerLine, separatorLine
  if (header) {
    headerLine = header.map((col, i) => col.padEnd(colLengths[i])).join("|")
    separatorLine = colLengths.map((v) => "—".repeat(v)).join("+")
  }
  const bodyLines = body.map((row) => {
    return row.map((col, i) => col.padEnd(colLengths[i])).join("|")
  })

  return [
    headerLine,
    separatorLine,
    ...bodyLines,
  ].filter(Boolean).join("\n")
}
