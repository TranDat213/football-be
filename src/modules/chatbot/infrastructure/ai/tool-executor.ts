import { BookingStatus, FieldStatus } from '@prisma/client';
import prisma from '../../../../lib/prisma';

export class ToolExecutor {
  static readonly tools = [
    {
      type: 'function',
      function: {
        name: 'searchFootballFields',
        description:
          'Tìm kiếm sân bóng theo khu vực (quận/huyện), loại sân, và khoảng giá',
        parameters: {
          type: 'object',
          properties: {
            district: {
              type: 'string',
              description: 'Tên quận/huyện, vd: Quận 7',
            },
            fieldType: {
              type: 'string',
              enum: ['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE'],
              description: 'Loại sân: FIVE_A_SIDE (sân 5), SEVEN_A_SIDE (sân 7), ELEVEN_A_SIDE (sân 11)',
            },
            maxPrice: { type: 'number', description: 'Mức giá tối đa' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'checkBooking',
        description: 'Kiểm tra trạng thái đặt sân bằng ID',
        parameters: {
          type: 'object',
          properties: {
            bookingId: { type: 'string', description: 'Mã đặt sân (UUID)' },
          },
          required: ['bookingId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getFieldInformation',
        description: 'Lấy thông tin chi tiết của một sân bóng cụ thể bằng ID',
        parameters: {
          type: 'object',
          properties: {
            fieldId: { type: 'string', description: 'Mã sân bóng (UUID)' },
          },
          required: ['fieldId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getUserBookings',
        description:
          'Xem danh sách lịch sử đặt sân của chính người dùng hiện tại (yêu cầu đã đăng nhập)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getCasualMatches',
        description:
          'Tìm các trận vãng lai (đá ghép công khai) đang mở đăng ký tham gia',
        parameters: {
          type: 'object',
          properties: {
            district: { type: 'string', description: 'Tên quận/huyện cần tìm' },
            skillLevel: {
              type: 'string',
              enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ANY'],
              description: 'Trình độ yêu cầu',
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'searchFieldsByTimeSlot',
        description:
          'Tìm kiếm các sân và khung giờ còn trống trong ngày cụ thể',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description:
                'Ngày muốn chơi sân, định dạng YYYY-MM-DD (vd: 2026-07-22)',
            },
            district: { type: 'string', description: 'Tên quận/huyện cần tìm, vd: Quận 7' },
            fieldType: {
              type: 'string',
              enum: ['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE'],
              description: 'Loại sân: FIVE_A_SIDE (sân 5), SEVEN_A_SIDE (sân 7), ELEVEN_A_SIDE (sân 11)',
            },
          },
          required: ['date'],
        },
      },
    },
  ];

  static async executeTool(
    name: string,
    args: any,
    userId?: string,
  ): Promise<any> {
    const formatTime = (date: Date): string => {
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    try {
      //tìm các sân bóng theo khu vực
      if (name === 'searchFootballFields') {
        const fields = await prisma.footballField.findMany({
          where: {
            district: args.district
              ? { contains: args.district, mode: 'insensitive' }
              : undefined,
            status: FieldStatus.ACTIVE,
            yards: args.fieldType
              ? { some: { type: args.fieldType } }
              : undefined,
          },
          include: {
            images: {
              select: { url: true },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
            yards: {
              include: {
                timeSlots: {
                  include: { priceRule: true },
                },
              },
            },
          },
          take: 5,
        });

        const items = fields.map((field) => {
          let minPrice: number | undefined = undefined;
          for (const yard of field.yards) {
            for (const slot of yard.timeSlots) {
              if (slot.priceRule) {
                const priceVal = Number(slot.priceRule.price);
                if (minPrice === undefined || priceVal < minPrice) {
                  minPrice = priceVal;
                }
              }
            }
          }

          return {
            id: field.id,
            name: field.name,
            address: field.address,
            district: field.district,
            image: field.images?.[0]?.url,
            minPrice,
          };
        });

        return {
          type: 'football_fields',
          items,
        };
      }

      //kiểm tra trạng thái đặt sân
      if (name === 'checkBooking') {
        const booking = await prisma.booking.findUnique({
          where: { id: args.bookingId, deletedAt: null },
          include: {
            fieldYard: {
              include: {
                footballField: true,
              },
            },
          },
        });

        if (!booking) {
          return {
            type: 'bookings',
            items: [],
          };
        }

        return {
          type: 'bookings',
          items: [
            {
              id: booking.id,
              fieldId: booking.fieldYard.footballField.id,
              fieldName: booking.fieldYard.footballField.name,
              bookingDate: booking.bookingDate.toISOString().split('T')[0],
              startTime: formatTime(booking.startTime),
              endTime: formatTime(booking.endTime),
              status: booking.status,
              paymentStatus: booking.paymentStatus,
            },
          ],
        };
      }

      //lấy thông tin sân bóng cụ thể
      if (name === 'getFieldInformation') {
        const field = await prisma.footballField.findUnique({
          where: {
            id: args.fieldId,
            deletedAt: null,
            status: FieldStatus.ACTIVE,
          },
          include: {
            images: {
              select: { url: true },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
            yards: {
              include: {
                timeSlots: {
                  include: { priceRule: true },
                },
              },
            },
          },
        });

        if (!field) {
          return {
            type: 'football_fields',
            items: [],
          };
        }

        let minPrice: number | undefined = undefined;
        for (const yard of field.yards) {
          for (const slot of yard.timeSlots) {
            if (slot.priceRule) {
              const priceVal = Number(slot.priceRule.price);
              if (minPrice === undefined || priceVal < minPrice) {
                minPrice = priceVal;
              }
            }
          }
        }

        return {
          type: 'football_fields',
          items: [
            {
              id: field.id,
              name: field.name,
              address: field.address,
              district: field.district,
              image: field.images?.[0]?.url,
              minPrice,
            },
          ],
        };
      }

      //lấy lịch sử đặt sân của người dùng
      if (name === 'getUserBookings') {
        if (!userId) {
          return {
            type: 'bookings',
            items: [],
          };
        }

        const bookings = await prisma.booking.findMany({
          where: {
            userId: userId,
            deletedAt: null,
          },
          include: {
            fieldYard: {
              include: {
                footballField: true,
              },
            },
          },
          orderBy: {
            bookingDate: 'desc',
          },
          take: 10,
        });

        return {
          type: 'bookings',
          items: bookings.map((b) => ({
            id: b.id,
            fieldId: b.fieldYard.footballField.id,
            fieldName: b.fieldYard.footballField.name,
            bookingDate: b.bookingDate.toISOString().split('T')[0],
            startTime: formatTime(b.startTime),
            endTime: formatTime(b.endTime),
            status: b.status,
            paymentStatus: b.paymentStatus,
          })),
        };
      }

      //lấy danh sách các trận vãng lai đang mở đăng ký tham gia
      if (name === 'getCasualMatches') {
        const matches = await prisma.casualMatch.findMany({
          where: {
            status: 'OPEN',
            visibility: 'PUBLIC',
            deletedAt: null,
            skillLevel: args.skillLevel ? args.skillLevel : undefined,
            booking: args.district
              ? {
                  fieldYard: {
                    footballField: {
                      district: {
                        contains: args.district,
                        mode: 'insensitive',
                      },
                    },
                  },
                }
              : undefined,
          },
          include: {
            booking: {
              include: {
                fieldYard: {
                  include: {
                    footballField: true,
                  },
                },
              },
            },
          },
          take: 5,
        });

        return {
          type: 'casual_matches',
          items: matches.map((m) => ({
            id: m.id,
            title: m.title || '',
            fieldId: m.booking.fieldYard.footballField.id,
            fieldName: m.booking.fieldYard.footballField.name,
            matchDate: m.booking.bookingDate.toISOString().split('T')[0],
            startTime: formatTime(m.booking.startTime),
            endTime: formatTime(m.booking.endTime),
            slotPrice: Number(m.slotPrice),
            currentPlayers: m.occupiedSlots,
            maxPlayers: m.totalSlots,
            level: m.skillLevel,
          })),
        };
      }

      // tìm sân theo khung giờ
      if (name === 'searchFieldsByTimeSlot') {
        const targetDate = new Date(args.date);

        const fields = await prisma.footballField.findMany({
          where: {
            district: args.district
              ? { contains: args.district, mode: 'insensitive' }
              : undefined,
            status: FieldStatus.ACTIVE,
            deletedAt: null,
          },
          include: {
            images: {
              select: { url: true },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
            yards: {
              where: { deletedAt: null, status: 'ACTIVE' },
              include: {
                timeSlots: {
                  where: { deletedAt: null },
                  include: { priceRule: true },
                },
                bookings: {
                  where: {
                    bookingDate: targetDate,
                    status: {
                      in: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
                    },
                    deletedAt: null,
                  },
                },
              },
            },
          },
          take: 5,
        });

        const items = fields
          .map((field) => {
            const availableYards = field.yards
              .map((yard) => {
                const bookedTimes = yard.bookings.map((b) =>
                  formatTime(b.startTime),
                );

                const freeSlots = yard.timeSlots.filter((slot) => {
                  const slotStart = formatTime(slot.startTime);
                  return !bookedTimes.includes(slotStart);
                });

                return {
                  yardId: yard.id,
                  freeSlotsCount: freeSlots.length,
                };
              })
              .filter((y) => y.freeSlotsCount > 0);

            if (availableYards.length === 0) return null;

            let minPrice: number | undefined = undefined;
            for (const yard of field.yards) {
              for (const slot of yard.timeSlots) {
                if (slot.priceRule) {
                  const priceVal = Number(slot.priceRule.price);
                  if (minPrice === undefined || priceVal < minPrice) {
                    minPrice = priceVal;
                  }
                }
              }
            }

            return {
              id: field.id,
              name: field.name,
              address: field.address,
              district: field.district,
              image: field.images?.[0]?.url,
              minPrice,
            };
          })
          .filter((f): f is NonNullable<typeof f> => f !== null);

        return {
          type: 'football_fields',
          items,
        };
      }

      return {
        type: 'error',
        items: [],
        error: `Tool ${name} not implemented`,
      };
    } catch (err: any) {
      return { type: 'error', items: [], error: err.message };
    }
  }
}
