-- Add widget discovery signals: play counts and remix lineage.
ALTER TABLE "Widget"
ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "parentId" TEXT;

ALTER TABLE "Widget"
ADD CONSTRAINT "Widget_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Widget"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Widget_parentId_idx" ON "Widget"("parentId");
