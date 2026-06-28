import type { MetadataRoute } from "next";
import { getSeoPage, seoBrand } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Enbilir Piyasa Akademisi",
    short_name: "Enbilir",
    description: getSeoPage("home", "tr").description,
    start_url: "/tr",
    scope: "/",
    display: "standalone",
    background_color: "#f6f1ed",
    theme_color: "#0f766e",
    categories: ["education", "finance", "productivity"],
    lang: "tr-TR",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        label: `${seoBrand.siteName} logo`,
      },
    ],
  };
}
