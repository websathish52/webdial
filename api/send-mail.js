import nodemailer from "nodemailer";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader(
    "Content-Type",
    "application/json; charset=UTF-8"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  }

  // WARNING:
  // If these are real credentials, change the password because
  // it was exposed in the conversation.
  const ZOHO_USER = "sathish@webcodexus.com";
  const ZOHO_PASS = "HJyjfcxF89ad";

  try {
    const data =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const name = String(data.name ?? "").trim();
    const email = String(data.email ?? "").trim();

    const phone =
      String(data.phone ?? "").trim() || "N/A";

    const company =
      String(data.company ?? "").trim() || "N/A";

    const service =
      String(data.service ?? "").trim() || "N/A";

    const message =
      String(data.message ?? "").trim() || "N/A";

    // Email is required for every form
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email address.",
      });
    }

    // Correct email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Zoho SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: ZOHO_USER,
        pass: ZOHO_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    /*
     * ==========================================
     * NEWSLETTER SUBSCRIPTION
     * ==========================================
     */

    if (!name) {
      const newsletterFields = {
        name: "Newsletter Subscriber",
        email,
        phone: "N/A",
        company: "N/A",
        service: "WebDial Newsletter Subscription",
        message: "User subscribed to WebDial updates.",
      };

      const newsletterHtml = Object.entries(newsletterFields)
        .map(
          ([label, value]) => `
            <div style="
              margin-bottom:18px;
              padding-bottom:14px;
              border-bottom:1px solid #e5e7eb;
            ">
              <div style="
                font-size:12px;
                font-weight:700;
                color:#6b7280;
                text-transform:uppercase;
                margin-bottom:5px;
              ">
                ${escapeHtml(label)}
              </div>

              <div style="
                font-size:15px;
                color:#111827;
              ">
                ${escapeHtml(value).replace(/\n/g, "<br>")}
              </div>
            </div>
          `
        )
        .join("");

      await transporter.sendMail({
        from: `WebDial Website <${ZOHO_USER}>`,

        to: [
          "sathish@webcodexus.com",
          "admin@webcodexus.com",
        ],

        replyTo: email,

        subject: `WebDial Newsletter Subscription - ${email}`,

        text: Object.entries(newsletterFields)
          .map(
            ([label, value]) =>
              `${label}: ${value}`
          )
          .join("\n"),

        html: `
          <div style="
            font-family:Arial,Helvetica,sans-serif;
            max-width:700px;
            margin:30px auto;
            padding:30px;
            border:1px solid #e5e7eb;
            border-radius:14px;
            background:#ffffff;
          ">

            <h2 style="
              margin:0 0 25px;
              color:#111827;
            ">
              WebDial Newsletter Subscription
            </h2>

            ${newsletterHtml}

          </div>
        `,
      });

      return res.status(200).json({
        success: true,
        message: "You have been subscribed successfully!",
      });
    }

    /*
     * ==========================================
     * NORMAL CONTACT / DEMO ENQUIRY
     * ==========================================
     */

    if (!message || message === "N/A") {
      return res.status(400).json({
        success: false,
        message: "Please enter your project details.",
      });
    }

    const fields = {
      name,
      email,
      phone,
      company,
      service,
      message,
    };

    const htmlFields = Object.entries(fields)
      .map(
        ([label, value]) => `
          <div style="
            margin-bottom:18px;
            padding-bottom:14px;
            border-bottom:1px solid #e5e7eb;
          ">

            <div style="
              font-size:12px;
              font-weight:700;
              color:#6b7280;
              text-transform:uppercase;
              margin-bottom:5px;
            ">
              ${escapeHtml(label)}
            </div>

            <div style="
              font-size:15px;
              color:#111827;
              line-height:1.6;
            ">
              ${escapeHtml(value).replace(/\n/g, "<br>")}
            </div>

          </div>
        `
      )
      .join("");

    await transporter.sendMail({
      from: `WebDial Website <${ZOHO_USER}>`,

      to: [
        "sathish@webcodexus.com",
        "admin@webcodexus.com",
      ],

      replyTo: email,

      subject: `WebDial Enquiry - ${name}`,

      text: Object.entries(fields)
        .map(
          ([label, value]) =>
            `${label}: ${value}`
        )
        .join("\n"),

      html: `
        <!DOCTYPE html>

        <html>
        <head>
          <meta charset="UTF-8">
          <title>WebDial Client Enquiry</title>
        </head>

        <body style="
          margin:0;
          padding:30px;
          background:#f3f4f6;
          font-family:Arial,Helvetica,sans-serif;
        ">

          <div style="
            max-width:700px;
            margin:0 auto;
            background:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:16px;
            padding:30px;
          ">

            <h2 style="
              margin:0 0 25px;
              color:#111827;
            ">
              WebDial Client Enquiry
            </h2>

            ${htmlFields}

          </div>

        </body>
        </html>
      `,
    });

    return res.status(200).json({
      success: true,
      message:
        "Your enquiry has been submitted successfully!",
    });

  } catch (error) {
    console.error("Mail send error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Mail sending failed. Please try again later.",
    });
  }
}