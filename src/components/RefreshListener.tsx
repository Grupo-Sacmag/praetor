"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RefreshListener() {
  const router = useRouter();
  useEffect(() => {
    const h = () => router.refresh();
    window.addEventListener("portal:refresh", h);
    return () => window.removeEventListener("portal:refresh", h);
  }, [router]);
  return null;
}
