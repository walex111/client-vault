import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export const vaults = pgTable("vaults", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vaultFiles = pgTable("vault_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" })
    .notNull(),
  r2Key: text("r2_key").notNull(),
  encryptedMetadata: text("encrypted_metadata").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileId: uuid("file_id")
    .references(() => vaultFiles.id, { onDelete: "cascade" })
    .notNull(),
  action: text("action").notNull(), // 'VIEW' or 'DOWNLOAD'
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
