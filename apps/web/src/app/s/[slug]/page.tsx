import { PublicStore } from "@/components/public-store";
export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicStore slug={slug} />;
}
