import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-превью проксируется через поддомен e2b.app, поэтому Next должен
  // считать этот origin доверенным (иначе блокируется HMR и ресурсы /_next).
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
