import { getGemini } from './openai-client';

export class EmbeddingService {
  static async getEmbedding(text: string): Promise<number[]> {
    const genAI = await getGemini();
    const response = await genAI.models.embedContent({
      model: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
      contents: text,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values) {
      throw new Error('Gemini embedding response is empty');
    }
    return values;
  }
}