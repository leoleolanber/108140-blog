const fields = {
  title: document.querySelector("#title"),
  slug: document.querySelector("#slug"),
  date: document.querySelector("#date"),
  tags: document.querySelector("#tags"),
  summary: document.querySelector("#summary"),
  featured: document.querySelector("#featured"),
  body: document.querySelector("#body")
};

const listEl = document.querySelector("#post-list");
const countEl = document.querySelector("#post-count");
const filterEl = document.querySelector("#post-filter");
const previewEl = document.querySelector("#preview");
const toastEl = document.querySelector("#toast");
const saveStateEl = document.querySelector("#save-state");
const draftStateEl = document.querySelector("#draft-state");
const wordCountEl = document.querySelector("#word-count");
const currentSlugEl = document.querySelector("#current-slug");
const previewUpdatedEl = document.querySelector("#preview-updated");
const consoleStateEl = document.querySelector("#console-state");
const publishLogEl = document.querySelector("#publish-log");

let currentSlug = "";
let dirty = false;
let posts = [];

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `post-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`;
}

function setState(message, isDirty = dirty) {
  saveStateEl.textContent = message;
  draftStateEl.textContent = isDirty ? "已修改" : "已保存";
}

function log(message, state = "完成") {
  consoleStateEl.textContent = state;
  publishLogEl.textContent = message || state;
}

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("is-error", isError);
  toastEl.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toastEl.hidden = true;
  }, isError ? 8000 : 3600);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `请求失败：${response.status}`);
  }
  return data;
}

function updateCounts() {
  const count = fields.body.value.replace(/\s+/g, "").length;
  wordCountEl.textContent = `${count} 字`;
  currentSlugEl.textContent = fields.slug.value || "未命名文章";
}

function markDirty() {
  dirty = true;
  setState("编辑中", true);
  updateCounts();
}

function fillForm(post) {
  currentSlug = post.slug || "";
  fields.title.value = post.title || "";
  fields.slug.value = post.slug || "";
  fields.date.value = String(post.date || "").slice(0, 10);
  fields.tags.value = (post.tags || []).join(", ");
  fields.summary.value = post.summary || "";
  fields.featured.checked = Boolean(post.featured);
  fields.body.value = post.body || "";
  dirty = false;
  setState("就绪", false);
  updateCounts();
  renderPreview().catch((error) => showToast(error.message, true));
}

function readForm() {
  return {
    oldSlug: currentSlug,
    title: fields.title.value,
    slug: fields.slug.value || slugify(fields.title.value),
    date: fields.date.value,
    tags: fields.tags.value,
    summary: fields.summary.value,
    featured: fields.featured.checked,
    image: "assets/hero.png",
    imageAlt: "信息技术博客背景图",
    body: fields.body.value
  };
}

function renderPostList() {
  const query = String(filterEl.value || "").trim().toLowerCase();
  const visible = posts.filter((post) => {
    const haystack = [post.title, post.slug, post.date, ...(post.tags || [])].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });

  countEl.textContent = posts.length;
  listEl.innerHTML = "";
  visible.forEach((post) => {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    button.className = `post-item ${post.slug === currentSlug ? "is-active" : ""}`;
    button.type = "button";
    title.textContent = post.title;
    meta.textContent = `${post.date || ""} · ${(post.tags || []).join(" / ")}`;
    button.append(title, meta);
    button.addEventListener("click", () => loadPost(post.slug));
    listEl.append(button);
  });
}

async function loadPosts() {
  const data = await request("/api/posts");
  posts = data.posts || [];
  renderPostList();
}

async function loadPost(slug) {
  const data = await request(`/api/post?slug=${encodeURIComponent(slug)}`);
  fillForm(data.post);
  await loadPosts();
}

