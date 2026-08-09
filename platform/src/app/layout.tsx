import type { Metadata } from "next";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
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
html.book-shell,html.book-shell body{
  background:radial-gradient(900px 480px at 85% -5%,rgba(201,180,232,.22),transparent 55%),
    radial-gradient(700px 400px at 0% 90%,rgba(88,56,130,.32),transparent 50%),
    linear-gradient(180deg,#22182e 0%,#17121f 50%,#100c16 100%);
  color:#f8f4fc;
  color-scheme:dark
}
html.book-shell.book-shell--light,html.book-shell.book-shell--light body{
  background:radial-gradient(900px 480px at 85% -5%,rgba(155,126,196,.14),transparent 55%),
    radial-gradient(700px 400px at 0% 90%,rgba(122,90,168,.08),transparent 50%),
    linear-gradient(180deg,#fcfaff 0%,#f7f3fb 50%,#efe8f7 100%);
  color:#2a2434;
  color-scheme:light
}
html.display-shell,html.display-shell body{
  background:linear-gradient(180deg,#241c18 0%,#1c1714 50%,#15110f 100%);
  color:#fffaf6;
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
    var darkManager=false;
    if(manager){
      document.documentElement.classList.add("manager-shell");
      try{
        if(localStorage.getItem("fhsalon-manager-theme")==="dark"){
          darkManager=true;
          document.documentElement.classList.add("manager-shell--dark");
          var m=document.querySelector('meta[name="theme-color"]');
          if(m) m.setAttribute("content","#1c1714");
        }
      }catch(e){}
    }
    else if(stylist){
      document.documentElement.classList.add("stylist-shell");
      try{
        var st=localStorage.getItem("fhsalon-stylist-theme")||"dark";
        var sm=document.querySelector('meta[name="theme-color"]');
        // Light preference → dark surfaces; dark preference → light surfaces.
        if(st!=="light"){
          document.documentElement.classList.add("stylist-shell--light");
          if(sm) sm.setAttribute("content","#eef7f5");
        }else if(sm){
          sm.setAttribute("content","#0e1618");
        }
      }catch(e){}
    }
    else if(book){
      document.documentElement.classList.add("book-shell");
      try{
        var bt=localStorage.getItem("fhsalon-book-theme")||"dark";
        var light=bt==="light"||(bt==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches);
        var bm=document.querySelector('meta[name="theme-color"]');
        // Light preference → dark plum; dark preference → lilac mist.
        if(!light){
          document.documentElement.classList.add("book-shell--light");
          if(bm) bm.setAttribute("content","#f7f3fb");
        }else if(bm){
          bm.setAttribute("content","#17121f");
        }
      }catch(e){}
    }
    else if(display||demo){
      document.documentElement.classList.add("display-shell");
    }
    else document.documentElement.classList.add("paper-shell");

    /* Stay up until React mounts — mobile cold starts often exceed a few seconds. */
    if(manager||stylist||display){
      var bg=manager
        ?(darkManager
          ?"linear-gradient(180deg,#241c18 0%,#1c1714 50%,#15110f 100%)"
          :"linear-gradient(180deg,#fdf8f3 0%,#f7f1ea 50%,#f3ebe3 100%)")
        :stylist
          ?"linear-gradient(180deg,#152226 0%,#0e1618 48%,#0a1114 100%)"
          :"linear-gradient(180deg,#241c18 0%,#1c1714 50%,#15110f 100%)";
      var fg=manager&&!darkManager?"#2b2521":"#fffaf6";
      var label=manager?"Manager":stylist?"Stylist App":"Salon Display";
      var el=document.createElement("div");
      el.id="fhsalon-boot-splash";
      el.setAttribute("role","status");
      el.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:2rem;pointer-events:none;background:"+bg+";color:"+fg+";font-family:Georgia,serif";
      el.innerHTML='<div style="text-align:center"><p style="margin:0;font-size:1.75rem;letter-spacing:.02em">FHSalon</p><p style="margin:.5rem 0 1rem;font:600 .75rem Outfit,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;opacity:.72">'+label+'</p><div style="width:1.5rem;height:1.5rem;margin:0 auto;border:2px solid rgba(127,127,127,.25);border-top-color:currentColor;border-radius:50%;animation:fhsalon-boot-spin .75s linear infinite"></div></div>';
      var css=document.createElement("style");
      css.textContent="@keyframes fhsalon-boot-spin{to{transform:rotate(360deg)}}";
      document.documentElement.appendChild(css);
      document.documentElement.appendChild(el);
      setTimeout(function(){ var n=document.getElementById("fhsalon-boot-splash"); if(n) n.remove(); },20000);
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
