-- CreateTable
CREATE TABLE "DailyPuzzle" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPuzzle_date_key" ON "DailyPuzzle"("date");

-- CreateIndex
CREATE INDEX "DailyPuzzle_date_idx" ON "DailyPuzzle"("date");
