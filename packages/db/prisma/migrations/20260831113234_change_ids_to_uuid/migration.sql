/*
  Warnings:

  - The primary key for the `invitation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `kpi` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `kpi_assignment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `meetingId` column on the `kpi_assignment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `meeting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `meeting_attendee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `refresh_token` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `invitation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `kpi` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `kpi_assignment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `kpiId` on the `kpi_assignment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `kpi_assignment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `assignedBy` on the `kpi_assignment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `meeting` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `createdBy` on the `meeting` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `meeting_attendee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `meetingId` on the `meeting_attendee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `meeting_attendee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `refresh_token` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `refresh_token` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `user` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "kpi_assignment" DROP CONSTRAINT "kpi_assignment_assignedBy_fkey";

-- DropForeignKey
ALTER TABLE "kpi_assignment" DROP CONSTRAINT "kpi_assignment_kpiId_fkey";

-- DropForeignKey
ALTER TABLE "kpi_assignment" DROP CONSTRAINT "kpi_assignment_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "kpi_assignment" DROP CONSTRAINT "kpi_assignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "meeting_attendee" DROP CONSTRAINT "meeting_attendee_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "meeting_attendee" DROP CONSTRAINT "meeting_attendee_userId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_token_userId_fkey";

-- AlterTable
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "invitation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "kpi" DROP CONSTRAINT "kpi_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "kpi_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "kpi_assignment" DROP CONSTRAINT "kpi_assignment_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "kpiId",
ADD COLUMN     "kpiId" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "assignedBy",
ADD COLUMN     "assignedBy" UUID NOT NULL,
DROP COLUMN "meetingId",
ADD COLUMN     "meetingId" UUID,
ADD CONSTRAINT "kpi_assignment_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "meeting" DROP CONSTRAINT "meeting_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "createdBy",
ADD COLUMN     "createdBy" UUID NOT NULL,
ADD CONSTRAINT "meeting_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "meeting_attendee" DROP CONSTRAINT "meeting_attendee_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "meetingId",
ADD COLUMN     "meetingId" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "meeting_attendee_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_token_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user" DROP CONSTRAINT "user_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "kpi_assignment_kpiId_idx" ON "kpi_assignment"("kpiId");

-- CreateIndex
CREATE INDEX "kpi_assignment_userId_idx" ON "kpi_assignment"("userId");

-- CreateIndex
CREATE INDEX "kpi_assignment_assignedBy_idx" ON "kpi_assignment"("assignedBy");

-- CreateIndex
CREATE INDEX "kpi_assignment_meetingId_idx" ON "kpi_assignment"("meetingId");

-- CreateIndex
CREATE INDEX "meeting_attendee_userId_idx" ON "meeting_attendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendee_meetingId_userId_key" ON "meeting_attendee"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "refresh_token_userId_idx" ON "refresh_token"("userId");

-- AddForeignKey
ALTER TABLE "kpi_assignment" ADD CONSTRAINT "kpi_assignment_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_assignment" ADD CONSTRAINT "kpi_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_assignment" ADD CONSTRAINT "kpi_assignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_assignment" ADD CONSTRAINT "kpi_assignment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendee" ADD CONSTRAINT "meeting_attendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendee" ADD CONSTRAINT "meeting_attendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
