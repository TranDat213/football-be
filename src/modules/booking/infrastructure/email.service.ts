import nodemailer from 'nodemailer';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.MAIL_PORT) || 2525,
      auth: {
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASS || '',
      },
    });
  }

  async sendBookingConfirmation(email: string, details: {
    bookingId: string;
    userName: string;
    yardName: string;
    date: string;
    time: string;
    totalPrice: number;
  }) {
    return await this.transporter.sendMail({
      from: '"Football Booking" <no-reply@football.com>',
      to: email,
      subject: `⚽ [Xác Nhận] Đặt sân thành công - #${details.bookingId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #2e7d32;">Đặt Sân Thành Công!</h2>
          <p>Chào <strong>${details.userName}</strong>,</p>
          <p>Cảm ơn bạn đã sử dụng dịch vụ của Football Booking Platform. Đơn đặt sân của bạn đã được xác nhận và thanh toán thành công.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Chi tiết đơn đặt:</h3>
            <p><strong>Mã đơn:</strong> #${details.bookingId}</p>
            <p><strong>Sân:</strong> ${details.yardName}</p>
            <p><strong>Ngày:</strong> ${details.date}</p>
            <p><strong>Giờ:</strong> ${details.time}</p>
            <p><strong>Tổng tiền:</strong> ${details.totalPrice.toLocaleString()} VND</p>
          </div>
          <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với hotline của sân hoặc phản hồi email này.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Chúc bạn có một trận đấu tuyệt vời!<br>
            <strong>Đội ngũ Football Booking</strong>
          </p>
        </div>
      `,
    });
  }

  async sendOwnerCancelBookingEmail(email: string, details: {
    userName: string;
    fieldName: string;
    yardName: string;
    bookingDate: string;
    timeSlot: string;
    cancelledBy: string;
    cancelledAt: string;
    reason: string;
    isPaid: boolean;
  }) {
    const refundNote = details.isPaid
      ? '<p style="color:#e65100;"><strong>Hoàn tiền:</strong> Hệ thống sẽ tiến hành hoàn tiền cho bạn trong vòng 3-5 ngày làm việc.</p>'
      : '';

    return await this.transporter.sendMail({
      from: '"Football Booking" <no-reply@football.com>',
      to: email,
      subject: '⚠️ Thông báo hủy đặt sân',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #c62828;">Thông Báo Hủy Đặt Sân</h2>
          <p>Chào <strong>${details.userName}</strong>,</p>
          <p>Chủ sân đã hủy đơn đặt sân của bạn. Dưới đây là thông tin chi tiết:</p>
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e65100;">
            <h3 style="margin-top: 0; color: #333;">Chi tiết đơn bị hủy:</h3>
            <p><strong>Tên sân:</strong> ${details.fieldName}</p>
            <p><strong>Sân con:</strong> ${details.yardName}</p>
            <p><strong>Ngày đặt:</strong> ${details.bookingDate}</p>
            <p><strong>Khung giờ:</strong> ${details.timeSlot}</p>
            <p><strong>Người hủy:</strong> ${details.cancelledBy}</p>
            <p><strong>Thời gian hủy:</strong> ${details.cancelledAt}</p>
            <p><strong>Lý do:</strong> ${details.reason}</p>
          </div>
          ${refundNote}
          <p>Nếu có thắc mắc, vui lòng liên hệ hỗ trợ.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Xin lỗi vì sự bất tiện này.<br>
            <strong>Đội ngũ Football Booking</strong>
          </p>
        </div>
      `,
    });
  }

  async sendOwnerApprovedEmail(email: string, details: { userName: string }) {
    return await this.transporter.sendMail({
      from: '"Football Booking" <no-reply@football.com>',
      to: email,
      subject: '✅ Tài khoản chủ sân đã được phê duyệt',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #2e7d32;">Chúc Mừng! Tài Khoản Chủ Sân Được Phê Duyệt</h2>
          <p>Chào <strong>${details.userName}</strong>,</p>
          <p>Yêu cầu đăng ký chủ sân của bạn đã được Admin phê duyệt. Bạn có thể đăng nhập và bắt đầu quản lý sân bóng ngay bây giờ.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Đội ngũ Football Booking</strong>
          </p>
        </div>
      `,
    });
  }

  async sendFieldApprovedEmail(email: string, details: { ownerName: string; fieldName: string }) {
    return await this.transporter.sendMail({
      from: '"Football Booking" <no-reply@football.com>',
      to: email,
      subject: `✅ Sân bóng "${details.fieldName}" đã được phê duyệt`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #2e7d32;">Sân Bóng Được Phê Duyệt</h2>
          <p>Chào <strong>${details.ownerName}</strong>,</p>
          <p>Sân bóng <strong>${details.fieldName}</strong> của bạn đã được Admin phê duyệt và hiện đang hoạt động trên hệ thống.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Đội ngũ Football Booking</strong>
          </p>
        </div>
      `,
    });
  }
}
