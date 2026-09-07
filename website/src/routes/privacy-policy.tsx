import { LegalPageLayout } from "@/components/site/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This Privacy Policy explains how WebDial collects, uses and protects information when you visit our website or use our web-based calling and customer management platform."
      updated="September 8, 2026"
      sections={[
        { title: "Information we collect", paragraphs: ["We may collect information you provide when you create an account, start a trial, contact us, subscribe to updates or request support. This can include your name, business name, email address, phone number, login details and information about your team.", "When you use WebDial, we may process workspace information such as leads, contact details, notes, call activity, dispositions, recordings, messages, tasks and reports that your organization chooses to store in the platform."] },
        { title: "How we use information", bullets: ["Provide, operate and improve the WebDial website and platform.", "Create and manage accounts, subscriptions, teams, permissions and support requests.", "Deliver calling, CRM, WhatsApp, reporting, automation and notification features.", "Protect the platform, prevent abuse and investigate security incidents.", "Send service messages and, where permitted, product updates or marketing communications."] },
        { title: "Workspace and customer data", paragraphs: ["WebDial processes workspace data on behalf of the organization that uses the platform. That organization controls how its users enter, access, export and delete workspace data. If you use WebDial through an employer or client, contact that organization for requests about its data."] },
        { title: "Sharing and service providers", paragraphs: ["We do not sell personal information. We may share information with trusted service providers that help us host, secure, deliver or support WebDial, and when required by law or necessary to protect rights, safety or the platform. Providers are expected to handle information only for the services they perform for WebDial."] },
        { title: "Security and retention", paragraphs: ["We use reasonable administrative, technical and organizational safeguards designed to protect information. No online service can guarantee absolute security. We retain information for as long as needed to provide the service, meet legal obligations, resolve disputes and enforce agreements, subject to account and workspace settings."] },
        { title: "Your choices and rights", paragraphs: ["Depending on your location, you may have rights to access, correct, export or delete personal information, or to object to certain processing. You may also unsubscribe from non-essential marketing messages. Contact us at sathish@webdial.in and include enough information for us to identify your request."] },
        { title: "Children's privacy", paragraphs: ["WebDial is designed for business users and is not directed to children. We do not knowingly collect personal information from children through the website."] },
        { title: "Policy updates and contact", paragraphs: ["We may update this policy when our services or legal requirements change. The updated version will be posted on this page with a revised date. For privacy questions, contact sathish@webdial.in or visit our Contact page."] },
      ]}
    />
  );
}
