# ZentraLab Website

Marketing website for [ZentraLab](https://zentralab.ca) — AI-powered IT for small businesses.

Static site (HTML / CSS / JS). Separate from the ZentraLab POS monorepo (`a3-it-solutions`).

## Local preview

```powershell
cd C:\Users\hkathira\zentralab-website
python -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

Upload these files to your host (Netlify, Cloudflare Pages, or GoDaddy):

- `*.html`, `favicon.png`
- `css/`, `js/`, `images/`

Point `zentralab.ca` DNS at the host. See hosting notes in project chat history or your host’s custom-domain docs.

## Pages

| File | Route |
|------|--------|
| `index.html` | Home |
| `services.html` | Services |
| `industries.html` | Industries |
| `about.html` | About |
| `contact.html` | Contact / quote |
