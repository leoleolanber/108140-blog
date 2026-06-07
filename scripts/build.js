const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_site");
const contentDir = path.join(root, "content", "posts");

const site = {
  title: "Zulux's blog",
  subtitle: "信息技术博客",
  url: "https://blog.66zhang.cn",
  description: "分享网络、Linux、云服务、开发工具、安全排障和 AI 应用的技术博客。",
  author: "66zhang",
  heroCopy: "把信息技术里的命令、配置、故障、部署和思考整理成可检索、可复用、可长期维护的技术文章。",
  topics: ["网络", "Linux", "云服务", "安全", "AI", "工具链"],
  stack: ["Markdown", "LaTeX", "MathJax", "GitHub Actions"],
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

function textFromInline(token) {
  if (!token?.children) return token?.content || "";
  return token.children.map((child) => child.content || "").join("");
}

function slugifyHeading(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function uniqueHeadingId(env, title) {
  const base = slugifyHeading(title);
  env.headingIds = env.headingIds || new Map();
  const count = env.headingIds.get(base) || 0;
  env.headingIds.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
  const title = textFromInline(tokens[index + 1]);
  if (title) tokens[index].attrSet("id", uniqueHeadingId(env, title));
  return self.renderToken(tokens, index, options);
};

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith("ChatGPT Image")) continue;
    if (/^hero \(.+\)\./.test(entry.name)) continue;
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

function stripMarkdown(source) {
  return String(source || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~$|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  const protectedMath = protectMath(String(source || ""));
  return protectedMath.restore(md.render(protectedMath.source, {}));
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(tags).split(",").map((tag) => tag.trim()).filter(Boolean);
}

function extractHeadings(source) {
  const env = { headingIds: new Map() };
  return String(source || "")
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
      if (!match) return null;
      const text = match[2].replace(/[`*_~]/g, "").trim();
      return {
        level: match[1].length,
        text,
        id: uniqueHeadingId(env, text)
      };
    })
    .filter(Boolean);
}

function readPosts() {
  if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
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
      const content = parsed.content.trim();
      const tags = normalizeTags(parsed.data.tags);
      const summary = parsed.data.summary || stripMarkdown(content).slice(0, 120);

      return {
        slug,
        title: parsed.data.title || slug,
        summary,
        date,
        dateText: formatDate(date),
        readingTime: parsed.data.readingTime || readingTime(content),
        tags,
        featured: Boolean(parsed.data.featured),
        image: parsed.data.image || "assets/hero.png",
        imageAlt: parsed.data.imageAlt || "信息技术博客背景图",
        body: content,
        html: renderMarkdown(content),
        headings: extractHeadings(content)
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
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%2316221f'/%3E%3Cpath d='M15 44V20h8v24zm13 0V20h8v24zm13 0V20h8v24z' fill='%23e9f7ef'/%3E%3C/svg%3E" />
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
        <a href="${prefix}index.html#topics">专题</a>
        <a href="${prefix}index.html#archive">归档</a>
        <a href="${prefix}feed.xml">RSS</a>
      </nav>
    </header>`;
}

function tagList(tags) {
  return tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function postCard(post, { featured = false } = {}) {
  const href = `posts/${post.slug}.html`;
  if (featured) {
    return `<article class="post-card featured-post" data-tags="${escapeHtml(post.tags.join(" "))}" data-title="${escapeHtml(post.title)}">
            <a class="post-image" href="${href}">
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
              <div class="tag-list" aria-label="标签">${tagList(post.tags)}</div>
            </div>
          </article>`;
  }

  return `<article class="post-card list-post" data-tags="${escapeHtml(post.tags.join(" "))}" data-title="${escapeHtml(post.title)}">
              <div class="post-date-block">
                <strong>${String(post.date.getDate()).padStart(2, "0")}</strong>
                <span>${post.date.getFullYear()}.${String(post.date.getMonth() + 1).padStart(2, "0")}</span>
              </div>
              <div class="post-body">
                <div class="post-meta">
                  <span>${escapeHtml(post.readingTime)}</span>
                  <span>${escapeHtml(post.tags.slice(0, 2).join(" / "))}</span>
                </div>
                <h3><a href="${href}">${escapeHtml(post.title)}</a></h3>
                <p>${escapeHtml(post.summary)}</p>
                <div class="tag-list">${tagList(post.tags)}</div>
              </div>
            </article>`;
}

function renderTopicBlocks(tagCounts, posts) {
  return tagCounts.map(({ tag, count }) => {
    const related = posts.filter((post) => post.tags.includes(tag)).slice(0, 3);
    return `<article class="topic-card">
          <div class="topic-card-head">
            <span>${escapeHtml(tag)}</span>
            <strong>${count}</strong>
          </div>
          <ul>
            ${related.map((post) => `<li><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></li>`).join("")}
          </ul>
        </article>`;
  }).join("");
}

function renderHome(posts) {
  const safePosts = posts.length ? posts : [];
  const featured = safePosts.find((post) => post.featured) || safePosts[0];
  const rest = safePosts.filter((post) => post !== featured);
  const tags = [...new Set(safePosts.flatMap((post) => post.tags))];
  const tagCounts = tags
    .map((tag) => ({ tag, count: safePosts.filter((post) => post.tags.includes(tag)).length }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"));
  const archive = safePosts.reduce((items, post) => {
    const label = monthLabel(post.date);
    items.set(label, (items.get(label) || 0) + 1);
    return items;
  }, new Map());
  const latestPost = safePosts[0];

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
            <p class="eyebrow">Information Technology Notes</p>
            <h1>${site.title}</h1>
            <p class="hero-copy">${site.heroCopy}</p>
            <div class="hero-topics" aria-label="内容方向">
              ${site.topics.map((topic) => `<span>${escapeHtml(topic)}</span>`).join("")}
            </div>
          </div>
          <div class="hero-panel" aria-label="站点概览">
            <div>
              <span class="panel-label">Latest</span>
              <strong>${escapeHtml(latestPost?.title || "准备写第一篇文章")}</strong>
              <a href="#latest">进入文章流</a>
            </div>
            <dl class="site-metrics">
              <div><dt>文章</dt><dd>${safePosts.length}</dd></div>
              <div><dt>标签</dt><dd>${tags.length}</dd></div>
              <div><dt>写作</dt><dd>MD</dd></div>
            </dl>
            <div class="pipeline">
              ${site.stack.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <div class="blog-shell">
        <section id="latest" class="feed-column" aria-labelledby="latest-title">
          <div class="section-head">
            <div>
              <p class="section-kicker">Latest Posts</p>
              <h2 id="latest-title">技术文章</h2>
            </div>
            <label class="search-box">
              <span>搜索文章</span>
              <input id="post-search" type="search" placeholder="DNS、Linux、AI、部署" />
            </label>
          </div>

          <div class="filter-row" aria-label="文章筛选">
            <button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true">全部</button>
            ${tags.map((tag) => `<button class="filter-button" type="button" data-filter="${escapeHtml(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`).join("")}
          </div>

          ${featured ? postCard(featured, { featured: true }) : ""}

          <div class="post-list">
            ${rest.map((post) => postCard(post)).join("")}
          </div>

          <p id="empty-state" class="empty-state" hidden>没有找到匹配的文章。</p>
        </section>

        <aside class="site-sidebar" aria-label="博客侧栏">
          <section class="side-panel author-panel">
            <p class="side-kicker">Author</p>
            <h2>${site.author}</h2>
            <p>记录信息技术实践：网络、系统、部署、排障、工具链和 AI 自动化。</p>
          </section>

          <section class="side-panel">
            <p class="side-kicker">Focus</p>
            <h2>关注方向</h2>
            <ul class="clean-list">
              ${site.focus.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </section>

          <section class="side-panel">
            <p class="side-kicker">Tags</p>
            <h2>标签云</h2>
            <div class="tag-cloud">
              ${tagCounts.map(({ tag, count }) => `<a href="#latest" data-tag-link="${escapeHtml(tag)}"><span>${escapeHtml(tag)}</span><strong>${count}</strong></a>`).join("")}
            </div>
          </section>

          <section id="archive" class="side-panel">
            <p class="side-kicker">Archive</p>
            <h2>归档</h2>
            ${[...archive.entries()].map(([label, count]) => `<div class="archive-row"><span>${escapeHtml(label)}</span><strong>${count}</strong></div>`).join("")}
          </section>
        </aside>
      </div>

      <section id="topics" class="topic-section" aria-labelledby="topics-title">
        <div class="section-head">
          <div>
            <p class="section-kicker">Topics</p>
            <h2 id="topics-title">专题目录</h2>
          </div>
          <a class="rss-link" href="feed.xml">RSS 订阅</a>
        </div>
        <div class="topic-grid">
          ${renderTopicBlocks(tagCounts, safePosts)}
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <p>© 2026 ${site.title}</p>
      <span>Markdown + LaTeX + GitHub Pages</span>
    </footer>

    <script src="assets/app.js"></script>
  </body>
</html>`;
}

function renderToc(post) {
  if (!post.headings.length) return `<p class="toc-empty">这篇文章没有二级标题。</p>`;
  return `<ol class="toc-list">
      ${post.headings.map((heading) => `<li class="level-${heading.level}"><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a></li>`).join("")}
    </ol>`;
}

function renderArticle(post, posts) {
  const related = posts.filter((item) => item.slug !== post.slug && item.tags.some((tag) => post.tags.includes(tag))).slice(0, 3);
  return `${pageHead({
    title: `${post.title} | ${site.title}`,
    description: post.summary,
    canonical: `${site.url}/posts/${post.slug}.html`,
    cssPath: "../assets/styles.css",
    math: true
  })}
  <body>
    ${header("../")}

    <main class="article-page">
      <header class="article-hero">
        <img src="../${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" />
        <div class="article-hero-shade"></div>
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

      <div class="article-layout">
        <article class="article-body prose">
          ${post.html}
        </article>

        <aside class="article-aside" aria-label="文章信息">
          <section class="side-panel toc-panel">
            <p class="side-kicker">Contents</p>
            <h2>文章目录</h2>
            ${renderToc(post)}
          </section>

          <section class="side-panel">
            <p class="side-kicker">Tags</p>
            <h2>相关标签</h2>
            <div class="tag-cloud small">
              ${post.tags.map((tag) => `<a href="../index.html#latest"><span>${escapeHtml(tag)}</span></a>`).join("")}
            </div>
          </section>

          ${related.length ? `<section class="side-panel">
            <p class="side-kicker">Related</p>
            <h2>相关笔记</h2>
            <ol class="related-list">
              ${related.map((item) => `<li><a href="${item.slug}.html">${escapeHtml(item.title)}</a></li>`).join("")}
            </ol>
          </section>` : ""}
        </aside>
      </div>

      <nav class="article-nav" aria-label="文章导航">
        <a href="../index.html#latest">返回文章列表</a>
        <a href="../feed.xml">订阅 RSS</a>
      </nav>
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
    <main class="article-page">
      <section class="not-found prose">
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

function renderSearchIndex(posts) {
  return JSON.stringify(posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    url: `${site.url}/posts/${post.slug}.html`,
    date: post.date.toISOString().slice(0, 10),
    tags: post.tags,
    summary: post.summary,
    text: stripMarkdown(post.body).slice(0, 1200)
  })), null, 2);
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
  writeFile(path.join(outDir, "search.json"), renderSearchIndex(posts));
  for (const post of posts) {
    writeFile(path.join(outDir, "posts", `${post.slug}.html`), renderArticle(post, posts));
  }
}

if (require.main === module) {
  build();
}

module.exports = {
  build,
  renderMarkdown,
  readPosts
};
