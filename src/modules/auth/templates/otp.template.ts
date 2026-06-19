export function otpTemplate(otp: string): string{
    return`
         <div style="font-family:Arial,sans-serif">
            <h2>Email Verification</h2>

            <p>Your verification code is:</p>

            <h1>${otp}</h1>

            <p>This code will expire in 5 minutes.</p>
        </div>
    `;
}