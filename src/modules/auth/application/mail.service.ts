import { resend } from "@/config/resend.config";
import { otpTemplate } from "../templates/otp.template";

class MailService{
    async sendVerificationEmail(email: string, otp: string){
        try {
           const result = await resend.emails.send({
                from: process.env.RESEND_FROM!,
                to: email,
                subject: "Verify your email",
                html: otpTemplate(otp),
            });
            console.log(result);
        } catch (error) {
            console.error("Failed to send OTP:", error);
            throw new Error("Failed to send OTP");
        }
    }
}
export default new MailService();