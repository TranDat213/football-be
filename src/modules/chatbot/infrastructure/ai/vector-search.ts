import prisma from '../../../../lib/prisma';
import { SystemDocument } from '@prisma/client';

export class VectorSearch {
  static async searchFAQ(embedding: number[], limit = 3): Promise<Partial<SystemDocument>[]> {
    const embeddingString = `[${embedding.join(',')}]`;
    // ponytail: query pgvector via raw SQL. Return Partial<SystemDocument> to avoid exposing internal IDs/vectors unnecessarily.
    const results = await prisma.$queryRawUnsafe<Partial<SystemDocument>[]>(`
      SELECT title, content, category
      FROM system_documents
      ORDER BY embedding <=> $1::vector
      LIMIT $2;
    `, embeddingString, limit);
    return results;
  }
}