function newPost() {
  const today = new Date().toISOString().slice(0, 10);
  fillForm({
    slug: "",
    title: "",
    date: today,
    tags: ["网络"],
    summary: "",
    body: "## 背景\n\n\n## 现象\n\n\n## 排查\n\n\n## 结论\n\n\n## LaTeX 示例\n\n$$\nT = \\frac{D}{t}\n$$\n"
  });
  currentSlug = "";
  dirty = true;
  setState("新文章", true);
  fields.title.focus();
}

async function savePost() {
  const payload = readForm();
  if (!payload.title.trim()) {
    showToast("先写标题。", true);
    return null;
  }
  if (!payload.body.trim()) {
    showToast("正文还是空的。", true);
    return null;
  }
  setState("保存中", true);
  const data = await request("/api/save", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  fillForm(data.post);
  await loadPosts();
  log(`已保存：content/posts/${data.post.slug}.md`, "已保存");
  showToast("已保存 Markdown 文件。");
  return data.post;
}

async function renderPreview() {
  const data = await request("/api/preview", {
    method: "POST",
    body: JSON.stringify({ body: fields.body.value })
  });
  previewEl.innerHTML = data.html || "<p>预览会显示在这里。</p>";
  previewUpdatedEl.textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([previewEl]).catch(() => {});
  }
}

async function buildSite() {
  const saved = await savePost();
  if (!saved) return;
  log("正在生成 _site ...", "生成中");
  const data = await request("/api/build", { method: "POST", body: "{}" });
  log(data.message || "已生成 _site。", "已生成");
  showToast(data.message || "已生成 _site。");
}

async function publishSite() {
  const saved = await savePost();
  if (!saved) return;
  const title = fields.title.value.trim() || "blog update";
  log("正在生成、提交并推送到 GitHub ...", "发布中");
  const data = await request("/api/publish", {
    method: "POST",
    body: JSON.stringify({ message: `Publish ${title}` })
  });
  log(`${data.message}\n${data.output || ""}`.trim(), data.ok ? "已发布" : "失败");
  showToast(data.message || "发布完成。", !data.ok);
}

function insertAtCursor(text, selectOffset = 0) {
  const input = fields.body;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  input.value = before + text + after;
  const cursor = start + text.length + selectOffset;
  input.focus();
  input.setSelectionRange(cursor, cursor);
  markDirty();
  schedulePreview();
}

function insertSnippet(type) {
  const snippets = {
    h2: "\n## 小标题\n\n",
    code: "\n```bash\n\n```\n",
    math: "\n$$\n\n$$\n",
    table: "\n| 项目 | 说明 |\n| --- | --- |\n|  |  |\n",
    quote: "\n> \n\n"
  };
  insertAtCursor(snippets[type] || "");
}

let previewTimer = 0;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => renderPreview().catch(() => {}), 350);
}

document.querySelector("#new-post").addEventListener("click", newPost);
document.querySelector("#save-post").addEventListener("click", () => savePost().catch((error) => {
  setState("保存失败", true);
  showToast(error.message, true);
}));
document.querySelector("#refresh-preview").addEventListener("click", () => renderPreview().catch((error) => showToast(error.message, true)));
document.querySelector("#build-site").addEventListener("click", () => buildSite().catch((error) => {
  log(error.message, "失败");
  showToast(error.message, true);
}));
document.querySelector("#publish-site").addEventListener("click", () => publishSite().catch((error) => {
  log(error.message, "失败");
  showToast(error.message, true);
}));

document.querySelectorAll("[data-insert]").forEach((button) => {
  button.addEventListener("click", () => insertSnippet(button.dataset.insert));
});

fields.title.addEventListener("input", () => {
  if (!currentSlug && !fields.slug.value) fields.slug.value = slugify(fields.title.value);
  markDirty();
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => {
    markDirty();
    if (field === fields.body) schedulePreview();
  });
});

filterEl.addEventListener("input", renderPostList);

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    savePost().catch((error) => showToast(error.message, true));
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

loadPosts()
  .then(async () => {
    if (posts[0]) await loadPost(posts[0].slug);
    else newPost();
  })
  .catch((error) => showToast(error.message, true));
