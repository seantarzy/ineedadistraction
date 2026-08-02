-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_widgetId_idx" ON "Report"("widgetId");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
