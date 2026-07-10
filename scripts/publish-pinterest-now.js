// One-off: directly publish a single Pinterest post that didn't fire on schedule.
// Usage: node scripts/publish-pinterest-now.js <postId>
// Load .env manually (no dotenv dependency)
const fs = require("fs");
const path = require("path");
try {
  const envPath = path.join(__dirname, "..", ".env");
  const envText = fs.readFileSync(envPath, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
} catch (e) {
  console.warn("Could not load .env:", e.message);
}
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function deriveKey(key) {
  return crypto.createHash("sha256").update(key).digest();
}

function decryptToken(encryptedToken) {
  if (!encryptedToken.startsWith("{")) return encryptedToken;
  const { iv, encryptedData, authTag } = JSON.parse(encryptedToken);
  const key = deriveKey(process.env.ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAAD(Buffer.from("nextjs-token"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function getContentType(url) {
  const ext = url.split(".").pop()?.toLowerCase();
  const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
  return map[ext] || "image/jpeg";
}

async function main() {
  const postId = process.argv[2];
  if (!postId) {
    console.error("Usage: node scripts/publish-pinterest-now.js <postId>");
    process.exit(1);
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { media: true, socialAccount: true, socialAccountPage: true },
  });

  if (!post) throw new Error(`Post ${postId} not found`);
  if (post.platform !== "PINTEREST") throw new Error(`Post is ${post.platform}, not PINTEREST`);
  if (!post.media || post.media.length === 0) throw new Error("Pinterest post has no media");

  const sa = post.socialAccount;
  if (!sa) throw new Error("Post has no socialAccount");

  const accessToken = decryptToken(sa.accessToken);

  if (sa.tokenExpiresAt && new Date(sa.tokenExpiresAt) < new Date()) {
    throw new Error("Pinterest token is expired");
  }

  // Resolve board: from socialAccountPage if linked, else fetch from API, else create one
  let boardId = post.socialAccountPage?.pageId || null;
  let boardName = post.socialAccountPage?.pageName || null;
  if (!boardId) {
    console.log("[publish] No socialAccountPageId on post — fetching boards from Pinterest API");
    const boardsRes = await fetch("https://api.pinterest.com/v5/boards", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!boardsRes.ok) throw new Error(`Failed to list boards: ${boardsRes.status} ${await boardsRes.text()}`);
    const boards = await boardsRes.json();
    if (boards.items && boards.items.length > 0) {
      boardId = boards.items[0].id;
      boardName = boards.items[0].name;
      console.log(`[publish] Using existing board "${boardName}" (${boardId})`);
    } else {
      const desiredName = (await prisma.brand.findUnique({ where: { id: post.brandId } }))?.name || "Main";
      console.log(`[publish] No boards exist — creating "${desiredName}" board on Pinterest`);
      const createRes = await fetch("https://api.pinterest.com/v5/boards", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: desiredName, description: `Posts from ${desiredName}`, privacy: "PUBLIC" }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(`Failed to create board: ${JSON.stringify(createJson)}`);
      boardId = createJson.id;
      boardName = createJson.name;
      console.log(`[publish] ✓ Created board "${boardName}" (${boardId})`);
    }

    const page = await prisma.socialAccountPage.create({
      data: {
        socialAccountId: sa.id,
        name: boardName,
        pageId: boardId,
        pageName: boardName,
        accessToken: sa.accessToken,
        tokenExpiresAt: sa.tokenExpiresAt,
        platform: "PINTEREST",
      },
    });
    await prisma.post.update({ where: { id: post.id }, data: { socialAccountPageId: page.id } });
    console.log(`[publish] Linked board to post (SocialAccountPage ${page.id})`);
  }

  const media = post.media[0];
  const description = post.content.length > 800 ? post.content.substring(0, 797) + "..." : post.content;
  const pinData = {
    title: (post.title || post.content).substring(0, 100),
    description,
    board_id: boardId,
    media_source: {
      source_type: "image_url",
      url: media.url,
      content_type: getContentType(media.url),
    },
  };

  console.log("[publish] Creating pin…");
  const pinRes = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinData),
  });
  const pinJson = await pinRes.json();
  if (!pinRes.ok) {
    console.error("Pinterest API error:", pinJson);
    throw new Error(`Pinterest pin creation failed: ${pinJson.message || JSON.stringify(pinJson)}`);
  }

  const pinUrl = `https://www.pinterest.com/pin/${pinJson.id}/`;
  console.log(`[publish] ✓ Pin created: ${pinUrl}`);

  const now = new Date();
  await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { status: "PUBLISHED", url: pinUrl, publishedAt: now, updatedAt: now },
    }),
    prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_PUBLISHED",
        title: "Post Published",
        message: "Your post has been successfully published on Pinterest",
        metadata: { postId: post.id, platform: "PINTEREST", postUrl: pinUrl, pinId: pinJson.id },
      },
    }),
  ]);

  // Update calendar item status if linked
  const calendarItemId = post.platformMetadata?.calendarItemId;
  if (calendarItemId) {
    const group = await prisma.postGroup.findFirst({
      where: { id: post.postGroupId },
      include: { posts: true },
    });
    const allPublished = group?.posts.every((p) => p.id === post.id || p.status === "PUBLISHED");
    if (allPublished) {
      await prisma.contentCalendarItem.update({
        where: { id: calendarItemId },
        data: { status: "COMPLETED" },
      });
      console.log(`[publish] Marked calendar item ${calendarItemId} COMPLETED`);
    }
  }

  console.log("[publish] Done.");
}

main()
  .catch((e) => {
    console.error("[publish] FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
