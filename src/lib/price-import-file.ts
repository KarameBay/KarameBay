import readXlsxFile from "read-excel-file";
import { normalizeCommodityName, type StagedPriceRow } from "@/lib/esoko-importer";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2_000;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizedHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replaceAll(",", "").replace(/\s*rwf\s*/gi, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function importedDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function cell(row: unknown[], headers: Map<string, number>, ...names: string[]) {
  for (const name of names) {
    const index = headers.get(name);
    if (index !== undefined) return row[index];
  }
  return undefined;
}

export async function parsePriceImportFile(file: File): Promise<StagedPriceRow[]> {
  if (!file.size || file.size > MAX_FILE_BYTES)
    throw new Error("Choose a non-empty CSV or .xlsx file no larger than 5 MB.");
  const lowerName = file.name.toLowerCase();
  let table: unknown[][];
  if (lowerName.endsWith(".csv")) {
    table = parseCsv(await file.text());
  } else if (lowerName.endsWith(".xlsx")) {
    table = await readXlsxFile(await file.arrayBuffer());
  } else {
    throw new Error("Use CSV or .xlsx. Save older .xls files as .xlsx first.");
  }
  if (table.length < 2) throw new Error("The import file has no product rows.");
  if (table.length - 1 > MAX_ROWS) throw new Error(`The file exceeds the ${MAX_ROWS}-row manual import limit.`);

  const headers = new Map(table[0].map((value, index) => [normalizedHeader(value), index]));
  const required = ["commodity name", "category", "market", "unit", "price", "price date"];
  const missing = required.filter((name) => !headers.has(name));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}.`);

  const rows = table.slice(1).filter((row) => row.some((value) => String(value ?? "").trim()));
  const foreignMarket = rows.find((row) => normalizeCommodityName(String(cell(row, headers, "market") ?? "")) !== "kimironko");
  if (foreignMarket) throw new Error("Every row must belong to Kimironko Market. No rows were imported.");

  return rows.map((row, index) => {
    const commodityName = String(cell(row, headers, "commodity name", "commodity") ?? "").trim();
    const unit = String(cell(row, headers, "unit") ?? "").trim();
    const price = numeric(cell(row, headers, "price", "current price"));
    const priceType = String(cell(row, headers, "price type") ?? "retail").trim().toUpperCase();
    const priceDate = importedDate(cell(row, headers, "price date", "date"));
    return {
      externalSourceId: String(cell(row, headers, "external source id", "external id") ?? "").trim() || null,
      externalCommodityId: String(cell(row, headers, "external commodity id") ?? "").trim() || null,
      marketName: "Kimironko",
      province: String(cell(row, headers, "province") ?? "").trim() || null,
      district: String(cell(row, headers, "district") ?? "").trim() || null,
      commodityName,
      categoryName: String(cell(row, headers, "category") ?? "").trim() || null,
      unit: unit || null,
      priceType: priceType === "WHOLESALE" ? "WHOLESALE" : "RETAIL",
      price,
      minimumPrice: numeric(cell(row, headers, "minimum price", "min price")),
      maximumPrice: numeric(cell(row, headers, "maximum price", "max price")),
      averagePrice: numeric(cell(row, headers, "average price", "avg price")) ?? price,
      priceDate,
      raw: {
        rowNumber: index + 2,
        commodityName,
        category: String(cell(row, headers, "category") ?? "").trim() || null,
        market: "Kimironko",
        unit: unit || null,
        priceType: priceType === "WHOLESALE" ? "WHOLESALE" : "RETAIL",
        price,
        priceDate: priceDate?.toISOString() ?? null,
      },
    };
  });
}
