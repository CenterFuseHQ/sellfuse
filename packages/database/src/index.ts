import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const DATABASE_SCHEMAS = ["centerfuse", "sellfuse", "buyfuse"] as const;

export interface SharedUserRow {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConnectionRow {
  id: string;
  userId: string;
  providerId: string;
  encryptedTokenReference: string | null;
  status: string;
}

export interface CanonicalListingRow {
  id: string;
  userId: string;
  sku: string | null;
  title: string;
  price: string | null;
  currency: string;
  status: string;
}

export interface BuyerSavedItemRow {
  id: string;
  workspaceId: string;
  title: string;
  sourceUrl: string | null;
  notes: string | null;
  status: "CONSIDERING" | "PURCHASED" | "ARCHIVED";
}

export interface MigrationValidation { files: string[]; schemas: string[]; }

/** Validates checked-in SQL without connecting to or mutating a database. */
export async function validateMigrations(directory = fileURLToPath(new URL("../migrations/", import.meta.url))): Promise<MigrationValidation> {
  const files = (await readdir(directory)).filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (!files.length) throw new Error("NO_MIGRATIONS_FOUND");
  files.forEach((name, index) => { if (!name.startsWith(String(index + 1).padStart(4, "0"))) throw new Error(`MIGRATION_SEQUENCE_INVALID:${name}`); });
  const sql = (await Promise.all(files.map((name) => readFile(`${directory}/${name}`, "utf8")))).join("\n");
  if (/\b(DROP|TRUNCATE)\b/i.test(sql)) throw new Error("DESTRUCTIVE_MIGRATION_NOT_ALLOWED");
  const schemas = [...sql.matchAll(/CREATE SCHEMA IF NOT EXISTS\s+([a-z_]+)/gi)].map((match) => match[1]!).sort();
  for (const required of DATABASE_SCHEMAS) if (!schemas.includes(required)) throw new Error(`MISSING_SCHEMA:${required}`);
  return { files, schemas };
}
