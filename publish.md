# Publishing the game on GitHub Pages

These are the exact steps to deploy Tic-Tac-Toe and make it playable by anyone. The game is published as a static site, so there is no server to run or pay for. Live site: **https://shiloyuval.github.io/tic-tac-toe/**

## How it works

- Every push to `main` runs the workflow [.github/workflows/deploy.yml](./.github/workflows/deploy.yml).
- The workflow installs the dependencies (`npm ci`), runs `npm run typecheck` and `npm test`, builds the game (`npm run build:web`) and publishes the `dist/` folder to GitHub Pages.
- If the type check or a test fails, nothing is deployed.
- In the published game, scores and a paused game are stored in each visitor's own browser (`localStorage`). They are not shared between visitors or devices.

## Before you start

1. A GitHub account and this repository on GitHub (`shiloyuval/tic-tac-toe`).
2. **The repository must be public.** GitHub Pages on a free personal account only works for public repositories. If the repository is private, the **Pages** page does not appear in the repository settings.
   - Check or change it: repository **Settings → General → Danger Zone → Change repository visibility**. The button says **Change to private** when the repository is already public.
   - Making a repository public exposes all of its files and its whole history. Check that there are no secrets in them first.
3. Node.js 22.12 or newer (the workflow uses Node 24) and Git, to test locally before pushing.

## One-time setup

### 1. Check that the project builds locally

```
npm ci
npm run typecheck
npm test
npm run build:web
```

All four commands must pass. The build creates the `dist/` folder (it is gitignored; you do not commit it).

### 2. Make sure the workflow file is in the repository

`.github/workflows/deploy.yml` must be committed on the `main` branch. It needs these permissions and steps, which are already in the file:

- `permissions: contents: read, pages: write, id-token: write`
- a `build` job: checkout, setup-node (Node 24), `npm ci`, `npm run typecheck`, `npm test`, `npm run build:web`, `configure-pages`, `upload-pages-artifact` with `path: dist`
- a `deploy` job: `deploy-pages` with the `github-pages` environment

### 3. Turn on GitHub Pages

Do this before the first push, otherwise the first workflow run fails (see step 5).

1. Open the repository on GitHub: https://github.com/shiloyuval/tic-tac-toe
2. Click **Settings** (the tab on the right of the repository menu). You need admin rights on the repository.
3. In the left sidebar, under **Code and automation**, click **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.

There is no Save button for this setting, it applies immediately. Leave **Custom domain** empty, and keep **Enforce HTTPS** enabled (it is required for the default domain).

### 4. Push to GitHub

```
git push origin main
```

The push starts the workflow. Follow it in the **Actions** tab. Both jobs, `build` and `deploy`, must show a green check (about 30 seconds). The `deploy` job shows the site address: **https://shiloyuval.github.io/tic-tac-toe/**

### 5. If the first run failed because Pages was not enabled yet

If you pushed before step 3, the `configure-pages` step fails with this error. It is expected in that case:

```
HttpError: Not Found
Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions
```

Do step 3, then run the workflow again:

1. Open the **Actions** tab of the repository.
2. Open the failed run **Deploy to GitHub Pages**.
3. Click **Re-run jobs → Re-run all jobs → Re-run jobs**. (If the button is not visible, make the browser window wider.)
   - Alternatively, push any new commit to `main`.
4. Wait until both jobs show a green check.

### 6. Check the published game

Open https://shiloyuval.github.io/tic-tac-toe/ in a browser and check that:

- the board, the scores panel and the buttons appear;
- you can play a two-player game and the winner is shown with a highlighted line;
- the score is still there after reloading the page;
- **Pause**, then reloading the page, shows the game as paused and **Resume** continues it;
- a game against the computer works and is not added to the scores.

Then share the link with anyone. No sign-in is needed to play.

## Updating the published game

1. Change the code and run the local checks (`npm run typecheck`, `npm test`, `npm run build:web`).
2. Commit and push to `main`.
3. The workflow redeploys automatically. Follow it in the **Actions** tab. The new version is usually live within a minute (use a hard refresh, `Ctrl+F5`, if the browser shows the old one).

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| There is no **Pages** entry in the repository Settings | The repository is private (free accounts), or you are not an admin. Make it public (see "Before you start") or ask the owner. |
| `Get Pages site failed ... Not Found` in the `configure-pages` step | Pages is not enabled yet. Do step 3, then re-run the workflow (step 5). |
| `npm ci` fails with a lock file or platform error | `package.json` and `package-lock.json` are out of sync, or a platform-specific package (for example `lightningcss-win32-x64-msvc`) was added as a direct dependency. Remove it, run `npm install`, and commit the updated `package-lock.json`. |
| The `build` job fails in typecheck or tests | Fix the failure locally (`npm run typecheck`, `npm test`) and push again. The deployment is blocked on purpose. |
| The page loads but is blank or the CSS and JavaScript return 404 | Keep `base: "./"` in `vite.config.ts` so assets load from the `/tic-tac-toe/` sub-path. |
| Scores or Pause show as "unavailable" | The visitor's browser blocks `localStorage` (for example in some private modes). The game itself still works. |
| The site shows an old version | The deployment has not finished, or the browser cached the old files. Check the **Actions** tab and do a hard refresh. |

## Taking the game offline

- Repository **Settings → Pages**: unpublish the site, or
- make the repository private again (the site is removed on free accounts).

## Other free hosts

The same build works on other static hosts. For example, on Cloudflare Pages, Netlify or Vercel, connect the GitHub repository and use:

- **Build command:** `npm run build:web`
- **Output directory:** `dist`
- **Node version:** 22.12 or newer (24 recommended)

These hosts also deploy private repositories on their free plans. In that case the GitHub Actions workflow is not needed.

More detail: [tic-tac-toe-github.md](./tic-tac-toe-github.md) and the "Publish on GitHub Pages" section of [README.md](./README.md).

## Running the server-backed version locally (optional)

The published game keeps data in the browser. To share the scores and the paused game with the console game instead, use the server-backed mode on your own machine: `npm run start:web` (see [README.md](./README.md)). This mode is not part of the public deployment.
