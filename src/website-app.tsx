import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "../website/src/routes/index";
import Contact from "../website/src/routes/contact";
import Features from "../website/src/routes/features";
import Integrations from "../website/src/routes/integrations";
import Pricing from "../website/src/routes/pricing";
import Resources from "../website/src/routes/resources";
import Solutions from "../website/src/routes/solutions";

export default function WebsiteApp() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}