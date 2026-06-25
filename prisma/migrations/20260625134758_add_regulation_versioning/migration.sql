-- CreateEnum
CREATE TYPE "RegStatus" AS ENUM ('EFFECTIVE', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "SourceDocument" ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "regStatus" "RegStatus" NOT NULL DEFAULT 'EFFECTIVE',
ADD COLUMN     "regulationCode" TEXT,
ADD COLUMN     "supersededById" TEXT;

-- CreateIndex
CREATE INDEX "SourceDocument_regStatus_idx" ON "SourceDocument"("regStatus");

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "SourceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
