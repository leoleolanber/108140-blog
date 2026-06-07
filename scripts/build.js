const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_site");
const contentDir = path.join(root, "content", "posts");

const site = {
  title: "blog.66zhang.cn",
  subtitle: "信息技术博客",
  url: "https://blog.66zhang.cn",
  description: "分享信息技术、网络、Linux、云服务、开发工具和 AI 应用的技术博客。",
  ogDescription: "面向信息技术实践，记录网络、系统、云服务、工具链和 AI 自动化。",
  heroCopy: "面向信息技术实践，记录网络、Linux、云服务、开发工具、AI 自动化和日常运维中的可复用经验。",
  topics: ["Network", "Linux", "Cloud", "Security", "AI"],
  stack: ["Markdown", "LaTeX", "GitHub Actions", "MathJax"],
  focus: [
    "网络协议、DNS、CDN 与访问质量",
    "Linux、Web 服务和云主机运维",
    "GitHub Pages、自动部署和静态站点",
    "AI 工具在技术工作流里的实际用法"
  ]
};

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith("ChatGPT Image")) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    if (entry.isFile()) fs.copyFileSync(src, dest);
  }
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeXml(value = "") {
  return escapeHtml(value).replaceAll("'", "&apos;");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date).replaceAll("/", ".");
}

function monthLabel(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function readingTime(text) {
  const words = text.replace(/\s+/g, "").length;
  return `${Math.max(1, Math.ceil(words / 550))} min`;
}

function slugFromFile(file) {
  return path.basename(file, ".md");
}

function protectMath(source) {
  const math = [];
  const stash = (match) => {
    const id = `@@MATH_${math.length}@@`;
    math.push(match);
    return id;
  };

  const protectedSource = source
    .replace(/\$\$[\s\S]+?\$\$/g, stash)
    .replace(/\\\[[\s\S]+?\\\]/g, stash)
    .replace(/(?<!\\)\$(?!\$)(?:\\.|[^$\\])+?(?<!\\)\$/g, stash);

  return {
    source: protectedSource,
    restore(html) {
      return html.replace(/@@MATH_(\d+)@@/g, (_, index) => escapeHtml(math[Number(index)] || ""));
    }
  };
}

function renderMarkdown(source) {
  const protectedMath = protectMath(source);
  return protectedMath.restore(md.render(protectedMath.source));
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  return String(tags).split(",").map((tag) => tag.trim()).filter(Boolean);
}

function readPosts() {
  return fs.readdirSync(contentDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(contentDir, file), "utf8");
      const parsed = matter(raw);
      const date = new Date(parsed.data.date);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`${file} is missing a valid date`);
      }

      const slug = parsed.data.slug || slugFromFile(file);
      const html = renderMarkdown(parsed.content);
      const tags = normalizeTags(parsed.data.tags);

      return {
        slug,
        title: parsed.data.title || slug,
        summary: parsed.data.summary || parsed.content.split(/\n\n/)[0].replace(/[#*_`>$]/g, "").trim(),
        date,
        dateText: formatDate(date),
        readingTime: parsed.data.readingTime || readingTime(parsed.content),
        tags,
        featured: Boolean(parsed.data.featured),
        image: parsed.data.image || "assets/hero.png",
        imageAlt: parsed.data.imageAlt || "技术博客配图",
        html
      };
    })
    .sort((a, b) => b.date - a.date);
}

