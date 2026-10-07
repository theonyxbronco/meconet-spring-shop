import { notFound } from "next/navigation";
import { springsOfType } from "@/data/kits";
import { SPRING_TYPE_LABEL, type SpringType } from "@/data/types";
import { SpringTypeView } from "@/components/SpringTypeView";

const TYPES = Object.keys(SPRING_TYPE_LABEL) as SpringType[];
const isSpringType = (value: string): value is SpringType => value in SPRING_TYPE_LABEL;

export function generateStaticParams() {
  return TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const label = isSpringType(type) ? `${SPRING_TYPE_LABEL[type]}s` : "Springs";
  return {
    title: `${label} · Meconet Spring Shop`,
    description: `Every ${label.toLowerCase()} size in the Meconet assortments, and the kit each one comes in.`,
  };
}

export default async function SpringTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isSpringType(type)) notFound();
  return <SpringTypeView type={type} listings={springsOfType(type)} />;
}
