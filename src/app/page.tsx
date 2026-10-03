import { Suspense } from "react";
import { HomeView } from "@/components/HomeView";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="hero-wash h-[520px]" />}>
      <HomeView />
    </Suspense>
  );
}
