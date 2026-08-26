/**
 * Generates docs/db/schema.md directly from the Drizzle schema, resolving
 * every column to its real (snake_case) database name the same way
 * drizzle-kit does when it writes migrations -- via each column's
 * `keyAsName` flag and drizzle-orm's own `toSnakeCase` -- so the docs can
 * never drift from what casing: "snake_case" actually produces in Postgres.
 * Replaces drizzle-docs-generator, which parses the schema source as plain
 * text and has no notion of the casing dialect option, so it rendered JS
 * property names (e.g. `userId`) instead of real column names (`user_id`).
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { is, SQL } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import { getTableConfig, PgDialect, PgTable } from "drizzle-orm/pg-core";
import type { PgColumn } from "drizzle-orm/pg-core";

// Keep in sync with the `casing` option in drizzle.config.ts.
const CASING = "snake_case";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "..", "..");
const schemaDir = path.join(here, "schema");
const outputPath = path.join(repoRoot, "docs", "db", "schema.md");

const dialect = new PgDialect({ casing: CASING });

interface ColumnInfo {
  dbName: string;
  sqlType: string;
  notNull: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  defaultText: string | undefined;
}

interface ForeignKeyInfo {
  name: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  mandatory: boolean;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  method: string;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
}

interface Relation {
  parentTable: string;
  parentColumn: string;
  childTable: string;
  childColumn: string;
  mandatory: boolean;
}

async function loadTables(): Promise<PgTable[]> {
  const files = readdirSync(schemaDir).filter((file) => file.endsWith(".ts"));
  const tables: PgTable[] = [];
  const seen = new Set<PgTable>();
  for (const file of files) {
    const mod = (await import(path.join(schemaDir, file))) as Record<
      string,
      unknown
    >;
    for (const value of Object.values(mod)) {
      if (is(value, PgTable) && !seen.has(value)) {
        seen.add(value);
        tables.push(value);
      }
    }
  }
  return tables;
}

function columnName(column: { name?: string; keyAsName: boolean }): string {
  if (!column.name) return "";
  return column.keyAsName ? toSnakeCase(column.name) : column.name;
}

function renderDefault(column: PgColumn): string | undefined {
  if (column.default === undefined) return undefined;
  if (is(column.default, SQL)) {
    return `\`${dialect.sqlToQuery(column.default).sql}\``;
  }
  if (typeof column.default === "string") {
    return `\`'${column.default}'\``;
  }
  return `\`${JSON.stringify(column.default)}\``;
}

function buildColumns(table: PgTable): ColumnInfo[] {
  const { columns, primaryKeys, uniqueConstraints } = getTableConfig(table);
  const compositePkNames = new Set(
    primaryKeys.flatMap((pk) => pk.columns.map((column) => column.name)),
  );
  const compositeUniqueNames = new Set(
    uniqueConstraints.flatMap((unq) =>
      unq.columns.map((column) => column.name),
    ),
  );
  return columns.map((column) => ({
    dbName: columnName(column),
    sqlType: column.getSQLType(),
    notNull: column.notNull,
    isPrimaryKey: column.primary || compositePkNames.has(column.name),
    isUnique: column.isUnique || compositeUniqueNames.has(column.name),
    defaultText: renderDefault(column),
  }));
}

function buildForeignKeys(table: PgTable, tableName: string): ForeignKeyInfo[] {
  const { foreignKeys } = getTableConfig(table);
  return foreignKeys.map((fk) => {
    const ref = fk.reference();
    const fromColumns = ref.columns.map(columnName);
    const toColumns = ref.foreignColumns.map(columnName);
    const toTable = getTableConfig(ref.foreignTable).name;
    const name =
      ref.name ??
      `${tableName}_${fromColumns.join("_")}_${toTable}_${toColumns.join("_")}_fk`;
    return {
      name,
      fromColumns,
      toTable,
      toColumns,
      mandatory: ref.columns.every((column) => column.notNull),
    };
  });
}

function buildIndexes(table: PgTable, tableName: string): IndexInfo[] {
  const { indexes } = getTableConfig(table);
  return indexes.map((idx) => {
    const columns = idx.config.columns.map((col) => {
      if (is(col, SQL)) {
        throw new Error(
          `SQL expression indexes are not supported by this doc generator (table "${tableName}")`,
        );
      }
      return columnName(col as PgColumn);
    });
    const name = idx.config.name ?? `${tableName}_${columns.join("_")}_index`;
    return {
      name,
      columns,
      unique: idx.config.unique,
      method: idx.config.method ?? "btree",
    };
  });
}

function buildTable(table: PgTable): TableInfo {
  const { name } = getTableConfig(table);
  return {
    name,
    columns: buildColumns(table),
    foreignKeys: buildForeignKeys(table, name),
    indexes: buildIndexes(table, name),
  };
}

function buildRelations(tables: TableInfo[]): Relation[] {
  return tables
    .flatMap((table) =>
      table.foreignKeys.map((fk) => ({
        parentTable: fk.toTable,
        parentColumn: fk.toColumns.join("+"),
        childTable: table.name,
        childColumn: fk.fromColumns.join("+"),
        mandatory: fk.mandatory,
      })),
    )
    .sort((a, b) =>
      `${a.childTable}.${a.childColumn}`.localeCompare(
        `${b.childTable}.${b.childColumn}`,
      ),
    );
}

function renderTablesSummary(tables: TableInfo[]): string {
  const rows = tables.map(
    (table) =>
      `| [${table.name}](#${table.name}) | ${String(table.columns.length)} |`,
  );
  return [
    "# Tables",
    "",
    "| Name | Columns |",
    "|------|---------|",
    ...rows,
  ].join("\n");
}

function renderColumnsTable(table: TableInfo, relations: Relation[]): string {
  const header = "| Name | Type | Default | Nullable | Children | Parents |";
  const divider = "|------|------|---------|----------|----------|---------|";
  const rows = table.columns.map((column) => {
    const childLinks = relations
      .filter(
        (rel) =>
          rel.parentTable === table.name && rel.parentColumn === column.dbName,
      )
      .map(
        (rel) => `[${rel.childTable}.${rel.childColumn}](#${rel.childTable})`,
      );
    const parentLinks = table.foreignKeys
      .filter((fk) => fk.fromColumns.includes(column.dbName))
      .map((fk) => `[${fk.toTable}.${fk.toColumns.join("+")}](#${fk.toTable})`);
    const name = column.isPrimaryKey ? `**${column.dbName}**` : column.dbName;
    return [
      name,
      column.sqlType,
      column.defaultText ?? "-",
      column.notNull ? "NO" : "YES",
      childLinks.length > 0 ? childLinks.join(", ") : "-",
      parentLinks.length > 0 ? parentLinks.join(", ") : "-",
    ]
      .map((cell) => `| ${cell} `)
      .join("")
      .concat("|");
  });
  return ["### Columns", "", header, divider, ...rows].join("\n");
}

function renderConstraints(table: TableInfo): string | undefined {
  if (table.foreignKeys.length === 0) return undefined;
  const rows = table.foreignKeys.map(
    (fk) =>
      `| ${fk.name} | FOREIGN KEY | (${fk.fromColumns.join(", ")}) → ${fk.toTable}(${fk.toColumns.join(", ")}) |`,
  );
  return [
    "### Constraints",
    "",
    "| Name | Type | Definition |",
    "|------|------|------------|",
    ...rows,
  ].join("\n");
}

function renderIndexes(table: TableInfo): string | undefined {
  if (table.indexes.length === 0) return undefined;
  const rows = table.indexes.map(
    (idx) =>
      `| ${idx.name} | ${idx.columns.join(", ")} | ${idx.unique ? "YES" : "NO"} | ${idx.method} |`,
  );
  return [
    "### Indexes",
    "",
    "| Name | Columns | Unique | Type |",
    "|------|---------|--------|------|",
    ...rows,
  ].join("\n");
}

function renderRelations(
  table: TableInfo,
  relations: Relation[],
): string | undefined {
  const asParent = relations
    .filter((rel) => rel.parentTable === table.name)
    .map(
      (rel) =>
        `| **[${rel.parentTable}.${rel.parentColumn}](#${rel.parentTable})** | [${rel.childTable}.${rel.childColumn}](#${rel.childTable}) | Many to One |`,
    );
  const asChild = relations
    .filter((rel) => rel.childTable === table.name)
    .map(
      (rel) =>
        `| [${rel.parentTable}.${rel.parentColumn}](#${rel.parentTable}) | **[${rel.childTable}.${rel.childColumn}](#${rel.childTable})** | Many to One |`,
    );
  const rows = [...asParent, ...asChild];
  if (rows.length === 0) return undefined;
  return [
    "### Relations",
    "",
    "| Parent | Child | Type |",
    "|--------|-------|------|",
    ...rows,
  ].join("\n");
}

function renderTableSection(table: TableInfo, relations: Relation[]): string {
  return [
    `## ${table.name}`,
    renderColumnsTable(table, relations),
    renderConstraints(table),
    renderIndexes(table),
    renderRelations(table, relations),
  ]
    .filter((section) => section !== undefined)
    .join("\n\n");
}

function renderErDiagram(tables: TableInfo[], relations: Relation[]): string {
  const relationLines = relations.map((rel) => {
    const cardinality = rel.mandatory ? "||" : "o|";
    return `    ${rel.childTable} }o--${cardinality} ${rel.parentTable} : "${rel.childColumn}"`;
  });

  const tableBlocks = tables.map((table) => {
    const fromColumnNames = new Set(
      table.foreignKeys.flatMap((fk) => fk.fromColumns),
    );
    const fieldLines = table.columns.map((column) => {
      const keys = [
        column.isPrimaryKey && "PK",
        fromColumnNames.has(column.dbName) && "FK",
        column.isUnique && "UK",
      ].filter((key): key is string => Boolean(key));
      const suffix = keys.length > 0 ? ` ${keys.join(",")}` : "";
      return `        ${column.sqlType} ${column.dbName}${suffix}`;
    });
    return [`    ${table.name} {`, ...fieldLines, "    }"].join("\n");
  });

  return [
    "## ER Diagram",
    "",
    "```mermaid",
    "erDiagram",
    ...relationLines,
    "",
    ...tableBlocks,
    "```",
  ].join("\n");
}

async function main() {
  const pgTables = await loadTables();
  const tables = pgTables
    .map(buildTable)
    .sort((a, b) => a.name.localeCompare(b.name));
  const relations = buildRelations(tables);

  const doc = [
    renderTablesSummary(tables),
    "---",
    ...tables.flatMap((table, index) => [
      renderTableSection(table, relations),
      index < tables.length - 1 ? "---" : undefined,
    ]),
    "---",
    renderErDiagram(tables, relations),
  ]
    .filter((section) => section !== undefined)
    .join("\n\n");

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${doc}\n`);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
}

await main();
