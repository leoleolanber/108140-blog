const posts = [...document.querySelectorAll(".post-card")];
const searchInput = document.querySelector("#post-search");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const tagLinks = [...document.querySelectorAll("[data-tag-link]")];
const emptyState = document.querySelector("#empty-state");

let activeFilter = "all";

function normalize(value) {
  return value.toLowerCase().trim();
}

function updatePosts() {
  const query = normalize(searchInput?.value || "");
  let visibleCount = 0;

  posts.forEach((post) => {
    const title = normalize(post.dataset.title || "");
    const tags = normalize(post.dataset.tags || "");
    const body = normalize(post.textContent || "");
    const matchesFilter = activeFilter === "all" || tags.includes(normalize(activeFilter));
    const matchesSearch = !query || title.includes(query) || tags.includes(query) || body.includes(query);
    const visible = matchesFilter && matchesSearch;

    post.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter || "all";
    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
    updatePosts();
  });
});

tagLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.tagLink;
    const button = filterButtons.find((item) => item.dataset.filter === target);
    button?.click();
  });
});

searchInput?.addEventListener("input", updatePosts);
