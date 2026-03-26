type SendVerificationEmailInput = {
  email: string
  code: string
}

export async function sendVerificationEmail({ email, code }: SendVerificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'ProofMesh <onboarding@resend.dev>'

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ProofMesh] Verification code for ${email}: ${code}`)
      return { delivered: false }
    }

    throw new Error('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your ProofMesh verification code',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; color: #0f172a;">
          <h1 style="margin:0 0 16px;">Verify your ProofMesh email</h1>
          <p style="margin:0 0 24px;">Enter this verification code to finish creating your account:</p>
          <div style="font-size:32px; font-weight:700; letter-spacing:0.2em;">${code}</div>
          <p style="margin-top:24px; color:#475569;">This code expires in 10 minutes.</p>
        </div>
      `,
      text: `Your ProofMesh verification code is ${code}. It expires in 10 minutes.`,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || 'Failed to send verification email')
  }

  return { delivered: true }
}
