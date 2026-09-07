import { LegalPageLayout } from "@/components/site/LegalPageLayout";

export default function TermsAndConditions() {
  return (
    <LegalPageLayout
      eyebrow="Agreement"
      title="Terms & Conditions"
      intro="These Terms & Conditions govern your access to the WebDial website and your use of the WebDial calling, CRM and team management services."
      updated="September 8, 2026"
      sections={[
        { title: "Using WebDial", paragraphs: ["You may use WebDial only for lawful business purposes and in accordance with these Terms. You are responsible for providing accurate account information and for keeping your login credentials secure.", "Your organization is responsible for the activity of its users, the data entered into its workspace and ensuring that each user has the right level of access."] },
        { title: "Accounts and access", bullets: ["Do not share credentials or allow unauthorized access to an account.", "Choose strong passwords and notify WebDial promptly if you suspect unauthorized activity.", "Use role permissions responsibly and review team access when people join or leave your organization.", "You must be legally able to enter into this agreement on behalf of your organization."] },
        { title: "Acceptable use", paragraphs: ["You must not use WebDial to break the law, send deceptive or unlawful communications, harass people, distribute malware, violate privacy or intellectual property rights, bypass usage limits, probe the service for vulnerabilities without permission, or interfere with the operation of the platform."] },
        { title: "Your content and communications", paragraphs: ["You retain responsibility for the leads, contacts, messages, recordings, files and other content you submit. You must have the required notices, permissions and legal basis before recording calls, contacting people, sending WhatsApp messages or importing customer data. WebDial may process content only to provide, secure and improve the service, subject to the Privacy Policy and your organization’s instructions."] },
        { title: "Plans, trials and payment", paragraphs: ["Plan features, user limits, pricing, billing periods and trial limits are shown on the WebDial website or in your account. A trial may have duration and usage restrictions. Paid access may be paused or limited if payment is not received, an account expires or these Terms are violated. Taxes, third-party communication charges and provider fees may apply where stated."] },
        { title: "Intellectual property", paragraphs: ["WebDial and its software, branding, visual design and documentation are owned by WebDial or its licensors. These Terms give you a limited, non-exclusive right to use the service during your active subscription or authorized trial. You may not copy, resell, reverse engineer or create a competing service from the platform except where applicable law permits."] },
        { title: "Availability and third-party services", paragraphs: ["We work to keep WebDial reliable, but the service may occasionally be unavailable for maintenance, upgrades, network failures or events outside our control. Calling providers, WhatsApp, payment processors and other integrations may have their own terms, limits and outages."] },
        { title: "Suspension and termination", paragraphs: ["We may suspend or terminate access where reasonably necessary to protect the platform, comply with law, address non-payment, investigate abuse or enforce these Terms. You may stop using the service or request account closure. After termination, access to workspace data may not remain available, so export information you need before closing an account."] },
        { title: "Disclaimers and limitation", paragraphs: ["To the extent permitted by law, WebDial is provided on an as-available basis and we do not guarantee uninterrupted service, specific business results or error-free operation. Nothing in these Terms excludes liability that cannot legally be excluded. To the extent permitted by law, WebDial will not be liable for indirect, incidental or consequential losses arising from use of the service."] },
        { title: "Changes and contact", paragraphs: ["We may update these Terms as the service evolves. Continued use after an update means you accept the revised Terms. Questions about this agreement can be sent to sathish@webdial.in."] },
      ]}
    />
  );
}
