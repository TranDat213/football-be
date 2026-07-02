import crypto from 'node:crypto';
import qs from 'qs';
import { format } from 'date-fns';
import { Env } from '@/config/env.config';

export class VNPayService {
  private tmnCode = Env.VNP_TMN_CODE;
  private secretKey = Env.VNP_HASH_SECRET;
  private url = Env.VNP_URL;
  private returnUrl = Env.VNP_RETURN_URL;

  createPaymentUrl(ip: string, bookingId: string, amount: number) {
    const date = new Date();
    const createDate = format(date, 'yyyyMMddHHmmss');

    let vnp_Params: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: bookingId,
      vnp_OrderInfo: 'Thanh toan san bong ' + bookingId,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100, // VNPay amount is in cents/minimum unit
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ip,
      vnp_CreateDate: createDate,
    };

    vnp_Params = this.sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, {
      encode: false,
    });
    const signed = crypto
      .createHmac('sha512', this.secretKey)
      .update(Buffer.from(signData, 'utf8'))
      .digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;
    return `${this.url}?${qs.stringify(vnp_Params, {
      encode: false,
    })}`;
  }

  verifyChecksum(query: Record<string, any>) {
    const secureHash = query.vnp_SecureHash;

    delete query.vnp_SecureHash;
    delete query.vnp_SecureHashType;

    const sorted = this.sortObject(query);

    const signData = qs.stringify(sorted, {
      encode: false,
    });

    const signed = crypto
      .createHmac('sha512', this.secretKey)
      .update(Buffer.from(signData, 'utf8'))
      .digest('hex');

    return secureHash === signed;
  }
  private sortObject(obj: Record<string, any>) {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj)
      .map((key) => encodeURIComponent(key))
      .sort();

    for (const key of keys) {
      const decodedKey = decodeURIComponent(key);
      const val = obj[decodedKey];
      sorted[key] = encodeURIComponent(String(val)).replace(/%20/g, '+');
    }

    return sorted;
  }
}
