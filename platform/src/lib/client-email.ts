type SendOtpOpts = {
  to: string;
  code: string;
  salonName: string;
};

/**
 * Sends membership OTP email.
 * - Uses Resend when RESEND_API_KEY (+ optional RESEND_FROM) is set
 * - Otherwise logs the code (dev/demo) and returns { demo: true }
 */
export async function sendClientOtpEmail(opts: SendOtpOpts): Promise<{ demo: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "FHSalon <onboarding@resend.dev>";

  const subject = `${opts.code} is your ${opts.salonName} code`;
  const text = `Your ${opts.salonName} verification code is ${opts.code}.

It expires in 10 minutes. If you didn't request this, you can ignore this email.`;

  if (!apiKey) {
    console.info(`[client-otp] ${opts.to} → ${opts.code} (${opts.salonName})`);
    return { demo: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[client-otp] Resend failed", res.status, body);
    throw new Error("Could not send verification email. Try again shortly.");
  }

  return { demo: false };
}
