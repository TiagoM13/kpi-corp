/*
  Warnings:

  - You are about to drop the column `closed` on the `meeting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "meeting" DROP COLUMN "closed",
ADD COLUMN     "closedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "meeting_attendee" ADD COLUMN     "presentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "meeting_date_idx" ON "meeting"("date");

-- CreateIndex
CREATE INDEX "meeting_closedAt_idx" ON "meeting"("closedAt");
