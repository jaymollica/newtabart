# Releasing

Releases are built and submitted to both stores by the GitHub Actions
workflow in `.github/workflows/release.yml`. Pushing a version tag does
everything except the store reviews themselves, which are still manual on
both sides.

## Cutting a release

1. Bump `version` in `manifest.json` (for example `2026.2`) and commit.
2. Tag and push:

   ```sh
   git tag v2026.2
   git push origin master v2026.2
   ```

   The tag must match the manifest version with a `v` prefix, or the
   workflow fails before building.

3. The workflow then:
   - builds `dist/new-tab-new-art-2026.2.zip` with `scripts/build.sh`
   - runs `web-ext lint` (errors fail the build, warnings do not)
   - creates a GitHub release for the tag with the zip attached
   - uploads the zip to the Chrome Web Store and submits it for review
   - submits the same files to Firefox Add-ons as a new listed version

4. Both stores email when review finishes. Chrome publishes automatically
   on approval. Firefox publishes automatically on approval too.

To build and lint without submitting, run the workflow by hand from the
Actions tab (workflow_dispatch) and leave "publish" unchecked. Locally,
`scripts/build.sh` produces the same zip in `dist/`.

## Adding shipped files

The build uses an explicit file list in `scripts/build.sh`. Add any new
HTML, JS, CSS, or image file there or it won't ship. The script checks that
every local `src` and `href` in the shipped HTML is on the list and fails
if one is missing.

## One-time setup: repository secrets

Add these under the repo's Settings → Secrets and variables → Actions.

| Secret | Where it comes from |
|---|---|
| `CHROME_EXTENSION_ID` | The 32-letter ID in the extension's Web Store URL |
| `CHROME_PUBLISHER_ID` | Developer Dashboard → Publisher → Settings → Publisher ID |
| `CHROME_CLIENT_ID` | Google Cloud OAuth client (steps below) |
| `CHROME_CLIENT_SECRET` | Same OAuth client |
| `CHROME_REFRESH_TOKEN` | Generated with `npx chrome-webstore-upload-keys` |
| `AMO_JWT_ISSUER` | https://addons.mozilla.org/developers/addon/api/key/ |
| `AMO_JWT_SECRET` | Same page |

### Chrome Web Store credentials

Follow https://github.com/fregante/chrome-webstore-upload-keys. In short:

1. In the Google Cloud console, create a project and enable the
   **Chrome Web Store API**.
2. Under Google Auth Platform, configure the consent screen. Pick
   **Internal** audience if your account is in a Google Workspace org.
   With a personal account you must pick **External**; in that case set
   the app's publishing status to **In production**, because refresh
   tokens issued while it is in **Testing** expire after seven days.
3. Create an OAuth client of type **Desktop app**. Save the client ID and
   secret.
4. Run `npx chrome-webstore-upload-keys`, paste the client ID and secret,
   and approve the login in the browser it opens. It prints the refresh
   token.
5. The Google account used must be the one that owns the Web Store item.

### Firefox Add-ons credentials

1. Open https://addons.mozilla.org/developers/addon/api/key/ while signed
   in to the account that owns the listing.
2. Generate new credentials. The JWT issuer is the key, the JWT secret is
   the secret.

The listing already exists on AMO, so no metadata file is needed. Because
the shipped jQuery is unminified, no separate source-code upload is
required for AMO review.

## If a submission fails

- The build artifact (zip and unpacked folder) is attached to the workflow
  run, so a failed store step can be retried by re-running just that job
  or uploading the zip by hand.
- A Chrome upload fails if the version is not higher than the version
  currently in the store. Bump the manifest and re-tag.
- An AMO submission fails for the same reason, and also if lint reports
  errors (warnings are fine).
