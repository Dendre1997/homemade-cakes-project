import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "D&K Creations | Homemade Cakes",
    short_name: "D&K Cakes",
    description: "Handcrafted cakes for your sweetest moments",
    start_url: "/",
    display: "standalone",
    background_color: "#f6dcda",
    theme_color: "#cea3a6",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
