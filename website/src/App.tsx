import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import heroDashboard from "@/assets/hero-dashboard.jpg";
import telecallerDashboard from "@/assets/telecaller-dashboard.jpg";
import teamCallcenter from "@/assets/team-callcenter.jpg";

const featureCards = [
  { title: "Auto Dialer", text: "Progressive and preview dialing with live dispositions, callbacks and one-tap redial." },
  { title: "Telecaller CRM", text: "Lead lists, notes, stages and follow-ups built for call teams that need speed." },
  { title: "WhatsApp Suite", text: "Broadcasts, templates and follow-up actions from the same workspace as the call." },
  { title: "Live Analytics", text: "Daily calls, talk time, attendance and productivity tracked in real time." },
  { title: "Pipeline & Tasks", text: "Move deals across stages, assign tasks and never lose priority leads again." },
  { title: "Audit & Recording", text: "Call recordings, audit logs and role permissions for complete accountability." },
];

const stats = [
  { value: "50+", label: "Calls dialed" },
  { value: "10+", label: "Active agents" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "38%", label: "Avg. talk-time lift" },
];

const roles = [
  { title: "Super Admin", items: ["All teams overview", "Agent & license control", "Audit logs, billing"] },
  { title: "Team Admin", items: ["Lead distribution", "Dispositions & pipeline", "Team performance"] },
  { title: "Telecaller", items: ["One-click dialing", "Callback reminders", "Own daily scorecard"] },
];

const steps = [
  { n: "01", title: "Upload leads", text: "Import CSV or sync from your CRM in seconds." },
  { n: "02", title: "Assign teams", text: "Distribute lists to telecallers with smart rules." },
  { n: "03", title: "Start dialing", text: "Agents call from the app — every outcome logged." },
  { n: "04", title: "Measure & scale", text: "Track productivity live and coach with recordings." },
];

export function App() {
  return (
    <div className="page-shell">
      <Header />

      <main>
        <section className="hero-band">
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="eyebrow">
                Built for outbound sales teams
              </span>
              <h1>
                Your Call Center <span>In Your Pocket</span>
              </h1>
              <p>
                Built for sales teams that need speed, visibility and follow-up without the chaos.
              </p>

              <div className="hero-points">
                {[
                  "Auto Dial Directly From Your Browser",
                  "Call Recording & Real-Time Analytics",
                  "Powerful Web CRM & Lead Management",
                  "Sync Leads From 100+ Integrations",
                  "Official WhatsApp Inbox & Broadcast",
                  "One Dashboard. Your Entire Call Center",
                ].map((point) => (
                  <div key={point} className="point-row">
                    <span className="point-icon">✓</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="cta-row">
                <a href="/contact" className="primary-btn zoom-glow">Start free trial</a>
                <a href="/master" className="secondary-btn">See Master Console</a>
              </div>

              <div className="mini-badges">
                <span className="badge badge-blue">7-day free trial · no card required</span>
                <span className="badge">No hardware needed</span>
                <span className="badge">Setup in 10 minutes</span>
                <span className="badge">Cancel anytime</span>
              </div>
            </div>

            <div className="hero-visual">
              <img src={heroDashboard} alt="WebDial dashboard" />
            </div>
          </div>
        </section>

        <section className="stats-strip">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-box">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="logo-band">
          <p>Trusted by 50+ calling teams across India</p>
          <div className="logo-grid">
            {Array.from({ length: 12 }).map((_, index) => (
              <span key={index}>Brand {index + 1}</span>
            ))}
          </div>
        </section>

        <section className="content-section">
          <div className="section-header">
            <h2>Everything your calling team needs</h2>
            <p>One workspace for admins, supervisors and telecallers — no spreadsheets, no guesswork.</p>
          </div>

          <div className="feature-grid">
            {featureCards.map((feature, index) => (
              <div key={feature.title} className="feature-card" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="feature-icon">✦</div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="showcase-section">
          <div className="showcase-image">
            <img src={telecallerDashboard} alt="Telecaller dashboard" />
          </div>
          <div className="showcase-copy">
            <h2>The telecaller dashboard</h2>
            <p>
              Agents log in and see exactly what to do next — today’s calls, assigned leads,
              dispositions and their own scorecard. No training manual needed.
            </p>
            <ul>
              {[
                "One-click dialing with auto disposition prompts",
                "Callback reminders and task list for the day",
                "Personal productivity, talk time and attendance",
                "WhatsApp follow-up right after the call ends",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a href="/features" className="text-link">Explore all modules</a>
          </div>
        </section>

        <section className="roles-section">
          <div className="role-card">
            <img src={teamCallcenter} alt="Team admin" />
            <h3>Super Admin</h3>
            <ul>
              <li>All teams overview</li>
              <li>Agent & license control</li>
              <li>Audit logs, billing</li>
            </ul>
          </div>

          {roles.slice(1).map((role) => (
            <div key={role.title} className="role-card muted">
              <img src={teamCallcenter} alt={role.title} />
              <h3>{role.title}</h3>
              <ul>
                {role.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="steps-section">
          <h2>Live in four steps</h2>
          <div className="steps-grid">
            {steps.map((step) => (
              <div key={step.n} className="step-card">
                <span className="step-number">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bottom-banner">
          <div>
            <h2>Built with calling floors, not for them</h2>
            <p>
              Every screen in WebDial came from watching real telecalling offices — admissions desks,
              loan teams and real estate pre-sales. Fewer clicks per call, more conversations per hour.
            </p>
          </div>
          <div className="metrics">
            <div>
              <strong>3.2x</strong>
              <span>More connected calls per agent</span>
            </div>
            <div>
              <strong>&lt; 1 day</strong>
              <span>Average go-live time</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
