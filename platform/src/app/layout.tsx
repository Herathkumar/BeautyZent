import type { Metadata } from "next";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeautyZent — Premium salon & beauty marketplace",
  description:
    "BeautyZent marketplace for salons, barbers, spas, and similar businesses — book online and run your shop.",
  icons: {
    icon: [
      { url: "/explore-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/explore-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/explore-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
};

/** Paints shell before CSS/JS so cold starts don't flash the wrong theme. */
const BOOT_STYLE = `
html,body{background:#1c1714;color:#fffaf6;min-height:100%;min-height:100dvh}
html.paper-shell,html.paper-shell body{
  background:radial-gradient(1000px 500px at 10% -10%,rgba(201,168,124,.22),transparent 55%),
    linear-gradient(180deg,#f7f3ee 0%,#f3eee8 45%,#ebe4db 100%);
  color:#1c1714
}
/* Salon apps read the tenant's theme pack from --t-* (see salon-themes.css). */
html.manager-shell,html.manager-shell body,
html.stylist-shell,html.stylist-shell body,
html.book-shell,html.book-shell body{
  background:radial-gradient(950px 470px at 88% -8%,rgb(var(--t-glow-1-rgb)/var(--t-glow-1-a)),transparent 55%),
    radial-gradient(720px 390px at 0% 100%,rgb(var(--t-glow-2-rgb)/var(--t-glow-2-a)),transparent 52%),
    linear-gradient(180deg,var(--t-bg-1) 0%,var(--t-bg-2) 48%,var(--t-bg-3) 100%);
  color:var(--t-text)
}
html.display-shell,html.display-shell body{
  background:linear-gradient(180deg,#241c18 0%,#1c1714 50%,#15110f 100%);
  color:#fffaf6;
  color-scheme:dark
}
html.display-shell.customer-shell--light,html.display-shell.customer-shell--light body{
  background:#fafafa;
  color:#2a2521;
  color-scheme:light
}
html.display-shell.customer-shell--dark,html.display-shell.customer-shell--dark body{
  background:#121110;
  color:#faf7f2;
  color-scheme:dark
}
`

const BOOT_SCRIPT = `
(function(){
  try{
    var p=location.pathname||"";
    var manager=/^\\/(manager|admin)(\\/|$)/.test(p);
    var stylist=/^\\/stylist(\\/|$)/.test(p);
    var display=/^\\/display(\\/|$)/.test(p);
    var book=/^\\/book(\\/|$)/.test(p);
    var demo=/^\\/demo(\\/|$)/.test(p);
    var root=document.documentElement;

    /* Cached tenant branding keeps the salon's theme pack on screen from the first paint. */
    var slugMatch=p.match(/^\\/(book|display)\\/([^/]+)/i);
    var slug=slugMatch&&slugMatch[2]?decodeURIComponent(slugMatch[2]):null;
    var cached=null;
    try{
      var raw=null;
      if(manager||stylist){
        raw=localStorage.getItem("salon-brand:staff");
      }else if(slug){
        raw=localStorage.getItem("salon-brand:"+slug);
      }
      if(!raw) raw=localStorage.getItem("salon-brand:last");
      if(raw) cached=JSON.parse(raw);
    }catch(e){}

    var themeId=null,light=false;
    if(manager){
      root.classList.add("manager-shell");
      themeId=(cached&&cached.managerThemeId)||"cocoa";
      try{ light=localStorage.getItem("fhsalon-manager-theme")!=="dark"; }catch(e){ light=true; }
      if(!light) root.classList.add("manager-shell--dark");
    }
    else if(stylist){
      root.classList.add("stylist-shell");
      themeId="seaglass";
      try{ light=localStorage.getItem("fhsalon-stylist-theme")==="light"; }catch(e){}
      if(light) root.classList.add("stylist-shell--light");
    }
    else if(book){
      root.classList.add("book-shell","book-shell--marketplace");
      themeId="cocoa";
      try{
        if(/[?&]from=explore(?:&|$)/.test(location.search||"")){
          try{ sessionStorage.setItem("fhsalon-book-from-market","1"); }catch(e){}
        }
        try{
          localStorage.setItem("fhsalon-book-luxe-v3","1");
          localStorage.setItem("fhsalon-book-theme","dark");
        }catch(e){}
      }catch(e){}
    }
    else if(display||demo){
      root.classList.add("display-shell");
      if(/\\/reception(\\/|$)/.test(p)){
        try{
          if(localStorage.getItem("fhsalon-reception-theme")==="light"){
            root.classList.add("reception-shell--light");
          }
        }catch(e){}
      }else{
        try{
          if(localStorage.getItem("fhsalon-customer-theme")==="dark"){
            root.classList.add("customer-shell--dark");
          }else{
            root.classList.add("customer-shell--light");
          }
        }catch(e){ root.classList.add("customer-shell--light"); }
      }
    }
    else root.classList.add("paper-shell");

    if(themeId){
      root.setAttribute("data-salon-theme",themeId);
      if(light) root.classList.add("theme-light");
    }

    /* Stay up until React mounts — mobile cold starts often exceed a few seconds. */
    if(manager||stylist||display||book){
      var bg=themeId
        ?"linear-gradient(180deg,var(--t-bg-1) 0%,var(--t-bg-2) 50%,var(--t-bg-3) 100%)"
        :"linear-gradient(180deg,#241c18 0%,#1c1714 50%,#15110f 100%)";
      var fg=themeId?"var(--t-text)":"#fffaf6";
      if(display && !/\\/reception(\\/|$)/.test(p)){
        var custDark=false;
        try{ custDark=localStorage.getItem("fhsalon-customer-theme")==="dark"; }catch(e){}
        bg=custDark?"#121110":"#fafafa";
        fg=custDark?"#faf7f2":"#2a2521";
      }
      var label=manager?"Manager":stylist?"Stylist App":book?"Online Booking":"Salon Display";
      /* Active salon name: staff session (manager/stylist) or URL slug cache → last visit. */
      var brand="Salon";
      if(cached&&cached.name) brand=cached.name;
      else if(slug) brand=slug.charAt(0).toUpperCase()+slug.slice(1);
      var el=document.createElement("div");
      el.id="fhsalon-boot-splash";
      el.setAttribute("role","status");
      if(book){
        el.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;pointer-events:none;background:#0c0b0a";
        el.innerHTML='<div class="gold-logo-spin" style="width:80px;height:80px" role="status" aria-label="Loading"><div class="gold-logo-spin__world"><div class="gold-logo-spin__stage"><img src="/brand/beautyzent-logo-gold-mark.png" alt="" width="80" height="80" class="gold-logo-spin__face gold-logo-spin__face--front"/><img src="/brand/beautyzent-logo-gold-mark.png" alt="" width="80" height="80" class="gold-logo-spin__face gold-logo-spin__face--back"/></div></div></div>';
        var css=document.createElement("style");
        css.textContent=".gold-logo-spin{display:grid;place-items:center;perspective:900px;perspective-origin:50% 50%;overflow:visible}.gold-logo-spin__world{width:100%;height:100%;transform-style:preserve-3d}.gold-logo-spin__stage{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:gold-logo-yaw 2.8s linear infinite}.gold-logo-spin__face{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;backface-visibility:hidden}.gold-logo-spin__face--front{transform:translateZ(1px);filter:drop-shadow(0 6px 14px rgba(196,160,86,.28))}.gold-logo-spin__face--back{transform:rotateY(180deg) translateZ(1px);filter:brightness(.92)}@keyframes gold-logo-yaw{to{transform:rotateY(360deg)}}@media (prefers-reduced-motion:reduce){.gold-logo-spin__stage{animation:none}}";
        document.documentElement.appendChild(css);
        document.documentElement.appendChild(el);
      }else{
        el.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:2rem;pointer-events:none;background:"+bg+";color:"+fg+";font-family:Georgia,serif";
        el.innerHTML='<div style="text-align:center"><p style="margin:0;font-size:1.75rem;letter-spacing:.02em">'+brand.replace(/[<>&]/g,"")+'</p><p style="margin:.5rem 0 1rem;font:600 .75rem Outfit,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;opacity:.72">'+label+'</p><div style="width:1.5rem;height:1.5rem;margin:0 auto;border:2px solid rgba(127,127,127,.25);border-top-color:currentColor;border-radius:50%;animation:fhsalon-boot-spin .75s linear infinite"></div></div>';
        var css=document.createElement("style");
        css.textContent="@keyframes fhsalon-boot-spin{to{transform:rotate(360deg)}}";
        document.documentElement.appendChild(css);
        document.documentElement.appendChild(el);
      }
      setTimeout(function(){ var n=document.getElementById("fhsalon-boot-splash"); if(n) n.remove(); },2500);
    }

    /* Fonts after first paint — blocking Google CSS was delaying mobile opens. */
    var fl=document.createElement("link");
    fl.rel="stylesheet";
    fl.href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,520;9..144,560&family=Playfair+Display:wght@500;600&family=Inter:wght@400;500&family=Outfit:wght@400;500;600&display=swap";
    document.head.appendChild(fl);
  }catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: BOOT_STYLE }} />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        {/* Raw theme packs — not processed by Tailwind, so attribute selectors always win. */}
        <link rel="stylesheet" href="/salon-themes.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="antialiased">
        <ConfirmProvider>
          <RegisterServiceWorker />
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
}
