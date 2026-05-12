import type { MetadataRoute } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TailorFlow";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: "SaaS operasional tailor multi-tenant",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#2563eb",
  };
}
