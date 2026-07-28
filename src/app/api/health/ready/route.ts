import { getOperationalReadiness } from "@/lib/operations/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET() {
  try {
    const readiness = await getOperationalReadiness();
    return Response.json(
      {
        status: readiness.ready ? "ready" : "not-ready",
        checks: readiness.checks.map((check) => ({ name: check.name, status: check.status })),
      },
      { status: readiness.ready ? 200 : 503, headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { status: "not-ready", checks: [{ name: "readiness", status: "fail" }] },
      { status: 503, headers: responseHeaders },
    );
  }
}
