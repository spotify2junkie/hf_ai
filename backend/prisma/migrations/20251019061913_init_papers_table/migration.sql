-- CreateTable
CREATE TABLE "papers" (
    "id" UUID NOT NULL,
    "paper_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" JSONB NOT NULL,
    "abstract" TEXT,
    "abstract_zh" TEXT,
    "pdf_url" TEXT,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "published_date" DATE NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cache_expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "papers_paper_id_key" ON "papers"("paper_id");

-- CreateIndex
CREATE INDEX "papers_published_date_idx" ON "papers"("published_date" DESC);

-- CreateIndex
CREATE INDEX "papers_cache_expires_at_idx" ON "papers"("cache_expires_at");

-- CreateIndex
CREATE INDEX "papers_published_date_paper_id_idx" ON "papers"("published_date", "paper_id");
