/**
 * Seed chatbot training documents vào system_documents.
 * Chạy: npx ts-node prisma/seeds/seed-chatbot-docs.ts
 *
 * Yêu cầu: GEMINI_API_KEY trong .env
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';

const prisma = new PrismaClient();
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─────────────────────────────────────────────────────────────
// Nội dung training — chỉnh sửa tại đây để thêm tài liệu mới
// ─────────────────────────────────────────────────────────────

const DOCUMENTS: { title: string; content: string; category: string }[] = [
  // ═══════════════════════════════════════
  // CATEGORY: faq — Câu hỏi thường gặp
  // ═══════════════════════════════════════
  {
    category: 'faq',
    title: 'Làm thế nào để đặt sân bóng?',
    content: `Để đặt sân bóng trên hệ thống ChanDenClub, bạn thực hiện theo các bước sau:
1. Đăng nhập vào tài khoản (hoặc đăng ký nếu chưa có).
2. Vào trang "Tìm sân", nhập khu vực, loại sân  và thời gian mong muốn.
3. Chọn sân phù hợp từ danh sách kết quả.
4. Chọn ngày và khung giờ trống.
5. Xác nhận thông tin đặt sân và tiến hành thanh toán.
6. Sau khi thanh toán thành công, bạn sẽ nhận thông báo xác nhận booking.`,
  },
  {
    category: 'faq',
    title: 'Tôi có thể đặt sân trước bao lâu?',
    content: `Bạn có thể đặt sân trước tối đa 30 ngày kể từ ngày hiện tại. Điều này giúp bạn chủ động lên kế hoạch cho các trận đấu quan trọng. Một số sân có thể cho phép đặt xa hơn tùy theo chính sách của chủ sân.`,
  },
  {
    category: 'faq',
    title: 'Sân 5 người, 7 người, 11 người khác nhau như thế nào?',
    content: `Hệ thống hỗ trợ 3 loại sân:
- Sân 5 người: Diện tích nhỏ, phù hợp nhóm bạn nhỏ hoặc luyện tập kỹ thuật. Giá thường từ 150.000 - 300.000 VNĐ/giờ.
- Sân 7 người : Kích thước trung bình, phổ biến nhất. Giá thường từ 250.000 - 500.000 VNĐ/giờ.
- Sân 11 người: Sân tiêu chuẩn, phù hợp thi đấu chính thức. Giá thường từ 500.000 - 1.500.000 VNĐ/giờ.
Khi tìm sân, bạn có thể lọc theo loại sân mong muốn.`,
  },
  {
    category: 'faq',
    title: 'Tôi không thấy sân trống trong khung giờ muốn đặt, phải làm sao?',
    content: `Nếu không tìm thấy sân trống trong khung giờ mong muốn, bạn có thể:
1. Thử tìm kiếm sân ở quận/khu vực lân cận.
2. Điều chỉnh khung giờ sang sớm hơn hoặc muộn hơn.
3. Thay đổi loại sân (ví dụ từ sân 7 người sang sân 5 người).
4. Kiểm tra lại vào ngày khác trong tuần.
Bạn cũng có thể liên hệ trực tiếp với chủ sân để hỏi về khả năng sắp xếp.`,
  },
  {
    category: 'faq',
    title: 'Tôi có thể đặt nhiều sân cùng lúc không?',
    content: `Có, bạn hoàn toàn có thể đặt nhiều sân khác nhau trong cùng một tài khoản. Mỗi lần đặt sân tạo ra một booking độc lập. Bạn có thể xem toàn bộ lịch sử booking trong mục "Lịch sử đặt sân" trên tài khoản của mình.`,
  },
  {
    category: 'faq',
    title: 'Làm thế nào để xem trạng thái booking của tôi?',
    content: `Bạn có thể kiểm tra trạng thái booking theo 2 cách:
1. Vào mục "Lịch sử đặt sân" trên tài khoản → chọn booking cần xem.
2. Hỏi AI chatbot: nhập "Kiểm tra booking [mã booking]" để tra cứu nhanh.
Các trạng thái booking bao gồm:
- Đang chờ thanh toán
- Đã xác nhận, thanh toán thành công
- Đã hủy
- Đã hoàn thành (đã chơi)`,
  },
  {
    category: 'faq',
    title: 'Tôi quên mật khẩu, làm thế nào để lấy lại?',
    content: `Để lấy lại mật khẩu, bạn thực hiện:
1. Vào trang đăng nhập, nhấn "Quên mật khẩu".
2. Nhập địa chỉ email đã đăng ký.
3. Kiểm tra hộp thư (bao gồm spam) để nhận email đặt lại mật khẩu.
4. Nhấn vào link trong email và tạo mật khẩu mới.
Link đặt lại mật khẩu có hiệu lực trong 24 giờ.`,
  },
  {
    category: 'faq',
    title: 'Sân tôi đặt có hỗ trợ gì thêm không (đèn chiếu sáng, phòng thay đồ)?',
    content: `Tiện ích của từng sân được hiển thị trong trang chi tiết sân (nhà giữ xe, nhà vệ sinh, phòng thay đồ, đèn chiếu sáng, bình nước miễn phí, v.v.). Bạn có thể xem thông tin này trước khi đặt. Nếu cần hỏi thêm về tiện ích cụ thể, vui lòng liên hệ chủ sân qua thông tin hiển thị trên trang sân.`,
  },

  // ═══════════════════════════════════════
  // CATEGORY: policy — Chính sách
  // ═══════════════════════════════════════
  {
    category: 'policy',
    title: 'Chính sách hủy đặt sân',
    content: `Chính sách hủy đặt sân của ChanDenClub:
- Hủy trước 24 giờ so với giờ chơi: Hoàn tiền 100%.
- Hủy trong vòng 12-24 giờ trước giờ chơi: Hoàn tiền 50%.
- Hủy trong vòng dưới 12 giờ trước giờ chơi: Không hoàn tiền.
- Trường hợp sân bị đóng cửa do sự cố (ngập nước, sự cố kỹ thuật): Hoàn tiền 100%.
Để hủy booking, vào mục "Lịch sử đặt sân" → chọn booking → nhấn "Hủy đặt sân".`,
  },
  {
    category: 'policy',
    title: 'Chính sách hoàn tiền',
    content: `Thời gian xử lý hoàn tiền sau khi hủy booking:
- Thanh toán qua VNPay: Hoàn tiền trong 3-7 ngày làm việc về tài khoản ngân hàng.
- Thanh toán qua ví điện tử: Hoàn tiền trong 1-3 ngày làm việc về ví.
Lưu ý: Tiền hoàn sẽ được trả về đúng phương thức thanh toán ban đầu. Nếu sau 7 ngày chưa nhận được tiền, vui lòng liên hệ support qua email hoặc hotline.`,
  },
  {
    category: 'policy',
    title: 'Tôi có thể thay đổi lịch đặt sân không?',
    content: `Hiện tại hệ thống không hỗ trợ thay đổi lịch trực tiếp. Nếu bạn muốn đổi ngày/giờ chơi, bạn cần:
1. Hủy booking hiện tại (áp dụng chính sách hủy theo thời gian).
2. Tạo booking mới với lịch mới.
Khuyến nghị hủy sớm (trước 24 giờ) để được hoàn tiền 100% và đặt lại ngay.`,
  },
  {
    category: 'policy',
    title: 'Điều khoản sử dụng dịch vụ',
    content: `Khi sử dụng ChanDenClub, người dùng đồng ý với các điều khoản sau:
- Cung cấp thông tin chính xác khi đăng ký và đặt sân.
- Không sử dụng tài khoản với mục đích gian lận, tạo booking ảo.
- Tôn trọng quy định của từng sân bóng (giờ chơi, hành vi trong sân).
- ChanDenClub có quyền khóa tài khoản vi phạm mà không cần thông báo trước.
- Mọi tranh chấp liên quan đến chất lượng sân cần phản ánh trong vòng 24 giờ sau khi chơi.`,
  },
  {
    category: 'policy',
    title: 'Chính sách bảo mật thông tin',
    content: `ChanDenClub cam kết bảo vệ thông tin cá nhân của người dùng:
- Thông tin cá nhân (tên, email, số điện thoại) chỉ dùng cho mục đích đặt sân và liên lạc.
- Không chia sẻ thông tin cho bên thứ ba ngoài mục đích vận hành dịch vụ (ngân hàng, cổng thanh toán).
- Người dùng có quyền yêu cầu xóa tài khoản và dữ liệu bất cứ lúc nào.
- Hệ thống sử dụng HTTPS và mã hóa để bảo vệ giao dịch.`,
  },

  // ═══════════════════════════════════════
  // CATEGORY: guide — Hướng dẫn sử dụng
  // ═══════════════════════════════════════
  {
    category: 'guide',
    title: 'Hướng dẫn đăng ký tài khoản',
    content: `Để đăng ký tài khoản ChanDenClub:
1. Truy cập trang web hoặc mở app ChanDenClub.
2. Nhấn "Đăng ký".
3. Điền thông tin: Họ tên, email, số điện thoại, mật khẩu.
4. Xác nhận email (kiểm tra hộp thư).
5. Đăng nhập và bắt đầu sử dụng.
Bạn cũng có thể đăng nhập nhanh bằng tài khoản Google.`,
  },
  {
    category: 'guide',
    title: 'Hướng dẫn tìm kiếm sân bóng',
    content: `Có nhiều cách tìm sân trên ChanDenClub:
- Tìm theo khu vực: Nhập tỉnh/thành phố và quận/huyện vào ô tìm kiếm.
- Tìm theo loại sân: Lọc sân 5, 7 hoặc 11 người.
- Tìm theo giá: Thiết lập khoảng giá phù hợp với ngân sách.
- Tìm theo thời gian: Chọn ngày và giờ muốn chơi để xem sân trống.
- Hỏi chatbot: Gõ "Tìm sân ở [quận/khu vực]" để chatbot gợi ý ngay.`,
  },
  {
    category: 'guide',
    title: 'Hướng dẫn thanh toán đặt sân',
    content: `ChanDenClub hỗ trợ thanh toán qua VNPay . Quy trình:
1. Sau khi chọn sân và khung giờ, nhấn "Đặt sân".
2. Kiểm tra thông tin booking.
3. Nhấn "Thanh toán" → Chọn phương thức thanh toán.
4. Hoàn thành thanh toán trên cổng VNPay.
5. Quay lại app → Nhận thông báo xác nhận thành công.
Lưu ý: Hoàn tất thanh toán trong vòng 15 phút sau khi tạo booking, nếu không booking sẽ tự hủy.`,
  },
  {
    category: 'guide',
    title: 'Cách đăng ký trở thành chủ sân trên ChanDenClub',
    content: `Nếu bạn sở hữu sân bóng và muốn đăng ký lên ChanDenClub:
1. Đăng nhập tài khoản → Vào "Đăng ký chủ sân".
2. Điền thông tin sân: tên, địa chỉ, loại sân, giờ mở cửa, giá.
3. Tải lên hình ảnh sân .
4. Gửi yêu cầu duyệt. Admin sẽ xem xét trong 1-3 ngày làm việc.
5. Sau khi duyệt, sân của bạn sẽ xuất hiện trong danh sách tìm kiếm.
Hoa hồng nền tảng: ChanDenClub thu 10% trên mỗi giao dịch thành công.`,
  },
  {
    category: 'guide',
    title: 'Cách viết đánh giá sân bóng',
    content: `Sau khi hoàn thành một buổi chơi (booking có trạng thái COMPLETED), bạn có thể:
1. Vào "Lịch sử đặt sân" → chọn booking đã hoàn thành.
2. Nhấn "Viết đánh giá".
3. Chấm điểm từ 1-5 sao và nhập nhận xét.
4. Nhấn "Gửi đánh giá".
Đánh giá của bạn giúp người dùng khác có thêm thông tin khi chọn sân.`,
  },

  // ═══════════════════════════════════════
  // CATEGORY: pricing — Giá cả & Thanh toán
  // ═══════════════════════════════════════
  {
    category: 'pricing',
    title: 'Giá thuê sân bóng trung bình là bao nhiêu?',
    content: `Giá thuê sân bóng trên ChanDenClub dao động tùy loại sân và khu vực:
- Sân 5 người: 150.000 - 350.000 VNĐ/giờ
- Sân 7 người: 250.000 - 600.000 VNĐ/giờ
- Sân 11 người: 500.000 - 1.500.000 VNĐ/giờ
Giờ cao điểm (17h-21h các ngày trong tuần, cả ngày cuối tuần) thường cao hơn giờ thấp điểm khoảng 20-50%. Giá cụ thể hiển thị trên từng sân khi đặt.`,
  },
  {
    category: 'pricing',
    title: 'Giờ cao điểm và thấp điểm là gì? Có ảnh hưởng đến giá không?',
    content: `Phần lớn các sân áp dụng 2 mức giá:
- Giờ thấp điểm: Thường từ 6h-16h các ngày thường (Thứ 2 - Thứ 6). Giá thấp hơn, thích hợp nếu bạn linh hoạt về giờ chơi.
- Giờ cao điểm: Từ 17h-22h các ngày thường và cả ngày cuối tuần. Giá cao hơn do nhu cầu nhiều.
Khung giờ và mức giá cụ thể hiển thị rõ khi bạn chọn sân và ngày đặt.`,
  },
  {
    category: 'pricing',
    title: 'ChanDenClub có khuyến mãi hoặc giảm giá không?',
    content: `ChanDenClub định kỳ có các chương trình khuyến mãi:
- Ưu đãi người dùng mới: Giảm 10-20% cho lần đặt sân đầu tiên.
- Flash sale: Một số sân giảm giá vào giờ thấp điểm chưa được đặt.
- Combo đặt nhiều: Đặt từ 5 buổi trở lên tại một sân → có thể thỏa thuận giá ưu đãi trực tiếp với chủ sân.
Các khuyến mãi hiện tại được thông báo trên trang chủ và qua email đăng ký.`,
  },
  {
    category: 'pricing',
    title: 'Tôi có thể thanh toán tiền mặt không?',
    content: `Hiện tại ChanDenClub chỉ hỗ trợ thanh toán online qua VNPay (bao gồm ATM nội địa, Visa/Mastercard, và các ví điện tử như MoMo, ZaloPay). Chưa hỗ trợ thanh toán tiền mặt trực tiếp qua nền tảng. Nếu muốn thanh toán tiền mặt, bạn có thể liên hệ trực tiếp với chủ sân (không qua ChanDenClub).`,
  },

  // ═══════════════════════════════════════
  // CATEGORY: casual_match — Trận Vãng Lai
  // ═══════════════════════════════════════
  {
    category: 'casual_match',
    title: 'Trận vãng lai là gì?',
    content: `Trận vãng lai là tính năng giúp bạn tạo một trận đấu công khai để rủ người khác cùng chơi, ngay cả khi không đủ người quen. Cách hoạt động:
1. Bạn đã đặt sân thành công .
2. Bạn tạo "Trận vãng lai" từ booking đó, đặt tiêu đề, mô tả, mức giá chia sẻ .
3. Người dùng khác có thể thấy trận của bạn, đăng ký tham gia và thanh toán phần của họ.
4. Bạn (host) sẽ nhận lại một phần chi phí từ người tham gia.`,
  },
  {
    category: 'casual_match',
    title: 'Cách tạo trận vãng lai',
    content: `Để tạo trận vãng lai:
1. Đảm bảo bạn đã có booking ở trạng thái CONFIRMED và đã thanh toán.
2. Vào trang chủ → nhấn "Tạo trận ngẫu hứng".
3. Chọn booking muốn tạo trận từ danh sách.
4. Điền thông tin: Tên trận, mô tả, giá mỗi slot, hạn đăng ký, chế độ đội , trình độ yêu cầu.
5. Nhấn "Tạo trận".
Sau khi tạo, trận sẽ xuất hiện trong trang cộng đồng để người khác tìm và tham gia.`,
  },
  {
    category: 'casual_match',
    title: 'Cách tham gia trận vãng lai của người khác',
    content: `Để tham gia một trận vãng lai:
1. Vào trang "Cộng đồng" hoặc tìm kiếm trận vãng lai.
2. Chọn trận phù hợp (xem thông tin: địa điểm, giờ chơi, trình độ, giá/slot).
3. Nhấn "Tham gia" → chọn số slot và team (nếu có).
4. Xác nhận và thanh toán qua VNPay.
5. Sau khi thanh toán thành công, bạn là thành viên chính thức của trận đó.
Lưu ý: Chỉ tham gia được khi còn slot trống và chưa quá hạn đăng ký.`,
  },
  {
    category: 'casual_match',
    title: 'Tôi có thể hủy tham gia trận vãng lai không?',
    content: `Bạn có thể hủy tham gia trận vãng lai trước thời hạn đăng ký. Khi hủy:
- Nếu đã thanh toán: Hoàn tiền theo chính sách hoàn tiền của hệ thống (xem "Chính sách hoàn tiền").
- Nếu chưa thanh toán: Hủy ngay lập tức.
Để hủy: Vào "Trận vãng lai của tôi" → chọn trận → nhấn "Hủy tham gia".
Sau thời hạn đăng ký, không thể hủy tham gia.`,
  },
  {
    category: 'casual_match',
    title: 'Trận vãng lai có các trạng thái gì?',
    content: `Mỗi trận vãng lai có các trạng thái sau:
- Đang mở đăng ký, còn slot trống.
- Đã đủ người, không nhận thêm.
- Đã đóng đăng ký (quá hạn hoặc host đóng thủ công).
- Trận bị hủy bởi host hoặc hệ thống.
- Trận đã diễn ra xong.
Bạn chỉ có thể đăng ký khi trạng thái là Đang mở đăng ký, còn slot trống.`,
  },
  {
    category: 'casual_match',
    title: 'Trình độ chơi trong trận vãng lai có ý nghĩa gì?',
    content: `Khi tạo trận vãng lai, host có thể đặt yêu cầu trình độ:
- (Mới bắt đầu): Phù hợp người mới chơi, mang tính giao lưu.
- (Trung bình): Đã có kinh nghiệm, chơi được ở mức độ vừa phải.
- (Cao): Chơi tốt, phù hợp những người có kỹ năng tốt.
Đây là thông tin để người tham gia tự đánh giá, hệ thống không kiểm tra trình độ thực tế.`,
  },
  {
    category: 'casual_match',
    title: 'Host trận vãng lai có thể chỉnh sửa trận không?',
    content: `Host có thể chỉnh sửa một số thông tin của trận vãng lai nếu chưa có ai đăng ký tham gia:
- Có thể sửa: Tên trận, mô tả, giá slot, hạn đăng ký, chế độ công khai, chế độ đội, trình độ.
- Không thể sửa: Sân bóng, ngày giờ chơi.
- Bị chặn sửa khi: Đã có người tham gia.
Để sửa: Vào "Quản lý trận vãng lai" → chọn trận → nhấn "Chỉnh sửa".`,
  },
  {
    category: 'casual_match',
    title: 'Ai có thể thấy trận vãng lai của tôi?',
    content: `Phụ thuộc vào cài đặt hiển thị (visibility):
- PUBLIC: Mọi người dùng đăng nhập đều có thể thấy và tham gia trận của bạn trong trang cộng đồng.
- PRIVATE: Chỉ những người có link trực tiếp mới xem được, không hiện trên trang cộng đồng công khai.
Bạn có thể chuyển đổi giữa Public/Private miễn là chưa có người đăng ký tham gia.`,
  },

  // ═══════════════════════════════════════
  // CATEGORY: support — Hỗ trợ kỹ thuật
  // ═══════════════════════════════════════
  {
    category: 'support',
    title: 'Tôi gặp lỗi khi thanh toán, phải làm gì?',
    content: `Nếu gặp lỗi trong quá trình thanh toán:
1. Kiểm tra kết nối internet và thử lại.
2. Đảm bảo thẻ/tài khoản ngân hàng có đủ số dư.
3. Nếu tiền đã bị trừ nhưng booking chưa xác nhận: Đừng thanh toán lại. Kiểm tra email xác nhận trong vòng 15 phút. Nếu không có email và tài khoản không có booking CONFIRMED, tiền sẽ tự hoàn trong 1-3 ngày làm việc.
4. Liên hệ support: email support@footballhub.vn hoặc hotline 1800-xxxx (miễn phí).`,
  },
  {
    category: 'support',
    title: 'Làm thế nào để liên hệ hỗ trợ?',
    content: `ChanDenClub hỗ trợ qua nhiều kênh:
- Email: support@footballhub.vn (phản hồi trong 24 giờ làm việc)
- Chat trực tiếp: Nhấn icon chat góc phải màn hình khi đăng nhập.
- Chatbot AI: Trả lời ngay các câu hỏi thường gặp 24/7.
Để xử lý nhanh, vui lòng cung cấp mã booking khi liên hệ về vấn đề đặt sân.`,
  },
  {
    category: 'support',
    title: 'Sân tôi đặt bị đóng cửa vào ngày chơi, phải xử lý thế nào?',
    content: `Trong trường hợp sân đóng cửa đột xuất vào ngày bạn đã đặt:
1. Chủ sân có trách nhiệm thông báo cho bạn sớm nhất qua email/SMS.
2. ChanDenClub sẽ hoàn tiền 100% về phương thức thanh toán ban đầu.
3. Nếu không nhận được thông báo và chủ sân không hoàn tiền: Liên hệ support với bằng chứng (ảnh sân đóng cửa, mã booking).
ChanDenClub cam kết bảo vệ quyền lợi người dùng trong mọi tình huống.`,
  },
];

// ─────────────────────────────────────────────────────────────
// Embedding & Insert helpers
// ─────────────────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  const response = await genAI.models.embedContent({
    model: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
    contents: text,
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error('Empty embedding response');
  return values;
}

async function upsertDocument(doc: { title: string; content: string; category: string }) {
  const text = `${doc.title}\n\n${doc.content}`;
  const embedding = await getEmbedding(text);
  const embeddingStr = `[${embedding.join(',')}]`;

  // Upsert: nếu title + category đã tồn tại thì update, tránh trùng lặp khi chạy lại
  await prisma.$executeRawUnsafe(
    `INSERT INTO system_documents (id, title, content, category, embedding, metadata, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5::jsonb, NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    doc.title,
    doc.content,
    doc.category,
    embeddingStr,
    JSON.stringify({ source: 'seed', version: '1.0' }),
  );
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`🌱 Seeding ${DOCUMENTS.length} chatbot training documents...`);

  for (let i = 0; i < DOCUMENTS.length; i++) {
    const doc = DOCUMENTS[i];
    process.stdout.write(`  [${i + 1}/${DOCUMENTS.length}] ${doc.title.substring(0, 60)}... `);
    try {
      await upsertDocument(doc);
      console.log('✅');
    } catch (err: any) {
      console.log(`❌ ${err.message}`);
    }

    // Rate limit: tránh gọi API Gemini quá nhanh (60 rpm free tier)
    if (i < DOCUMENTS.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log('\n✅ Seed hoàn tất!');
  const count = await prisma.systemDocument.count();
  console.log(`📊 Tổng documents trong system_documents: ${count}`);
}

main()
  .catch((e) => {
    console.error('Seed thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
