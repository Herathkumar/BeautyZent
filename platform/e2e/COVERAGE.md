# BeautyZent E2E coverage inventory

Generated: 2026-09-13T18:43:05.699Z

## Summary

| Metric | Value |
| --- | --- |
| Spec files | 40 |
| Estimated tests | 129 |
| Features tracked | 34 |
| Covered | 25 |
| Partial | 3 |
| Gaps | 3 |
| Out of scope | 3 |
| Weighted coverage | **85%** |

## Feature matrix

| Area | Feature | Status | Specs | Notes |
| --- | --- | --- | --- | --- |
| Landing | Home / BeautyZent landing CTAs | COVERED | smoke.spec.ts |  |
| Explore | Directory search, filters, sort, rewards | COVERED | explore-discovery.spec.ts |  |
| Explore | Business detail page + Book CTA + deep link | COVERED | explore-business.spec.ts |  |
| Explore | Favorite business from explore detail (signed-in) | COVERED | explore-business.spec.ts, consumer-account.spec.ts |  |
| Claim | Self-serve claim → DRAFT listing | COVERED | marketplace-lifecycle.spec.ts |  |
| Platform | Approve / reject / pause marketplace listing | COVERED | marketplace-lifecycle.spec.ts |  |
| Platform | Console lists tenants + configure smoke | COVERED | multi-salon/platform-console.spec.ts |  |
| Platform | Create salon submit + manager can log in | PARTIAL | multi-salon/platform-console.spec.ts | Form load covered; full create+login not asserted |
| Account | Consumer OTP account API (profile, favorites, cancel/reschedule) | COVERED | consumer-account.spec.ts |  |
| Account | Consumer account UI sign-in + tabs | COVERED | consumer-account-ui.spec.ts |  |
| Account | Multi-salon switch across memberships | GAP | — | API exists; no dedicated e2e yet |
| Booking | Guest booking wizard end-to-end | COVERED | booking.spec.ts, guest-booking-visibility.spec.ts |  |
| Booking | Member join / OTP / look book / BeautyAI tabs | COVERED | member-auth.spec.ts, look-book.spec.ts, client-profile.spec.ts |  |
| Booking | Booking edges (confirmation, stepper) | COVERED | booking-edges.spec.ts |  |
| Booking | Style preview AI generate | GAP | — | Depends on AI provider; skipped in suite |
| Booking | Day path: book → display → stylist Done → admin | COVERED | salon-day.spec.ts |  |
| Auth | Manager/stylist guards, bad password, role routing, logout | COVERED | auth.spec.ts |  |
| Auth | Dedicated FRONT_DESK role flows | PARTIAL | reception-auth.spec.ts | Reception uses manager creds in helpers |
| Manager | Login, dashboard, services, book-for-client | COVERED | admin.spec.ts, admin-book.spec.ts |  |
| Manager | Appointments filters + no-show | COVERED | admin-bookings-filter.spec.ts |  |
| Manager | Promotions + payroll + store earnings | COVERED | admin-promotions.spec.ts, admin-pay.spec.ts, admin-store-earnings.spec.ts |  |
| Manager | Walk-in / waitlist / dashboard summary | COVERED | walk-in.spec.ts, dashboard-summary.spec.ts |  |
| Manager | Stylist accounts, photo, manage schedule page | COVERED | stylist-accounts.spec.ts, manager-photo.spec.ts, manager-stylist-schedule.spec.ts |  |
| Manager | Mark payroll payout paid / earnings goal edit | PARTIAL | admin-pay.spec.ts, admin-store-earnings.spec.ts | Page load / UI smoke; payout mark thin |
| Stylist | Login, floor board, schedule, earnings, photo | COVERED | stylist.spec.ts, stylist-schedule.spec.ts, stylist-earnings.spec.ts, stylist-photo.spec.ts |  |
| Displays | Lounge / scheduler / reception surfaces | COVERED | smoke.spec.ts, reception-auth.spec.ts, multi-salon/public-apps.spec.ts |  |
| Displays | Display root redirect + PIN unlock | COVERED | display-redirect.spec.ts, display-pin.spec.ts |  |
| Displays | Checkout promotions / loyalty auto-discount | COVERED | checkout-promotions.spec.ts |  |
| Displays | Retail product lines on checkout bill | GAP | — |  |
| Multi-salon | Tenant isolation, catalog, stylist, earnings lifecycle | COVERED | multi-salon/tenant-isolation.spec.ts, multi-salon/manager-catalog.spec.ts, multi-salon/stylist-app.spec.ts, multi-salon/earnings-lifecycle.spec.ts, multi-salon/public-apps.spec.ts |  |
| Mobile | iPhone viewport book + staff nav + demo hub | COVERED | mobile.spec.ts, smoke.spec.ts |  |
| Integrations | Google Calendar OAuth / ICS | OUT OF SCOPE | — | Optional integration; not in local e2e |
| Payments | Card / payment processor | OUT OF SCOPE | — | In-salon checkout only (no PSP) |
| Marketing | Netlify static marketing HTML | OUT OF SCOPE | — |  |

## Spec files

- `admin-book.spec.ts`
- `admin-bookings-filter.spec.ts`
- `admin-pay.spec.ts`
- `admin-promotions.spec.ts`
- `admin-store-earnings.spec.ts`
- `admin.spec.ts`
- `auth.spec.ts`
- `booking-edges.spec.ts`
- `booking.spec.ts`
- `checkout-promotions.spec.ts`
- `client-profile.spec.ts`
- `consumer-account-ui.spec.ts`
- `consumer-account.spec.ts`
- `dashboard-summary.spec.ts`
- `display-pin.spec.ts`
- `display-redirect.spec.ts`
- `explore-business.spec.ts`
- `explore-discovery.spec.ts`
- `guest-booking-visibility.spec.ts`
- `look-book.spec.ts`
- `manager-photo.spec.ts`
- `manager-stylist-schedule.spec.ts`
- `marketplace-lifecycle.spec.ts`
- `member-auth.spec.ts`
- `mobile.spec.ts`
- `multi-salon/earnings-lifecycle.spec.ts`
- `multi-salon/manager-catalog.spec.ts`
- `multi-salon/platform-console.spec.ts`
- `multi-salon/public-apps.spec.ts`
- `multi-salon/stylist-app.spec.ts`
- `multi-salon/tenant-isolation.spec.ts`
- `reception-auth.spec.ts`
- `salon-day.spec.ts`
- `smoke.spec.ts`
- `stylist-accounts.spec.ts`
- `stylist-earnings.spec.ts`
- `stylist-photo.spec.ts`
- `stylist-schedule.spec.ts`
- `stylist.spec.ts`
- `walk-in.spec.ts`
