import prisma from '../../../../lib/prisma';
import { EmbeddingService } from '../ai/embedding.service';

export class IndexDocument {
  static async index(title: string, content: string, category: string, metadata: any = {}) {
    const embedding = await EmbeddingService.getEmbedding(content);
    const embeddingStr = `[${embedding.join(',')}]`;
    
    // raw insert due to unsupported vector type in Prisma ORM
    await prisma.$executeRawUnsafe(`
      INSERT INTO system_documents (id, title, content, category, embedding, metadata, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5::jsonb, NOW(), NOW())
    `, title, content, category, embeddingStr, JSON.stringify(metadata));
  }
}
