/** Seeded local-dev salons from prisma/seed.ts — do not create new tenants here. */

export type Tenant = {
  id: "fhsalon" | "demosalon";
  slug: string;
  name: string;
  managerEmail: string;
  stylistEmail: string;
  stylistName: string;
  otherStylistName: string;
  password: string;
  servicePattern: RegExp;
  uniqueService: string;
  uniqueProduct: string;
};

export const PLATFORM = {
  email: process.env.PLATFORM_ADMIN_EMAIL || "platform@salonbook.local",
  password: process.env.PLATFORM_ADMIN_PASSWORD || "demo1234",
};

export const TENANTS: Tenant[] = [
  {
    id: "fhsalon",
    slug: "fhsalon",
    name: "Farzana Hair Salon",
    managerEmail: "manager@fhsalon.ca",
    stylistEmail: "farzana@fhsalon.ca",
    stylistName: "Farzana",
    otherStylistName: "Aisha",
    password: "demo1234",
    servicePattern: /men'?s haircut|women'?s trim|beard|bang|fringe/i,
    uniqueService: "Women's cut & blow-dry",
    uniqueProduct: "QA-FH",
  },
  {
    id: "demosalon",
    slug: "demosalon",
    name: "Demo Hair Studio",
    managerEmail: "manager@demosalon.test",
    stylistEmail: "priya@demosalon.test",
    stylistName: "Priya",
    otherStylistName: "Marco",
    password: "demo1234",
    servicePattern: /balayage|women'?s cut|men'?s cut|skin fade/i,
    uniqueService: "Balayage",
    uniqueProduct: "QA-Demo",
  },
];

export const OTHER: Record<Tenant["id"], Tenant> = {
  fhsalon: TENANTS[1]!,
  demosalon: TENANTS[0]!,
};
