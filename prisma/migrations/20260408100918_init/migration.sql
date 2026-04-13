-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "html" TEXT,
    "component" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT,
    "remixable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAuth" (
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gameDataJson" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingAuth_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "Widget_userId_idx" ON "Widget"("userId");

-- CreateIndex
CREATE INDEX "Widget_votes_idx" ON "Widget"("votes");

-- CreateIndex
CREATE INDEX "Widget_createdAt_idx" ON "Widget"("createdAt");

-- CreateIndex
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");

-- CreateIndex
CREATE INDEX "Vote_widgetId_idx" ON "Vote"("widgetId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_widgetId_voterId_key" ON "Vote"("widgetId", "voterId");

-- CreateIndex
CREATE INDEX "PendingAuth_expiresAt_idx" ON "PendingAuth"("expiresAt");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
