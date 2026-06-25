-- CreateEnum
CREATE TYPE "ExplanationStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'CURRENT', 'STALE');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "sourceChunkId" TEXT,
ADD COLUMN     "sourceQuote" TEXT;

-- CreateTable
CREATE TABLE "QuestionExplanation" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ExplanationStatus" NOT NULL DEFAULT 'DRAFT',
    "grounded" BOOLEAN NOT NULL DEFAULT false,
    "basedOnDocumentId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "QuestionExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplanationCitation" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "chunkId" TEXT,
    "documentId" TEXT,
    "explanationId" TEXT NOT NULL,

    CONSTRAINT "ExplanationCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplanationJob" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "done" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,

    CONSTRAINT "ExplanationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionExplanation_questionId_key" ON "QuestionExplanation"("questionId");

-- CreateIndex
CREATE INDEX "QuestionExplanation_status_idx" ON "QuestionExplanation"("status");

-- CreateIndex
CREATE INDEX "ExplanationCitation_explanationId_idx" ON "ExplanationCitation"("explanationId");

-- CreateIndex
CREATE INDEX "ExplanationJob_userId_idx" ON "ExplanationJob"("userId");

-- CreateIndex
CREATE INDEX "ExplanationJob_questionSetId_idx" ON "ExplanationJob"("questionSetId");

-- CreateIndex
CREATE INDEX "ExplanationJob_status_idx" ON "ExplanationJob"("status");

-- AddForeignKey
ALTER TABLE "QuestionExplanation" ADD CONSTRAINT "QuestionExplanation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplanationCitation" ADD CONSTRAINT "ExplanationCitation_explanationId_fkey" FOREIGN KEY ("explanationId") REFERENCES "QuestionExplanation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplanationJob" ADD CONSTRAINT "ExplanationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplanationJob" ADD CONSTRAINT "ExplanationJob_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
