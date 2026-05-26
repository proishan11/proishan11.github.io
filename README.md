# Portfolio Site

A minimal, brutalist portfolio/blog built with [Hugo](https://gohugo.io/). Designed for GitHub Pages hosting.

## Features

- **Minimal monospace design** — warm cream palette with IBM Plex Mono
- **Light / Dark / Auto** theme toggle
- **Markdown** with full support for code blocks, math (KaTeX), tables, images
- **Syntax highlighting** via Hugo's built-in Chroma
- **Math rendering** via KaTeX (enable per-post with `math: true`)
- **Responsive** layout
- **GitHub Pages** deployment via Actions

## Quick Start

### Prerequisites

Install Hugo extended edition: https://gohugo.io/installation/

### Local Development

```bash
hugo server -D
```

### Create a New Post

```bash
hugo new posts/my-new-post.md
```

### Configuration

Edit `hugo.toml` to set your site title, tagline, and base URL:

```toml
baseURL = 'https://YOUR-USERNAME.github.io/'
title = 'YOUR.SITE'

[params]
  tagline = "YOUR TAGLINE HERE"
```

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. The included `.github/workflows/hugo.yml` will build and deploy on every push to `main`

## Writing Posts

Posts live in `content/posts/`. Frontmatter options:

```yaml
---
title: "Post Title"
subtitle: "Optional subtitle"
date: 2025-01-01
author: "Your Name"
math: false    # set to true to enable KaTeX
draft: false
---
```

### Math Support

Enable `math: true` in frontmatter, then use:

- Inline: `$E = mc^2$`
- Display: `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`
