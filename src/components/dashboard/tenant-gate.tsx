"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Gate klien: tenant ditangguhkan → billing; onboarding belum selesai → wizard.
 */
export function TenantGate({
  suspended,
  onboardingDone,
}: {
  suspended: boolean;
  onboardingDone: boolean;
}) {
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!path) return;
    if (suspended && !path.startsWith("/dashboard/billing")) {
      router.replace("/dashboard/billing?suspended=1");
      return;
    }
    if (!onboardingDone && !path.startsWith("/dashboard/onboarding")) {
      router.replace("/dashboard/onboarding");
    }
  }, [suspended, onboardingDone, path, router]);

  return null;
}
