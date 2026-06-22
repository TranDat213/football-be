import crypto from 'crypto';
import qs from 'qs';
import { format } from 'date-fns';

export class VNPayService {
  private tmnCode = process.env.VNP_TMN_CODE || 'PLACEHOLDER';
  private secretKey = process.env.VNP_HASH_SECRET || 'PLACEHOLDER';
  private url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private returnUrl = process.env.VNP_RETURN_URL || 'http://localhost:3000/payment/callback';

  createPaymentUrl(ip: string, bookingId: string, amount: number) {
    const date = new Date();
    const createDate = format(date, 'yyyyMMddHHmmss');
    
    let vnp_Params: any = {
      'vnp_Version': '2.1.0',
      'vnp_Command': 'pay',
      'vnp_TmnCode': this.tmnCode,
      'vnp_Locale': 'vn',
      'vnp_CurrCode': 'VND',
      'vnp_TxnRef': bookingId,
      'vnp_OrderInfo': 'Thanh toan san bong ' + bookingId,
      'vnp_OrderType': 'other',
      'vnp_Amount': amount * 100, // VNPay amount is in cents/minimum unit
      'vnp_ReturnUrl': this.returnUrl,
      'vnp_IpAddr': ip,
      'vnp_CreateDate': createDate,
    };

    vnp_Params = this.sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', this.secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    vnp_Params['vnp_SecureHash'] = signed;
    return this.url + '?' + qs.stringify(vnp_Params, { encode: false });
  }

  verifyChecksum(query: any) {
    const vnp_SecureHash = query['vnp_SecureHash'];
    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    const sorted = this.sortObject(params);
    const signData = qs.stringify(sorted, { encode: false });
    const hmac = crypto.createHmac('sha512', this.secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return vnp_SecureHash === signed;
  }

  private sortObject(obj: any) {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    });
    return sorted;
  }
}
