# 📸 MGB Photography Portfolio

[![Deploy to Cloudflare Pages](https://github.com/milesberry/photography-portfolio/actions/workflows/cloudflare-deploy.yml/badge.svg)](https://github.com/milesberry/photography-portfolio/actions/workflows/cloudflare-deploy.yml)
[![Quality checks](https://github.com/milesberry/photography-portfolio/actions/workflows/quality.yml/badge.svg)](https://github.com/milesberry/photography-portfolio/actions/workflows/quality.yml)

Miles Berry's photography portfolio — curated albums of up to 24 photos per trip, built with [Astro](https://astro.build) and deployed to Cloudflare Pages, with images served from Cloudflare R2.

👉 [milesberry.photos](https://milesberry.photos)

## Architecture

- **Framework**: Astro (static site generation)
- **Hosting**: Cloudflare Pages, deployed automatically on push to `main`
- **Image storage**: Cloudflare R2 (`images.milesberry.photos`), served via custom subdomain
- **Metadata**: AI-generated titles and descriptions via Claude Haiku vision API (`generate-metadata.mjs`)
- **Styling**: TailwindCSS + GLightbox lightbox

Images are not stored in the repository. They live in R2 and are referenced by URL in `src/gallery/gallery.yaml`.

## Working with photos

### Uploading a new album to R2

```bash
./upload-photos.sh <local-folder> <album-name>
# e.g. ./upload-photos.sh ~/Pictures/paris-2026 paris-2026
```

Requires the `r2` AWS CLI profile to be configured with your Cloudflare R2 credentials and the EU endpoint:

```
endpoint_url = https://<account-id>.eu.r2.cloudflarestorage.com
```

### Generating metadata

```bash
node generate-metadata.mjs <album-name>
# e.g. node generate-metadata.mjs paris-2026
```

This sends each image to Claude Haiku and generates a title and description, then merges the results into `src/gallery/gallery.yaml`. Images already in the YAML are skipped. Requires `ANTHROPIC_API_KEY` to be set in the environment.

Flags:

- `--featured` — also adds the album images to the `featured` collection (shown on the homepage)
- `--dry-run` — preview output without writing to the YAML

### Updating the gallery

Edit `src/gallery/gallery.yaml` directly to:

- Add/remove images from the `featured` collection (homepage)
- Edit titles and descriptions
- Add new albums to the `collections` list

### Adding photos to the featured section

`featured` is a built-in collection. Add it to any image's `collections` list:

```yaml
collections:
  - paris-2026
  - featured
```

### Committing and deploying

```bash
git add src/gallery/gallery.yaml
git commit -m "Add Paris 2026 album"
git push
```

GitHub Actions builds and deploys to Cloudflare Pages automatically.

## Local development

```bash
npm install
npm run dev
```

## Configuration

- `site.config.mts` — site title, owner name, profile image, social links
- `astro.config.mts` — site URL
- `src/content/about.md` — about page text
- `public/images/profile.jpg` — profile photo

## GitHub Actions

- **[Deploy to Cloudflare Pages](./.github/workflows/cloudflare-deploy.yml)** — builds and deploys on push to `main`
- **[Quality checks](./.github/workflows/quality.yml)** — runs pre-commit hooks (ESLint, Prettier, YAML validation)

## Based on

[astro-photography-portfolio](https://github.com/rockem/astro-photography-portfolio) by [@rockem](https://github.com/rockem), extended to support remote images served from Cloudflare R2.
