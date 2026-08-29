/**
 * Set a business's Explore cover from a local image file (marketplace DB only).
 * Usage:
 *   pnpm exec tsx scripts/with-marketplace-env.ts tsx scripts/set-explore-cover.ts --slug=demosalon --file=public/brand/beautyzent-spa-cover.jpg --type=SPA
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : "";
}

async function main() {
  const slug = arg("slug") || "demosalon";
  const fileRel = arg("file");
  const type = arg("type"); // optional businessType override
  if (!fileRel) {
    console.error("Missing --file=path/to/image.jpg");
    process.exit(1);
  }

  const filePath = path.isAbsolute(fileRel)
    ? fileRel
    : path.resolve(__dirname, "..", fileRel);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const bytes = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) {
    console.error(`No business with slug "${slug}"`);
    process.exit(1);
  }

  const updated = await prisma.salon.update({
    where: { id: salon.id },
    data: {
      coverData: bytes,
      coverMime: mime,
      coverUpdatedAt: new Date(),
      ...(type ? { businessType: type.toUpperCase() } : {}),
      listingStatus: "PUBLISHED",
      active: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      coverUpdatedAt: true,
    },
  });

  console.log("Cover set:");
  console.log(
    JSON.stringify(
      {
        ...updated,
        coverUrl: `/api/public/cover/${updated.id}`,
        explore: "http://localhost:3000/explore",
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
