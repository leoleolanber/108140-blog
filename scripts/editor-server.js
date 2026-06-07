const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const matter = require("gray-matter");
const { build, renderMarkdown } = require("./build");

const root = path.resolve(__dirname, "..");
const adminDir = path.join(root, "admin");
const postsDir = path.join(root, "content", "posts");
const siteDir = path.join(root, "_site");
const port = Number(process.env.PORT || 4310);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function json(res, status, body) {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8");
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function safeJoin(base, requestPath) {
  const resolvedBase = path.resolve(base);
  const decoded = decodeURIComponent(requestPath);
  const target = path.resolve(resolvedBase, decoded.replace(/^\/+/, ""));
  if (target !== resolvedBase && !target.startsWith(resolvedBase + path.sep)) return null;
  return target;
}

function serveFile(res, base, requestPath, fallback = "index.html") {
  let file = safeJoin(base, requestPath);
  if (!file) return send(res, 403, "Forbidden");
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, fallback);
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return send(res, 404, "Not found");
  }
  const type = mime[path.extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  fs.createReadStream(file).pipe(res);
}

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `post-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function postPath(slug) {
  const safeSlug = slugify(slug);
  const file = path.resolve(postsDir, `${safeSlug}.md`);
  if (file !== postsDir && !file.startsWith(postsDir + path.sep)) {
    throw new Error("Invalid post path");
  }
  return file;
}

function readPost(file) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const slug = path.basename(file, ".md");
  return {
    slug,
    title: parsed.data.title || slug,
    date: parsed.data.date || "",
    tags: normalizeTags(parsed.data.tags),
    summary: parsed.data.summary || "",
    readingTime: parsed.data.readingTime || "",
    featured: Boolean(parsed.data.featured),
    image: parsed.data.image || "assets/hero.png",
    imageAlt: parsed.data.imageAlt || "信息技术博客背景图",
    body: parsed.content.trim()
  };
}

function listPosts() {
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
  return fs.readdirSync(postsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => readPost(path.join(postsDir, file)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, {
      cwd: root,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
      ...options
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code || 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function savePost(payload) {
  const slug = slugify(payload.slug || payload.title);
  const oldSlug = payload.oldSlug ? slugify(payload.oldSlug) : slug;
  const data = {
    title: String(payload.title || "未命名文章").trim(),
    date: String(payload.date || new Date().toISOString().slice(0, 10)).trim(),
    tags: normalizeTags(payload.tags),
    summary: String(payload.summary || "").trim(),
    readingTime: String(payload.readingTime || "").trim() || undefined,
    featured: Boolean(payload.featured) || undefined,
    image: String(payload.image || "assets/hero.png").trim(),
    imageAlt: String(payload.imageAlt || "信息技术博客背景图").trim()
  };
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined || data[key] === "") delete data[key];
  });

  const markdown = matter.stringify(`${String(payload.body || "").trim()}\n`, data);
  fs.mkdirSync(postsDir, { recursive: true });
  fs.writeFileSync(postPath(slug), markdown, "utf8");
  if (oldSlug !== slug && fs.existsSync(postPath(oldSlug))) {
    fs.unlinkSync(postPath(oldSlug));
  }
  return readPost(postPath(slug));
}

async function publish(message) {
  build();
  await run("git", ["add", "-A"]);
  const status = await run("git", ["status", "--porcelain"]);
  if (!status.stdout) {
    return {
      ok: true,
      message: "没有需要提交的变更。",
      output: ""
    };
  }

  const commitMessage = String(message || "Publish blog update").trim() || "Publish blog update";
  const commit = await run("git", ["commit", "-m", commitMessage]);
  if (!commit.ok) {
    return {
      ok: false,
      message: "提交失败。",
      output: `${commit.stdout}\n${commit.stderr}`.trim()
    };
  }

  const push = await run("git", ["push"]);
  return {
    ok: push.ok,
    message: push.ok ? "已发布到 GitHub，等待 GitHub Pages 自动部署。" : "推送失败。",
    output: [commit.stdout, commit.stderr, push.stdout, push.stderr].filter(Boolean).join("\n")
  };
}

async function api(req, res, pathname) {
  try {
    if (req.method === "GET" && pathname === "/api/posts") {
      return json(res, 200, { posts: listPosts().map(({ body, ...post }) => post) });
    }
    if (req.method === "GET" && pathname === "/api/post") {
      const url = new URL(req.url, "http://localhost");
      const slug = slugify(url.searchParams.get("slug"));
      const file = postPath(slug);
      if (!fs.existsSync(file)) return json(res, 404, { error: "文章不存在" });
      return json(res, 200, { post: readPost(file) });
    }
    if (req.method === "POST" && pathname === "/api/preview") {
      const payload = await readJson(req);
      return json(res, 200, { html: renderMarkdown(String(payload.body || "")) });
    }
    if (req.method === "POST" && pathname === "/api/save") {
      const payload = await readJson(req);
      const post = await savePost(payload);
      return json(res, 200, { post });
    }
    if (req.method === "POST" && pathname === "/api/build") {
      build();
      return json(res, 200, { ok: true, message: "已生成 _site。" });
    }
    if (req.method === "POST" && pathname === "/api/publish") {
      const payload = await readJson(req);
      return json(res, 200, await publish(payload.message));
    }
    return json(res, 404, { error: "Unknown API route" });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;
    if (pathname.startsWith("/api/")) return api(req, res, pathname);
    if (pathname === "/" || pathname === "/admin") {
      res.writeHead(302, { Location: "/admin/" });
      return res.end();
    }
    if (pathname.startsWith("/admin/")) {
      return serveFile(res, adminDir, pathname.replace(/^\/admin\/?/, ""));
    }
    if (pathname.startsWith("/site/")) {
      return serveFile(res, siteDir, pathname.replace(/^\/site\/?/, ""));
    }
    if (pathname.startsWith("/assets/")) {
      return serveFile(res, root, pathname);
    }
    return send(res, 404, "Not found");
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => {
    console.log(`Writing dashboard: http://localhost:${port}/admin/`);
  });
}

module.exports = { createServer };
