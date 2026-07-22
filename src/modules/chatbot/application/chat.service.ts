import { getGemini } from '../infrastructure/ai/openai-client';
import { SearchDocument } from '../infrastructure/rag/search-document';
import { ToolExecutor } from '../infrastructure/ai/tool-executor';
import { ChatMessage } from '../domain/chat-message';
import { Env } from '@/config/env.config';
import prisma from '@/lib/prisma';

const SYSTEM_PROMPT = `Bạn là AI Assistant của hệ thống đặt sân bóng (FootballHub).

NHIỆM VỤ:
1. Hiểu ngôn ngữ tự nhiên của người dùng để giải đáp thắc mắc (FAQ, quy định, hướng dẫn) hoặc thực hiện tìm kiếm / tra cứu dữ liệu realtime bằng cách BẮT BUỘC gọi Function Tool.
2. Trích xuất các thông tin tìm kiếm từ câu nói của người dùng:
  + date: Ngày chơi (định dạng YYYY-MM-DD)
  + time: Khung giờ chơi (định dạng HH:mm, ví dụ 19:00, 18:00, 08:00, 21:00)
  + district: Tên Quận/Huyện (ví dụ "Quận 7", "Thủ Đức"...)
  + yardType/fieldType: Loại sân (FIVE_A_SIDE cho sân 5, SEVEN_A_SIDE cho sân 7, ELEVEN_A_SIDE cho sân 11)
  + keyword: Từ khóa tìm kiếm khác (nếu có)

QUY TẮC HIỂU THỜI GIAN:
- "hôm nay" / "tối nay" => current_date
- "ngày mai" => current_date + 1 ngày
- "mốt" => current_date + 2 ngày
- "cuối tuần" => Thứ 7 gần nhất trong tuần
- "7h tối" => 19:00, "6h chiều" => 18:00, "8h sáng" => 08:00, "9h đêm" => 21:00

QUY TẮC GỌI FUNCTION TOOL VÀ NGUYÊN TẮC KHÔNG HỎI LẠI (CỰC KỲ QUAN TRỌNG):
1. BẮT BUỘC tự tính toán quy đổi thời gian tự nhiên thành ngày YYYY-MM-DD chính xác dựa trên THÔNG TIN THỜI GIAN HỆ THỐNG được cung cấp bên dưới.
2. KHÔNG HỎI LẠI NGÀY nếu người dùng đã sử dụng các cụm từ chỉ thời gian như:
   - hôm nay
   - tối nay
   - ngày mai
   - mốt
   - cuối tuần
3. CHỈ hỏi lại khi THỰC SỰ THIẾU DỮ LIỆU CỐT LÕI không thể thực hiện tìm kiếm tối thiểu (ví dụ người dùng chỉ nói chung chung "tìm sân" mà hoàn toàn không có địa điểm lẫn thời gian).
4. Nếu người dùng đưa ra các thông tin tìm kiếm khả thi (ví dụ chỉ có Quận 7, hoặc có Tối nay + Quận 7), HÃY GỌI TOOL NGAY VỚI THAM SỐ THU ĐƯỢC. Không bắt người dùng khai báo đủ tất cả các trường thông tin mới tìm kiếm.

QUY TẮC TRẢ LỜI:
- Nếu Tool trả về dữ liệu có cấu trúc: Chỉ tóm tắt kết quả bằng ngôn ngữ tự nhiên, thân thiện, ngắn gọn và sử dụng Markdown. Không lặp lại toàn bộ JSON thô. Không tự tạo URL hoặc route (Frontend sẽ tự hiển thị giao diện card/button dựa vào metadata).
- Không tự suy đoán hay bịa đặt dữ liệu realtime nếu không gọi tool.`;

function getCurrentDateContext(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const weekday = parts.find((p) => p.type === 'weekday')?.value;

  const currentDate = `${year}-${month}-${day}`;

  const dToday = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

  const dTomorrow = new Date(dToday);
  dTomorrow.setDate(dTomorrow.getDate() + 1);
  const dateTomorrow = dTomorrow.toISOString().split('T')[0];

  const dDayAfterTomorrow = new Date(dToday);
  dDayAfterTomorrow.setDate(dDayAfterTomorrow.getDate() + 2);
  const dateDayAfterTomorrow = dDayAfterTomorrow.toISOString().split('T')[0];

  const dayOfWeek = dToday.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const dWeekend = new Date(dToday);
  dWeekend.setDate(dWeekend.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday));
  const dateWeekend = dWeekend.toISOString().split('T')[0];

  return `\n\nTHÔNG TIN THỜI GIAN HỆ THỐNG HIỆN TẠI (GMT+7):
- Current date (hôm nay / tối nay): ${currentDate} (${weekday})
- Ngày mai (current_date + 1): ${dateTomorrow}
- Mốt (current_date + 2): ${dateDayAfterTomorrow}
- Cuối tuần (Thứ 7 gần nhất): ${dateWeekend}`;
}

async function getAvailableLocationsContext(): Promise<string> {
  try {
    const fields = await prisma.footballField.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { district: true, province: true },
      distinct: ['district', 'province'],
    });

    const districts = Array.from(
      new Set(fields.map((f: { district: string; province: string }) => f.district).filter(Boolean)),
    );
    const provinces = Array.from(
      new Set(fields.map((f: { district: string; province: string }) => f.province).filter(Boolean)),
    );

    if (districts.length === 0 && provinces.length === 0) return '';

    return `\n\nDANH SÁCH KHU VỰC CÓ SÂN BÓNG HIỆN TẠI TRÊN HỆ THỐNG:
- Quận/Huyện có sân: ${districts.join(', ')}
- Tỉnh/Thành có sân: ${provinces.join(', ')}`;
  } catch {
    return '';
  }
}

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

    const locationContext = await getAvailableLocationsContext();
    const systemInstruction = SYSTEM_PROMPT + getCurrentDateContext() + locationContext + userContext;

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
