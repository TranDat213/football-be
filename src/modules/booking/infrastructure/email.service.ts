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
    const mailOptions = {
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
    };

    return await this.transporter.sendMail(mailOptions);
  }
}
