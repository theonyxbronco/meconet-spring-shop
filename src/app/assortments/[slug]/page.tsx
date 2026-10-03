import { notFound } from "next/navigation";
import { kits, kitBySlug } from "@/data/kits";
import { KitDetail } from "@/components/KitDetail";

export function generateStaticParams() {
  return kits.map((kit) => ({ slug: kit.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kit = kitBySlug(slug);
  return {
    title: kit ? `${kit.name} · Meconet Spring Shop` : "Meconet Spring Shop",
    description: kit?.shortText,
  };
}

export default async function KitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kit = kitBySlug(slug);
  if (!kit) notFound();
  return <KitDetail kit={kit} />;
}
