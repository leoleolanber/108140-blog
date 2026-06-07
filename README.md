# 108140.xyz Blog

这是一个为 `108140.xyz` 准备的 GitHub Pages 静态博客。页面结构参考内容型博客的信息密度：首屏、文章流、搜索、标签筛选、侧栏、归档、RSS、站点地图和 404 页面。

## 本地预览

直接打开 `index.html` 即可预览。也可以在目录里启动一个静态服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://localhost:4173/`。

## 发布到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `108140-blog`。
2. 把本目录推到仓库的 `main` 分支。
3. 在仓库的 Settings -> Pages 里选择 GitHub Actions 作为发布方式。
4. 在 Settings -> Pages -> Custom domain 中填写 `108140.xyz` 并保存。
5. 等待 `Deploy static blog` 工作流完成。
6. GitHub Actions 发布主要依赖 Pages 设置里的 Custom domain。仓库根目录里的 `CNAME` 文件已保留 `108140.xyz`，方便以后改成分支发布或同步记录。

## 域名 DNS

如果你的域名托管商支持根域名 ALIAS/ANAME，优先把 `108140.xyz` 指向你的 GitHub Pages 地址。

常见 A 记录也可以使用 GitHub Pages 的地址：

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

IPv6 可添加 AAAA 记录：

```text
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

如果还想支持 `www.108140.xyz`，添加一条 CNAME：

```text
www -> <你的 GitHub 用户名>.github.io
```

## 后续编辑

- 首页文章列表在 `index.html`
- 样式在 `assets/styles.css`
- 搜索和标签筛选在 `assets/app.js`
- 文章页在 `posts/`
- 自定义域名在 `CNAME`
