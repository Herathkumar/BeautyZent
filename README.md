# Farzana Hair Salon — Website

Marketing website for [Farzana Hair Salon](https://www.fhsalon.ca) in Dundas, Ontario.

Static site (HTML / CSS / JS). Branch: `fhsalon-website`.

## Salon details

- **Name:** Farzana Hair Salon  
- **Phone:** 905-920-2277  
- **Address:** 8 Taywood Crt, Dundas, ON L9H 7A2  
- **Domain:** www.fhsalon.ca  
- **Services:** Men’s and women’s haircuts  

Online reservations are planned for a later phase; booking is by phone for now.

A website chatbot answers common questions (services, location, hours) and can collect a booking request to send via WhatsApp/call.

## Local preview

```powershell
cd C:\Users\hkathira\a3-it-solutions
git switch fhsalon-website
python -m http.server 8080
```

Open http://localhost:8080

## Deploy to www.fhsalon.ca

Upload these files to your host (Netlify, Cloudflare Pages, or your domain host):

- `index.html`, `services.html`, `contact.html`, `favicon.png`
- `css/`, `js/`, `images/`

Point DNS for `fhsalon.ca` / `www.fhsalon.ca` at the host.

## Push this branch

```powershell
git push -u origin fhsalon-website
```

## Pages

| File | Route |
|------|--------|
| `index.html` | Home |
| `services.html` | Services |
| `contact.html` | Visit / contact |
