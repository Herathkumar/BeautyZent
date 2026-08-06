import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalonBook — Online salon booking",
  description:
    "Multi-tenant salon booking with stylist calendars, tablet floor display, and admin portal.",
};

/** Paints shell before CSS/JS so cold starts don't flash the wrong theme. */
const BOOT_STYLE = `
html,body{background:#1c1714;color:#fffaf6;min-height:100%;min-height:100dvh}
html.paper-shell,html.paper-shell body{
  background:radial-gradient(1000px 500px at 10% -10%,rgba(201,168,124,.22),transparent 55%),
    linear-gradient(180deg,#f7f3ee 0%,#f3eee8 45%,#ebe4db 100%);
  color:#1c1714
}
html.manager-shell,html.manager-shell body{
  background:radial-gradient(1000px 480px at 12% -8%,rgba(125,97,84,.1),transparent 55%),
    linear-gradient(180deg,#f7f1ea 0%,#f3ebe3 48%,#ebe2d8 100%);
  color:#2b2521
}
html.manager-shell.manager-shell--dark,html.manager-shell.manager-shell--dark body{
  background:radial-gradient(900px 420px at 90% -10%,rgba(240,201,135,.18),transparent 55%),
    radial-gradient(700px 360px at 0% 100%,rgba(110,74,56,.38),transparent 50%),
    linear-gradient(180deg,#241c18 0%,#1c1714 45%,#12100e 100%);
  color:#fffaf6;
  color-scheme:dark
}
html.stylist-shell,html.stylist-shell body{
  background:radial-gradient(900px 460px at 85% -8%,rgba(126,196,184,.22),transparent 55%),
    radial-gradient(720px 380px at 0% 100%,rgba(56,110,120,.32),transparent 52%),
    linear-gradient(180deg,#152226 0%,#0e1618 48%,#0a1114 100%);
  color:#f4fbfa;
  color-scheme:dark
}
html.stylist-shell.stylist-shell--light,html.stylist-shell.stylist-shell--light body{
  background:radial-gradient(900px 460px at 85% -8%,rgba(42,143,130,.12),transparent 55%),
    radial-gradient(720px 380px at 0% 100%,rgba(56,110,120,.08),transparent 52%),
    linear-gradient(180deg,#f4fbfa 0%,#e8f4f1 48%,#dceee9 100%);
  color:#0e1618;
  color-scheme:light
}
`;

const BOOT_SCRIPT = `
(function(){
  try{
    var p=location.pathname||"";
    var manager=/^\\/(manager|admin)(\\/|$)/.test(p);
    var stylist=/^\\/stylist(\\/|$)/.test(p);
    var dark=/^\\/(display|book|demo)(\\/|$)/.test(p);
    if(manager){
      document.documentElement.classList.add("manager-shell");
      try{
        if(localStorage.getItem("fhsalon-manager-theme")==="dark"){
          document.documentElement.classList.add("manager-shell--dark");
          var m=document.querySelector('meta[name="theme-color"]');
          if(m) m.setAttribute("content","#1c1714");
        }
      }catch(e){}
    }
    else if(stylist){
      document.documentElement.classList.add("stylist-shell");
      try{
        if(localStorage.getItem("fhsalon-stylist-theme")==="light"){
          document.documentElement.classList.add("stylist-shell--light");
          var sm=document.querySelector('meta[name="theme-color"]');
          if(sm) sm.setAttribute("content","#eef7f5");
        }
      }catch(e){}
    }
    else if(!dark) document.documentElement.classList.add("paper-shell");
  }catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: BOOT_STYLE }} />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,520;9..144,560&family=Outfit:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
