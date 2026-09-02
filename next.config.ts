import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-превью проксируется через поддомен e2b.app, поэтому Next должен
  // считать этот origin доверенным (иначе блокируется HMR и ресурсы /_next).
  allowedDevOrigins: ["*.e2b.app"],

  images: {
    // Загруженные файлы отдаются с собственного домена (/uploads), внешние
    // ссылки на картинки товаров нужно разрешать явно.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
