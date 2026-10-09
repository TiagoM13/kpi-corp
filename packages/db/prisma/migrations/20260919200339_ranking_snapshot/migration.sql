-- CreateEnum
CREATE TYPE "ranking_period" AS ENUM ('WEEK', 'MONTH', 'QUARTER');

-- CreateTable
CREATE TABLE "ranking_snapshot" (
    "id" UUID NOT NULL,
    "period" "ranking_period" NOT NULL,
    "periodStart" DATE NOT NULL,
    "userId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "kpiCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ranking_snapshot_period_periodStart_idx" ON "ranking_snapshot"("period", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_snapshot_period_periodStart_userId_key" ON "ranking_snapshot"("period", "periodStart", "userId");

-- AddForeignKey
ALTER TABLE "ranking_snapshot" ADD CONSTRAINT "ranking_snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
