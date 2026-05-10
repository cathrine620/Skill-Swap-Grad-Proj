import nodemailer from "nodemailer";

async function sendEmail({
  to,
  cc,
  bcc,
  subject,
  html,
  attachments = [],
} = {}) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  let info = await transporter.sendMail({
    from: `"Skill-Swap" <${process.env.GMAIL_USER}>`,
    cc,
    bcc,
    to,
    subject,
    html,
    attachments,
  });

  return info.rejected.length ? false : true;
}

export default sendEmail;
