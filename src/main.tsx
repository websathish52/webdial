import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const portalRoutes = [
  "/auth", "/dashboard", "/crm", "/dialer", "/team", "/whatsapp", "/reports",
  "/performance", "/audit", "/tools", "/pipeline", "/tasks", "/marketing", "/pbx",
  "/subscribe", "/payment", "/integration", "/recording", "/settings",
];

const isPortalRoute =
  portalRoutes.some((route) => window.location.pathname === route || window.location.pathname.startsWith(`${route}/`)) ||
  (window.location.pathname === "/master" && Boolean(localStorage.getItem("ifox_token")));

const root = ReactDOM.createRoot(document.getElementById("root")!);

if (isPortalRoute) {
  import("./styles.css").then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
} else {
  Promise.all([
    import("./website-app"),
    import("../website/src/styles.css"),
  ]).then(([{ default: WebsiteApp }]) => {
    root.render(
      <React.StrictMode>
        <WebsiteApp />
      </React.StrictMode>,
    );
  });
}
