import { BookingStatus, FieldStatus } from '@prisma/client';
import prisma from '../../../../lib/prisma';

export class ToolExecutor {
  static readonly tools = [
    {
      type: 'function',
      function: {
        name: 'searchFootballFields',
        description: 'Tìm kiếm sân bóng theo khu vực (quận/huyện), loại sân, và khoảng giá',
        parameters: {
          type: 'object',
          properties: {
            district: { type: 'string', description: 'Tên quận/huyện, vd: Quận 7' },
            fieldType: { type: 'string', enum: ['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE'] },
            maxPrice: { type: 'number', description: 'Mức giá tối đa' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'checkBooking',
        description: 'Kiểm tra trạng thái đặt sân bằng ID',
        parameters: {
          type: 'object',
          properties: {
            bookingId: { type: 'string', description: 'Mã đặt sân (UUID)' }
          },
          required: ['bookingId']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'getFieldInformation',
        description: 'Lấy thông tin chi tiết của một sân bóng cụ thể bằng ID',
        parameters: {
          type: 'object',
          properties: {
            fieldId: { type: 'string', description: 'Mã sân bóng (UUID)' }
          },
          required: ['fieldId']
        }
      }
    }
  ];

  static async executeTool(name: string, args: any): Promise<string> {
    try {
      if (name === 'searchFootballFields') {
        // ponytail: lazy query for fields matching district
        const fields = await prisma.footballField.findMany({
          where: {
            district: args.district ? { contains: args.district, mode: 'insensitive' } : undefined,
            status: FieldStatus.ACTIVE,
            yards: args.fieldType ? { some: { type: args.fieldType } } : undefined
          },
          select: { id: true, name: true, address: true, district: true, yards: { select: { type: true, priceRules: true } } },
          take: 5
        });
        return JSON.stringify(fields);
      }

      if (name === 'checkBooking') {
        const booking = await prisma.booking.findUnique({
          where: { id: args.bookingId, deletedAt: null, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
          select: { status: true, paymentStatus: true, bookingDate: true, startTime: true, endTime: true }
        });
        return JSON.stringify(booking || { error: 'Không tìm thấy booking' });
      }

      if (name === 'getFieldInformation') {
        const field = await prisma.footballField.findUnique({
          where: { id: args.fieldId, deletedAt: null, status: FieldStatus.ACTIVE },
          include: { yards: true }
        });
        return JSON.stringify(field || { error: 'Không tìm thấy sân' });
      }

      return JSON.stringify({ error: `Tool ${name} not implemented` });
    } catch (err: any) {
      return JSON.stringify({ error: err.message });
    }
  }
}
