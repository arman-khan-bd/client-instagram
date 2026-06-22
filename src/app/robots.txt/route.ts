import { NextResponse } from "next/server";
import { api } from "../../lib/api";

export async function GET() {
  try {
    const settings = await api.getSeoSettings();
    const robotsTxt = settings?.robotsTxt || `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Sitemap: https://auragram.app/sitemap.xml`;

    return new NextResponse(robotsTxt, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (err: any) {
    console.error("Robots.txt generation error:", err);
    return new NextResponse("User-agent: *\nAllow: /", {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
