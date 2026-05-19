export function isSelectQuery(sql: string): boolean {
  return /^\s*SELECT\b/i.test(sql.trim());
}
