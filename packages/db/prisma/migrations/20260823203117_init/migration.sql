-- CreateEnum
CREATE TYPE "kpi_category" AS ENUM ('ATTENDANCE', 'PERFORMANCE', 'BEHAVIOR');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "kpi_assignment" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "meetingId" TEXT,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL,
    "category" "kpi_category" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "meeting_attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'MEMBER',
    "position" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_assignment_kpiId_idx" ON "kpi_assignment"("kpiId");

-- CreateIndex
CREATE INDEX "kpi_assignment_userId_idx" ON "kpi_assignment"("userId");

-- CreateIndex
CREATE INDEX "kpi_assignment_assignedBy_idx" ON "kpi_assignment"("assignedBy");

-- CreateIndex
CREATE INDEX "kpi_assignment_meetingId_idx" ON "kpi_assignment"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_name_key" ON "kpi"("name");

-- CreateIndex
CREATE INDEX "meeting_attendee_userId_idx" ON "meeting_attendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendee_meetingId_userId_key" ON "meeting_attendee"("meetingId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

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
