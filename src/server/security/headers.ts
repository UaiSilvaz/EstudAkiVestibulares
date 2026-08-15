export type HeaderRule = {
  key: string;
  value: string;
};

function compactPolicy(policy: string) {
  return policy.replace(/\s{2,}/g, " ").trim();
}

export function buildContentSecurityPolicy() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const scriptDevelopmentPolicy = isDevelopment ? " 'unsafe-eval'" : "";
  const upgradeInsecureRequests = isDevelopment ? "" : " upgrade-insecure-requests;";
  const developmentConnectSources = isDevelopment
    ? " http://localhost:* ws://localhost:*"
    : "";

  return compactPolicy(`
    default-src 'self';
    base-uri 'self';
    object-src 'none';
    frame-ancestors 'none';
    form-action 'self';
    script-src 'self' 'unsafe-inline'${scriptDevelopmentPolicy};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    media-src 'self' data: blob: https:;
    frame-src 'self' blob: https:;
    worker-src 'self' blob:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com${developmentConnectSources};
    manifest-src 'self';
    ${upgradeInsecureRequests}
  `);
}

export function securityHeaders(): HeaderRule[] {
  const headers: HeaderRule[] = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), browsing-topics=()",
    },
  ];

  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains; preload",
    });
  }

  return headers;
}

export function immutableAssetHeaders(): HeaderRule[] {
  return [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
}
