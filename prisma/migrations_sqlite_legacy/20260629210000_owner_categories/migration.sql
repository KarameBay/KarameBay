ALTER TABLE "Category" ADD COLUMN "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Category_createdById_idx" ON "Category"("createdById");
