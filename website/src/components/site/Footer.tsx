import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, MessageCircle, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import logo1 from "@/assets/logo/webdial-logo.png";

const informationLinks = [
  ["About Us", "/"],
  ["Contact Us", "/contact"],
  ["Features", "/features"],
  ["FAQ", "/contact#faq"],
  ["Pricing", "/pricing"],
  ["Privacy Policy", "/contact#privacy"],
  ["Terms & Conditions", "/contact#terms"],
  ["Cookie Policy", "/contact#cookies"],
] as const;

const productLinks = [
  ["Auto Dialer", "/features"],
  ["Web CRM", "/features"],
  ["Lead Management", "/features"],
  ["Team Management", "/solutions"],
  ["Call Recording", "/features"],
  ["Call Analytics", "/features"],
  ["WhatsApp Integration", "/features"],
  ["Lead Distribution", "/features"],
  ["Integrations", "/features"],
  ["Developer API", "/features"],
] as const;

const solutionLinks = [
  ["Call Centers", "/solutions"],
  ["Telemarketing Teams", "/solutions"],
  ["Sales Teams", "/solutions"],
  ["Customer Support", "/solutions"],
  ["Real Estate", "/solutions"],
  ["Education", "/solutions"],
  ["Finance", "/solutions"],
  ["Healthcare", "/solutions"],
  ["E-commerce", "/solutions"],
  ["Service Businesses", "/solutions"],
] as const;

export function Footer() {
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="relative border-t border-border/60 " style={{ backgroundColor:  "#111827" }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pt-14 pb-10 sm:grid-cols-2 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-4">
          <img src={logo1} alt="WebDial" className="h-25 w-auto" loading="lazy" />
          <p className="mt-4 text-sm " style={{ color: "#d1d5db",lineHeight: "inherit"}}>
            WebDial is an all-in-one web-based calling and customer management platform built for modern call centers and sales teams. Connect with leads faster, manage your team efficiently, and track every conversation from one powerful web dashboard.
          </p>
        
        </div>

        <div className="lg:col-span-2">
          <h4 className="text-md font-bold text-white">Information</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {informationLinks.map(([label, href]) => <li key={label}><a href={href} className="hover:text-foreground" style={{ color: "#d1d5db"}} >{label}</a></li>)}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h4 className="text-md font-bold text-white">Product</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {productLinks.map(([label, href]) => <li key={label}><a href={href} className="hover:text-foreground" style={{ color: "#d1d5db"}} >{label}</a></li>)}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h4 className="text-md font-bold text-white">Solutions</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {solutionLinks.map(([label, href]) => <li key={label}><a href={href} className="hover:text-foreground" style={{ color: "#d1d5db"}} >{label}</a></li>)}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h4 className="text-md font-bold text-white">Contact Us</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" /> <a href="tel:+919087356563" className="hover:text-foreground " style={{ color: "#d1d5db"}}>+91 90873 56563<br />+91 99406 66924</a>
            </li>
            {/* <li className="flex items-center gap-2">
              <MessageCircle className="size-4 shrink-0 text-primary" /> <a href="https://wa.me/919087356563" className="hover:text-foreground">+91 90873 56563</a>
            </li> */}
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" /> <a href="mailto:sathish@webdial.in" className="break-all hover:text-foreground" style={{ color: "#d1d5db"}}>sathish@webdial.in</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" /> <span style={{ color: "#d1d5db"}}>Anna Nagar, Chennai, India</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-primary" /> <span style={{ color: "#d1d5db"}}>Monday – Sunday<br />9:30 AM – 7:30 PM IST</span>
            </li>
          </ul>
        </div>

      </div>

  <div className="mt-2 mb-12 mx-auto grid max-w-4xl rounded-lg bg-[image:var(--gradient-primary)] p-6 text-center shadow-[0_18px_42px_-26px_rgba(6,42,158,0.65)]">
            <h3 className="text-2xl font-bold text-white">Stay Updated</h3>
            <p className="mt-3 text-sm text-white/80">Stay updated with the latest WebDial features, call center insights, sales tips,<br /> and smarter ways to manage your team and leads.</p>
            <form
              className="mt-5 flex flex-col   sm:flex-row gap-4 max-w-lg mx-auto"
              onSubmit={(event) => {
                event.preventDefault();
                setSubscribed(true);
                toast.success("Thanks! You are subscribed to WebDial updates.");
              }}
            >
              <input
                type="email"
                required
                aria-label="Email address"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 rounded-sm bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-#d1d5db
-500 focus:border-#d1d5db
-500"
              />
              <button type="submit" className="zoom-glow rounded-lg bg-[#2ebf91] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "#111827" }}>
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </form>
          </div>



      <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 px-5 py-7 text-xs text-muted-foreground sm:flex-row">
       <div >
        <span style={{placeSelf: "center",fontSize: "14px",fontWeight: "500" ,color: "#d1d5db"}}>© {new Date().getFullYear()} WebDial. All rights reserved. Built with ❤️ in India.</span>
      </div>
      <div>
        <div className="flex items-center gap-4">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors duration-300 hover-lift animate-slide-up stagger-1 hover:text-primary"><Facebook className="size-4" /></a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors duration-300 hover-lift animate-slide-up stagger-1 hover:text-primary"><Instagram className="size-4" /></a>
          <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors duration-300 hover-lift animate-slide-up stagger-1 hover:text-primary"><Youtube className="size-4" /></a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors duration-300 hover-lift animate-slide-up stagger-1 hover:text-primary"><Linkedin className="size-4" /></a>
        </div>
      </div>
      </div>

      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-3">
          <a
          href="tel:+919087356563"
          aria-label="Call WebDial"
          title="Call WebDial"
          className="flex size-12 animate-bounce items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 [animation-delay:300ms]"
        >
          <Phone className="size-5" />
        </a>
        <a
          href="https://wa.me/919087356563"
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with WebDial on WhatsApp"
          title="WhatsApp"
          className="flex size-12 animate-bounce items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
        >
          <MessageCircle className="size-6" />
        </a>
      
      </div>
    </footer>
  );
}
