-- CreateTable
CREATE TABLE "user_badge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_badge_userId_idx" ON "user_badge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_badge_userId_code_key" ON "user_badge"("userId", "code");

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
