-- AlterTable
ALTER TABLE "kpi_assignment" ADD COLUMN "points" INTEGER NOT NULL;
ALTER TABLE "kpi_assignment" ADD COLUMN "revoked_at" TIMESTAMP(3);
ALTER TABLE "kpi_assignment" DROP COLUMN "active";
