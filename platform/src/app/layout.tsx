import type { Metadata } from "next";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeautyZent — Premium salon & beauty marketplace",
  description:
    "BeautyZent marketplace for salons, barbers, spas, and similar businesses — book online and run your shop.",
  icons: {
    icon: [{ url: "/brand/beautyzent-logo-rose-mark.png", type: "image/png" }],
    apple: [{ url: "/brand/beautyzent-logo-rose-mark.png" }],
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
  background:#f4ead9;
  color:#3d2b22;
  color-scheme:light
}
html.display-shell.customer-shell--dark,html.display-shell.customer-shell--dark body{
  background:#14110f;
  color:#f6efe4;
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
      themeId=(cached&&cached.stylistThemeId)||"seaglass";
      try{ light=localStorage.getItem("fhsalon-stylist-theme")==="light"; }catch(e){}
      if(light) root.classList.add("stylist-shell--light");
    }
    else if(book){
      root.classList.add("book-shell");
      try{
        var fromExplore=/[?&]from=explore(?:&|$)/.test(location.search||"");
        var fromMarket=false;
        try{ fromMarket=fromExplore||sessionStorage.getItem("fhsalon-book-from-market")==="1"; }catch(e){ fromMarket=fromExplore; }
        if(fromExplore){ try{ sessionStorage.setItem("fhsalon-book-from-market","1"); }catch(e){} }
        if(fromMarket){
          themeId="cocoa";
          light=true;
          root.classList.add("book-shell--light","book-shell--marketplace");
          try{ localStorage.setItem("fhsalon-book-theme","light"); }catch(e){}
        }else{
          themeId=(cached&&cached.bookingThemeId)||"plum";
          var bt=localStorage.getItem("fhsalon-book-theme")||"dark";
          light=bt==="light"||(bt==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches);
          if(light) root.classList.add("book-shell--light");
        }
      }catch(e){
        themeId=(cached&&cached.bookingThemeId)||"plum";
      }
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
        bg=custDark?"#14110f":"#f4ead9";
        fg=custDark?"#f6efe4":"#3d2b22";
      }
      var label=manager?"Manager":stylist?"Stylist App":book?"Online Booking":"Salon Display";
      /* Active salon name: staff session (manager/stylist) or URL slug cache → last visit. */
      var brand="Salon";
      if(cached&&cached.name) brand=cached.name;
      else if(slug) brand=slug.charAt(0).toUpperCase()+slug.slice(1);
      var el=document.createElement("div");
      el.id="fhsalon-boot-splash";
      el.setAttribute("role","status");
      el.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:2rem;pointer-events:none;background:"+bg+";color:"+fg+";font-family:Georgia,serif";
      el.innerHTML='<div style="text-align:center"><p style="margin:0;font-size:1.75rem;letter-spacing:.02em">'+brand.replace(/[<>&]/g,"")+'</p><p style="margin:.5rem 0 1rem;font:600 .75rem Outfit,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;opacity:.72">'+label+'</p><div style="width:1.5rem;height:1.5rem;margin:0 auto;border:2px solid rgba(127,127,127,.25);border-top-color:currentColor;border-radius:50%;animation:fhsalon-boot-spin .75s linear infinite"></div></div>';
      var css=document.createElement("style");
      css.textContent="@keyframes fhsalon-boot-spin{to{transform:rotate(360deg)}}";
      document.documentElement.appendChild(css);
      document.documentElement.appendChild(el);
      setTimeout(function(){ var n=document.getElementById("fhsalon-boot-splash"); if(n) n.remove(); },2500);
    }

    /* Fonts after first paint — blocking Google CSS was delaying mobile opens. */
    var fl=document.createElement("link");
    fl.rel="stylesheet";
    fl.href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,520;9..144,560&family=Outfit:wght@400;500;600&display=swap";
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