function pageHead({ title, description, canonical, image = `${site.url}/assets/hero.png`, cssPath = "assets/styles.css", math = false }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <link rel="stylesheet" href="${cssPath}" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%23173d35'/%3E%3Cpath d='M16 42V22h8v20zm12 0V22h8v20zm12 0V22h8v20z' fill='%23f6ead7'/%3E%3C/svg%3E" />
${math ? `    <script>
      window.MathJax = {
        tex: {
          inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]],
          displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]]
        },
        options: {
          skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]
        }
      };
    </script>
    <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>` : ""}
  </head>`;
}

function header(prefix = "") {
  return `<header class="site-header">
      <a class="brand" href="${prefix}index.html" aria-label="${site.title} 首页">
        <span class="brand-mark">66</span>
        <span class="brand-name">${site.title}</span>
      </a>
      <nav class="site-nav" aria-label="主导航">
        <a href="${prefix}index.html#latest">文章</a>
        <a href="${prefix}index.html#notes">专题</a>
        <a href="${prefix}index.html#archive">归档</a>
        <a href="${prefix}feed.xml">RSS</a>
      </nav>
    </header>`;
}

function tagList(tags) {
  return tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("\n                ");
}

function postCard(post, featured = false) {
  const href = `posts/${post.slug}.html`;
  if (featured) {
    return `<article class="featured-post post-card" data-tags="${escapeHtml(post.tags.join(" "))}" data-title="${escapeHtml(post.title)}">
            <a href="${href}" class="post-image">
              <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" />
            </a>
            <div class="post-body">
              <div class="post-meta">
                <span>置顶</span>
                <time datetime="${post.date.toISOString().slice(0, 10)}">${post.dateText}</time>
                <span>${escapeHtml(post.readingTime)}</span>
              </div>
              <h3><a href="${href}">${escapeHtml(post.title)}</a></h3>
              <p>${escapeHtml(post.summary)}</p>
              <div class="tag-list" aria-label="标签">
                ${tagList(post.tags)}
              </div>
            </div>
          </article>`;
  }

  return `<article class="post-card compact" data-tags="${escapeHtml(post.tags.join(" "))}" data-title="${escapeHtml(post.title)}">
              <div class="post-body">
                <div class="post-meta">
                  <time datetime="${post.date.toISOString().slice(0, 10)}">${post.dateText}</time>
                  <span>${escapeHtml(post.readingTime)}</span>
                </div>
                <h3><a href="${href}">${escapeHtml(post.title)}</a></h3>
                <p>${escapeHtml(post.summary)}</p>
                <div class="tag-list">
                  ${tagList(post.tags)}
                </div>
              </div>
            </article>`;
}

function renderHome(posts) {
  const featured = posts.find((post) => post.featured) || posts[0];
  const rest = posts.filter((post) => post !== featured);
  const tags = [...new Set(posts.flatMap((post) => post.tags))];
  const tagCounts = tags
    .map((tag) => ({ tag, count: posts.filter((post) => post.tags.includes(tag)).length }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"));
  const archive = posts.reduce((items, post) => {
    const label = monthLabel(post.date);
    items.set(label, (items.get(label) || 0) + 1);
    return items;
  }, new Map());
  const latestPost = posts[0];

  return `${pageHead({
    title: `${site.title} | ${site.subtitle}`,
    description: site.description,
    canonical: `${site.url}/`
  })}
  <body>
    ${header("")}

    <main>
      <section class="hero" aria-label="${site.title}">
        <img src="assets/hero.png" alt="信息技术博客背景图" />
        <div class="hero-shade"></div>
        <div class="hero-content">
          <div class="hero-main">
            <p class="eyebrow">Information Technology</p>
            <h1>${site.title}</h1>
            <p class="hero-copy">${site.heroCopy}</p>
            <div class="hero-topics" aria-label="内容方向">
              ${site.topics.map((topic) => `<span>${topic}</span>`).join("\n              ")}
            </div>
            <div class="hero-actions" aria-label="精选入口">
              <a class="primary-link" href="#latest">阅读技术文章</a>
              <a class="secondary-link" href="#notes">浏览专题</a>
            </div>
          </div>
          <div class="hero-console" aria-label="站点概览">
            <div class="console-top">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="console-line"><span class="console-key">site</span><span>${site.title}</span></div>
            <div class="console-line"><span class="console-key">posts</span><span>${posts.length}</span></div>
            <div class="console-line"><span class="console-key">latest</span><span>${escapeHtml(latestPost.title)}</span></div>
            <div class="console-line"><span class="console-key">write</span><span>Markdown + LaTeX</span></div>
            <div class="console-stack">
              ${site.stack.map((item) => `<span>${escapeHtml(item)}</span>`).join("\n              ")}
            </div>
          </div>
        </div>
      </section>

      <div class="page-shell">
        <section id="latest" class="content-column" aria-labelledby="latest-title">
          <div class="signal-bar" aria-label="站点摘要">
            <div class="signal-item">
              <span class="signal-label">Articles</span>
              <strong>${posts.length}</strong>
              <span>技术文章</span>
            </div>
            <div class="signal-item">
              <span class="signal-label">Topics</span>
              <strong>${tags.length}</strong>
              <span>可筛选标签</span>
            </div>
            <div class="signal-item">
              <span class="signal-label">Latest</span>
              <strong>${latestPost.dateText}</strong>
              <span>${escapeHtml(latestPost.title)}</span>
            </div>
          </div>

          <div class="section-head">
            <div>
              <p class="section-kicker">Latest</p>
              <h2 id="latest-title">技术文章</h2>
            </div>
            <label class="search-box">
              <span>搜索</span>
              <input id="post-search" type="search" placeholder="网络、Linux、AI、部署" />
            </label>
          </div>

          <div class="filter-row" aria-label="文章筛选">
            <button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true">全部</button>
            ${tags.map((tag) => `<button class="filter-button" type="button" data-filter="${escapeHtml(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`).join("\n            ")}
          </div>

          ${postCard(featured, true)}

          <div class="post-list">
            ${rest.map((post) => postCard(post)).join("\n")}
          </div>

          <p id="empty-state" class="empty-state" hidden>没有找到匹配的文章。</p>
        </section>

        <aside class="sidebar" aria-label="侧栏">
          <section id="about" class="side-panel">
            <p class="side-kicker">About</p>
            <h2>关于 66zhang 技术博客</h2>
            <p>这里主要分享信息技术相关内容：网络基础、Linux 服务、云端部署、安全排障、开发工具和 AI 自动化实践。</p>
          </section>

          <section class="side-panel">
            <p class="side-kicker">Focus</p>
            <h2>关注方向</h2>
            <ul class="clean-list">
              ${site.focus.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n              ")}
            </ul>
          </section>

          <section class="side-panel command-panel">
            <p class="side-kicker">Workflow</p>
            <h2>写作流程</h2>
            <div class="command-list" aria-label="Markdown 写作流程">
              <span>content/posts/*.md</span>
              <span>npm run build</span>
              <span>GitHub Actions</span>
              <span>blog.66zhang.cn</span>
            </div>
          </section>

          <section id="notes" class="side-panel">
            <p class="side-kicker">Topics</p>
            <h2>专题索引</h2>
            <ol class="ranked-list">
              ${posts.slice(0, 5).map((post) => `<li><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></li>`).join("\n              ")}
            </ol>
          </section>

          <section class="side-panel">
            <p class="side-kicker">Tags</p>
            <h2>标签</h2>
            <div class="topic-matrix">
              ${tagCounts.map(({ tag, count }) => `<a href="#latest" data-tag-link="${escapeHtml(tag)}"><span>${escapeHtml(tag)}</span><strong>${count}</strong></a>`).join("\n              ")}
            </div>
          </section>

          <section id="archive" class="side-panel">
            <p class="side-kicker">Archive</p>
            <h2>归档</h2>
            ${[...archive.entries()].map(([label, count]) => `<div class="archive-row"><span>${escapeHtml(label)}</span><strong>${count}</strong></div>`).join("\n            ")}
          </section>
        </aside>
      </div>
    </main>

    <footer class="site-footer">
      <p>© 2026 ${site.title}</p>
      <a href="${site.url}/">${site.title}</a>
    </footer>

    <script src="assets/app.js"></script>
  </body>
</html>`;
}

function renderArticle(post) {
  return `${pageHead({
    title: `${post.title} | ${site.title}`,
    description: post.summary,
    canonical: `${site.url}/posts/${post.slug}.html`,
    cssPath: "../assets/styles.css",
    math: true
  })}
  <body>
    ${header("../")}

    <main class="article-shell">
      <article>
        <header class="article-hero">
          <img src="../${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" />
          <div class="article-title">
            <p class="section-kicker">${escapeHtml(post.tags.slice(0, 3).join(" / "))}</p>
            <h1>${escapeHtml(post.title)}</h1>
            <div class="post-meta">
              <time datetime="${post.date.toISOString().slice(0, 10)}">${post.dateText}</time>
              <span>${escapeHtml(post.readingTime)}</span>
              <span>${escapeHtml(post.tags.join(" / "))}</span>
            </div>
          </div>
        </header>

        <div class="prose">
          ${post.html}
        </div>
      </article>

      <a class="back-link" href="../index.html#latest">返回首页</a>
    </main>
  </body>
</html>`;
}

function render404() {
  return `${pageHead({
    title: `页面不存在 | ${site.title}`,
    description: "这个地址暂时没有内容，可以回到首页继续阅读。",
    canonical: `${site.url}/404.html`
  })}
  <body>
    ${header("")}
    <main class="article-shell">
      <section class="prose">
        <p class="section-kicker">404</p>
        <h1>页面不存在</h1>
        <p>这个地址暂时没有内容，可以回到首页继续阅读。</p>
        <p><a href="index.html">返回 ${site.title}</a></p>
      </section>
    </main>
  </body>
</html>`;
}

function renderFeed(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${site.url}/</link>
    <description>${escapeXml(site.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts.map((post) => `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${site.url}/posts/${post.slug}.html</link>
      <guid>${site.url}/posts/${post.slug}.html</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <description>${escapeXml(post.summary)}</description>
    </item>`).join("\n    ")}
  </channel>
</rss>`;
}

function renderSitemap(posts) {
  const urls = [
    { loc: `${site.url}/`, date: posts[0]?.date },
    ...posts.map((post) => ({ loc: `${site.url}/posts/${post.slug}.html`, date: post.date }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map((item) => `<url>
    <loc>${item.loc}</loc>
    <lastmod>${(item.date || new Date()).toISOString().slice(0, 10)}</lastmod>
  </url>`).join("\n  ")}
</urlset>`;
}

function build() {
  const posts = readPosts();
  cleanDir(outDir);
  copyDir(path.join(root, "assets"), path.join(outDir, "assets"));
  writeFile(path.join(outDir, "CNAME"), "blog.66zhang.cn\n");
  writeFile(path.join(outDir, ".nojekyll"), "");
  writeFile(path.join(outDir, "robots.txt"), `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`);
  writeFile(path.join(outDir, "index.html"), renderHome(posts));
  writeFile(path.join(outDir, "404.html"), render404());
  writeFile(path.join(outDir, "feed.xml"), renderFeed(posts));
  writeFile(path.join(outDir, "sitemap.xml"), renderSitemap(posts));
  for (const post of posts) {
    writeFile(path.join(outDir, "posts", `${post.slug}.html`), renderArticle(post));
  }
}

build();
