export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET() {
  return Response.json({ status: "ok" }, { status: 200, headers: responseHeaders });
}
