-- Fix embedding column dimension to match gemini-embedding-001 output (3072 dims)
-- Previous migration created vector(1536), schema declared vector(768) - both wrong.
ALTER TABLE "system_documents"
  ALTER COLUMN "embedding" TYPE vector(3072)
  USING embedding::text::vector(3072);
