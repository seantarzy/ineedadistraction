-- AlterTable
ALTER TABLE "Widget" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Widget_published_idx" ON "Widget"("published");
