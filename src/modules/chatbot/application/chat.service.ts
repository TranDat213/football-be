import { getGemini } from '../infrastructure/ai/openai-client';
import { SearchDocument } from '../infrastructure/rag/search-document';
import { ToolExecutor } from '../infrastructure/ai/tool-executor';
import { ChatMessage } from '../domain/chat-message';

const SYSTEM_PROMPT = `Bạn là AI Chatbot của hệ thống đặt sân bóng. Nhiệm vụ của bạn:
1. Nếu câu hỏi về FAQ/Chính sách/Hướng dẫn/Khuyến mãi, hãy phân tích câu hỏi và tôi sẽ cung cấp tài liệu (RAG).
2. Nếu câu hỏi yêu cầu dữ liệu động (tìm sân, check booking), KHÔNG ĐƯỢC tự đoán, BẮT BUỘC gọi Function Tool.
3. Nếu người dùng hỏi "Tìm sân" mà thiếu thông tin (quận, giờ, loại sân), hãy hỏi lại họ.
Lưu ý: Luôn ưu tiên dùng thông tin từ Tool hoặc RAG.`;

// Convert OpenAI-style JSON schema types (lowercase) -> Gemini's uppercase Type enum
function convertSchemaTypes(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;

  const converted: any = { ...schema };

  if (typeof converted.type === 'string') {
    converted.type = converted.type.toUpperCase();
  }

  if (converted.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(converted.properties).map(([key, val]) => [
        key,
        convertSchemaTypes(val),
      ]),
    );
  }

  if (converted.items) {
    converted.items = convertSchemaTypes(converted.items);
  }

  return converted;
}

// Convert OpenAI-style tool schema -> Gemini functionDeclarations schema
function toGeminiTools() {
  const fns = (ToolExecutor.tools as any[]).map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: convertSchemaTypes(t.function.parameters),
  }));
  return [{ functionDeclarations: fns }];
}

// Convert our ChatMessage[] (role: system/user/assistant/tool) -> Gemini `contents` format
function toGeminiContents(messages: { role: string; content?: string | null }[]) {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));
}

export class ChatService {
  static async handleChat(messages: ChatMessage[]) {
    const genAI = await getGemini();
    const model = process.env.CHAT_MODEL || 'gemini-2.5-flash';

    const latestMessage = messages[messages.length - 1].content || '';

    // Bước 1: Tìm tài liệu RAG liên quan (FAQ/chính sách/hướng dẫn)
    const docs = await SearchDocument.search(latestMessage, 2);
    let contextDocs = '';
    if (docs && docs.length > 0) {
      contextDocs =
        `\nTài liệu tham khảo nội bộ (hữu ích nếu liên quan, hãy dùng nếu cần):\n` +
        docs.map((d) => `- ${d.title}: ${d.content}`).join('\n');
    }

    const augmentedMessages = [
      ...messages.slice(0, -1),
      { role: 'user', content: latestMessage + contextDocs },
    ];

    const contents = toGeminiContents(augmentedMessages);

    // Vòng 1: gọi LLM kèm tools
    const response = await genAI.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: toGeminiTools(),
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const functionCallPart = parts.find((p) => p.functionCall);

    // Xem LLM có muốn gọi tool không
    if (functionCallPart?.functionCall) {
      const { name, args } = functionCallPart.functionCall;

      const functionResponse = await ToolExecutor.executeTool(
        name as string,
        (args as Record<string, any>) || {},
      );

      // Thêm lượt gọi tool (model) + kết quả tool (user/functionResponse) vào lịch sử
      contents.push({
        role: 'model',
        parts: [{ functionCall: functionCallPart.functionCall }],
      } as any);
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name,
              response: { result: functionResponse },
            },
          },
        ],
      } as any);

      // Vòng 2: LLM đọc kết quả tool và trả lời người dùng
      const secondResponse = await genAI.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });

      return {
        role: 'assistant',
        content: secondResponse.text ?? '',
      };
    }

    return {
      role: 'assistant',
      content: response.text ?? '',
    };
  }
}