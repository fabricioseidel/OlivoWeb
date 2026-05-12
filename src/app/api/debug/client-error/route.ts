import { NextRequest, NextResponse } from "next/server";

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { message, stack, componentStack } = body || {};

  if (typeof message === "string" && message.startsWith("CLICK")) {
    // CLICK [/path] [tag] "label" → href
    const formatted = message
      .replace(/^CLICK /, `${C.cyan}${C.bold}▸ CLICK${C.reset} `)
      .replace(/\[(\/[^\]]*)\]/, `${C.gray}[$1]${C.reset}`)
      .replace(/\[([a-z0-9-]+)\]/i, `${C.magenta}<$1>${C.reset}`)
      .replace(/→ (\S+)/, `${C.dim}→${C.reset} ${C.cyan}$1${C.reset}`);
    console.log(formatted);
    return NextResponse.json({ ok: true });
  }

  // Error real
  const msg = message ?? "(sin mensaje)";
  console.error(`\n${C.red}${C.bold}✖ CLIENT ERROR${C.reset} ${C.red}${msg}${C.reset}`);
  if (stack) {
    const lines = String(stack).split("\n").slice(0, 8).join("\n");
    console.error(`${C.dim}${lines}${C.reset}`);
  }
  if (componentStack) {
    const lines = String(componentStack).split("\n").filter(Boolean).slice(0, 6).join("\n");
    console.error(`${C.yellow}┌ component stack${C.reset}\n${C.dim}${lines}${C.reset}`);
  }
  return NextResponse.json({ ok: true });
}
