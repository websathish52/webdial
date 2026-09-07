import { LegalPageLayout } from "@/components/site/LegalPageLayout";

export default function CookiePolicy() {
  return (
    <LegalPageLayout
      eyebrow="Website technology"
      title="Cookie Policy"
      intro="This Cookie Policy explains how WebDial uses cookies and similar technologies on our website to keep pages working, understand usage and improve your experience."
      updated="September 8, 2026"
      sections={[
        { title: "What cookies are", paragraphs: ["Cookies are small text files stored on your browser. Similar technologies can include local storage, pixels and browser identifiers. They help a website remember choices and understand how pages are used."] },
        { title: "How WebDial uses cookies", bullets: ["Essential operation: to support security, session handling, forms and basic website functionality.", "Preferences: to remember choices such as interface or navigation preferences where applicable.", "Performance: to understand page visits, errors and general site performance so we can improve WebDial.", "Account and trial flows: to support sign-in, account creation and trial protection when you use the WebDial portal or trial form."] },
        { title: "Types of cookies", paragraphs: ["Session cookies are removed when your browser session ends. Persistent cookies remain for a set period or until you remove them. First-party cookies are set by WebDial. Third-party cookies or technologies may be used by services embedded in the website, such as hosting, analytics, payment or support tools, and those providers control their own policies."] },
        { title: "Managing cookies", paragraphs: ["Most browsers let you view, block or delete cookies through their settings. Blocking essential cookies may affect sign-in, trial creation, forms or other parts of the website. You can also clear local storage and site data from your browser settings."] },
        { title: "Cookies in the WebDial portal", paragraphs: ["When you sign in to the WebDial portal, browser storage and cookies may be used to keep your session active, remember the selected company context and support secure navigation. These technologies are necessary for the requested account features and are not used to sell your information."] },
        { title: "Updates and contact", paragraphs: ["We may update this policy when the website or the technologies we use change. The latest version will always be available on this page. For questions about cookies or privacy, contact sathish@webdial.in."] },
      ]}
    />
  );
}
