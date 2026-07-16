import { getGemini } from '../infrastructure/ai/openai-client';
import { SearchDocument } from '../infrastructure/rag/search-document';
import { ToolExecutor } from '../infrastructure/ai/tool-executor';
import { ChatMessage } from '../domain/chat-message';
import { Env } from '@/config/env.config';

const SYSTEM_PROMPT = `Bạn là AI Chatbot của FootballHub.

Nhiệm vụ:

1. Nếu câu hỏi liên quan đến FAQ, chính sách, hướng dẫn:
- Sử dụng tài liệu RAG.
- Không bịa thông tin.

2. Nếu câu hỏi yêu cầu dữ liệu realtime:
- BẮT BUỘC gọi Function Tool.
- Không tự suy đoán dữ liệu.

3. Nếu tool trả về dữ liệu có cấu trúc:
- Chỉ tóm tắt kết quả bằng ngôn ngữ tự nhiên.
- Không lặp lại toàn bộ JSON.
- Không tự sinh URL.
- Không tự tạo route.
- Frontend sẽ render card và button dựa trên metadata.

4. Nếu thiếu tham số cần thiết:
Ví dụ:
- thiếu quận/huyện
- thiếu ngày
- thiếu khung giờ

hãy hỏi lại người dùng trước khi gọi tool.

5. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn và sử dụng Markdown.

Ví dụ:
"Tôi tìm thấy 3 sân phù hợp với yêu cầu của bạn. Bạn có thể xem chi tiết các sân bên dưới."`;

export interface ChatResponse {
  role: 'assistant';
  content: string;
  metadata?: {
    type: string;
    items: unknown[];
  } | null;
}

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
function toGeminiContents(
  messages: { role: string; content?: string | null }[],
) {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));
}

export class ChatService {
  static async handleChat(
    messages: ChatMessage[],
    userId?: string,
  ): Promise<ChatResponse> {
    const genAI = await getGemini();
    const model = Env.CHAT_MODEL || 'gemini-2.5-flash';

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

    const userContext = userId
      ? `\nLưu ý: Người dùng HIỆN TẠI ĐÃ ĐĂNG NHẬP (ID: ${userId}). Bạn có thể sử dụng các tool cá nhân để lấy thông tin của họ.`
      : `\nLưu ý: Người dùng HIỆN TẠI CHƯA ĐĂNG NHẬP. Nếu họ hỏi về thông tin cá nhân như "lịch sử đặt sân của tôi" hoặc "các booking của tôi", hãy lịch sự yêu cầu họ đăng nhập trước.`;

    const systemInstruction = SYSTEM_PROMPT + userContext;

    // Vòng 1: gọi LLM kèm tools
    const response = await genAI.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
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
        userId,
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
          systemInstruction,
        },
      });

      return {
        role: 'assistant',
        content: secondResponse.text ?? '',
        metadata: functionResponse,
      };
    }

    return {
      role: 'assistant',
      content: response.text ?? '',
      metadata: null,
    };
  }
}
