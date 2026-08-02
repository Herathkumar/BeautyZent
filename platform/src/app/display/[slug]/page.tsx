import { DisplayBoard } from "./DisplayBoard";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DisplayBoard slug={slug} />;
}
