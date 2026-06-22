import { NextResponse } from "next/server";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";

export async function GET() {
  try {
    const settings = await api.getSeoSettings();
    
    // Default static routes
    let links = settings?.sitemapLinks || [
      { url: "https://auragram.app/", priority: 1.0, changefreq: "daily" },
      { url: "https://auragram.app/explore", priority: 0.8, changefreq: "daily" },
      { url: "https://auragram.app/search", priority: 0.8, changefreq: "daily" },
      { url: "https://auragram.app/reels", priority: 0.7, changefreq: "daily" },
      { url: "https://auragram.app/tv", priority: 0.6, changefreq: "weekly" }
    ];

    if (typeof links === "string") {
      try {
        links = JSON.parse(links);
      } catch {
        links = [];
      }
    }

    // Dynamic routes from DB: Users
    const { data: users } = await supabase
      .from("User")
      .select("username")
      .order("createdAt", { ascending: false });

    // Dynamic routes from DB: Posts
    const { data: posts } = await supabase
      .from("Post")
      .select("id")
      .eq("isPrivate", false)
      .order("createdAt", { ascending: false });

    // Build the dynamic sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // 1. Add static & configured links
    if (Array.isArray(links)) {
      links.forEach((link: any) => {
        xml += `
  <url>
    <loc>${link.url}</loc>
    <priority>${link.priority || 0.5}</priority>
    <changefreq>${link.changefreq || "weekly"}</changefreq>
  </url>`;
      });
    }

    // 2. Add dynamic user profile links
    if (users && users.length > 0) {
      users.forEach((user: any) => {
        xml += `
  <url>
    <loc>https://auragram.app/profile/${encodeURIComponent(user.username)}</loc>
    <priority>0.6</priority>
    <changefreq>weekly</changefreq>
  </url>`;
      });
    }

    // 3. Add dynamic post dialog links (or post detail links)
    if (posts && posts.length > 0) {
      posts.forEach((post: any) => {
        xml += `
  <url>
    <loc>https://auragram.app/?post=${post.id}</loc>
    <priority>0.4</priority>
    <changefreq>monthly</changefreq>
  </url>`;
      });
    }

    xml += `
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=18000"
      },
    });
  } catch (err: any) {
    console.error("Sitemap.xml generation error:", err);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://auragram.app/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
}
