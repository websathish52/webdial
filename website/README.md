# WebDial Project Structure

This project already follows the 3-part structure you asked for:

1. Premium marketing website
2. Super admin / master dashboard
3. Telecaller dashboard experience

## 1) Website / marketing site
This is the public-facing website and is handled in the route and component files under the site section.

Main files:
- [src/routes/index.tsx](src/routes/index.tsx) — homepage hero, stats, feature blocks, dashboard showcase, CTA, pricing/brand messaging
- [src/components/site/Header.tsx](src/components/site/Header.tsx) — top navigation and CTA buttons
- [src/components/site/Footer.tsx](src/components/site/Footer.tsx) — website footer
- [src/components/site/Reveal.tsx](src/components/site/Reveal.tsx) — animation wrapper
- [src/components/site/ClientLogos.tsx](src/components/site/ClientLogos.tsx) — brand/logo strip
- [src/components/site/Testimonials.tsx](src/components/site/Testimonials.tsx) — testimonials section
- [src/components/site/Faq.tsx](src/components/site/Faq.tsx) — FAQ content
- [src/components/site/DataSafe.tsx](src/components/site/DataSafe.tsx) — security/data safety section
- [src/components/site/ContactStrip.tsx](src/components/site/ContactStrip.tsx) — quick contact banner
- [src/routes/features.tsx](src/routes/features.tsx) — product/features page
- [src/routes/solutions.tsx](src/routes/solutions.tsx) — solution pages
- [src/routes/pricing.tsx](src/routes/pricing.tsx) — pricing page
- [src/routes/contact.tsx](src/routes/contact.tsx) — contact/demo form page

The styling for this website is controlled mainly by:
- [src/styles.css](src/styles.css) — design tokens, gradients, cards, theme variables, hero effects
- [src/components/ui/button.tsx](src/components/ui/button.tsx) — button system used across the website

## 2) Super admin / master dashboard
This is the platform control center and lives under the master route structure.

Main files:
- [src/routes/master/index.tsx](src/routes/master/index.tsx) — overview dashboard with KPI cards, charts, alerts, tenant table
- [src/components/master/MasterSidebar.tsx](src/components/master/MasterSidebar.tsx) — left navigation for the master console
- [src/components/master/MasterShell.tsx](src/components/master/MasterShell.tsx) — reusable dashboard shell for subpages
- [src/routes/master/tenants/index.tsx](src/routes/master/tenants/index.tsx) — tenant/company management
- [src/routes/master/users/index.tsx](src/routes/master/users/index.tsx) — users and roles
- [src/routes/master/calls/index.tsx](src/routes/master/calls/index.tsx) — live call monitoring screen
- [src/routes/master/analytics/index.tsx](src/routes/master/analytics/index.tsx) — analytics section
- [src/routes/master/billing/index.tsx](src/routes/master/billing/index.tsx) — billing and plans
- [src/routes/master/telephony/index.tsx](src/routes/master/telephony/index.tsx) — trunk / telephony config
- [src/routes/master/compliance/index.tsx](src/routes/master/compliance/index.tsx) — compliance and audit
- [src/routes/master/alerts/index.tsx](src/routes/master/alerts/index.tsx) — alerts management
- [src/routes/master/support/index.tsx](src/routes/master/support/index.tsx) — support tickets
- [src/routes/master/settings/index.tsx](src/routes/master/settings/index.tsx) — platform settings

## 3) Telecaller dashboard
The telecaller dashboard is represented as the user-facing call workflow experience. The public homepage showcases it visually, and the platform design system is prepared for that module.

Related files:
- [src/routes/index.tsx](src/routes/index.tsx) — telecaller dashboard showcase section in the homepage
- [src/assets/telecaller-dashboard.jpg](src/assets/telecaller-dashboard.jpg) — dashboard image used for the telecaller presentation
- [src/assets/hero-dashboard.jpg](src/assets/hero-dashboard.jpg) — admin / product dashboard image
- [src/assets/team-callcenter.jpg](src/assets/team-callcenter.jpg) — team/call center visual asset

## Route structure summary
The app is based on TanStack Router and all routes are registered in:
- [src/router.tsx](src/router.tsx)
- [src/routeTree.gen.ts](src/routeTree.gen.ts)

This is the main route system for the app:
- / — landing page
- /features — features page
- /solutions — solutions page
- /pricing — pricing page
- /contact — contact/demo page
- /master — admin dashboard overview
- /master/tenants — tenant management
- /master/users — users and roles
- /master/calls — call monitor
- /master/analytics — analytics
- /master/billing — billing
- /master/telephony — trunks
- /master/compliance — compliance
- /master/alerts — alerts
- /master/support — support
- /master/settings — settings

## Design direction
The design is built around:
- premium blue/light navy color palette
- glass-card UI surfaces
- strong hero layout with CTAs
- admin dashboard cards and tables
- user-friendly, clean SaaS structure

## Development
Requirements:
- Node.js
- npm

Run locally:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

This project was built with [Lovable](https://lovable.dev).
