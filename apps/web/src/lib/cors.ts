function allowedOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return [
    ...fromEnv,
    process.env.NEXT_PUBLIC_POS_URL ?? "http://localhost:3001",
    process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002",
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];
}

export function corsHeaders(origin: string | null): HeadersInit {
  const allowed = allowedOrigins();
  const allow =
    origin && allowed.includes(origin)
      ? origin
      : origin && process.env.CORS_ALLOW_LAN === "true" && isPrivateLanOrigin(origin)
        ? origin
        : allowed[0];

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function isPrivateLanOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

export function jsonWithCors(req: Request, data: unknown, init?: ResponseInit) {
  const origin = req.headers.get("origin");
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders(origin),
      ...(init?.headers ?? {}),
    },
  });
}

export function optionsResponse(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}
