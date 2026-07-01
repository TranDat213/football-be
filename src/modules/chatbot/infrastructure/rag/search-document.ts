import { EmbeddingService } from '../ai/embedding.service';
import { VectorSearch } from '../ai/vector-search';

export class SearchDocument {
  static async search(query: string, limit = 3) {
    const embedding = await EmbeddingService.getEmbedding(query);
    return VectorSearch.searchFAQ(embedding, limit);
  }
}
