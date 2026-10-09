-- A migration 20260907120000 criou a coluna como "revoked_at" (snake_case, como na spec),
-- mas o schema do projeto nao usa @map em campos: as colunas do banco sao camelCase
-- (assignedAt, kpiId, ...). Renomeia para o nome que o Prisma Client espera.
ALTER TABLE "kpi_assignment" RENAME COLUMN "revoked_at" TO "revokedAt";
