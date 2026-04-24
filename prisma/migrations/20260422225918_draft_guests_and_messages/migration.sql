-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "clientId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_draftId_createdAt_idx" ON "Message"("draftId", "createdAt");

-- CreateIndex
CREATE INDEX "Draft_clientId_idx" ON "Draft"("clientId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
