# Abby & Richard — Wedding Website

Wedding website for Abby & Richard, June 2028, at The CAPE (347 Picton Main Street, Picton, ON).

The site is password-protected. `index.html` holds only an encrypted copy of the site
(AES-256-GCM, key derived from the password with PBKDF2-SHA256), so its content can't be
read from this repo without the password. Guests enter the password from their invitation.

## Files
- `index.html`: the locked site that GitHub Pages serves.
- `tools/lock.mjs`: locks and unlocks the site (Node 18+).
- `tools/rsvp-apps-script.gs`: receives RSVPs into the Google Sheet.
- `site.html`: the readable source. **Git-ignored: never commit it.**

## Editing the site
```sh
node tools/lock.mjs unlock <password>   # index.html -> site.html
# edit site.html
node tools/lock.mjs lock <password>     # site.html -> index.html
git add index.html && git commit -m "Update site" && git push
```

## Before sharing
- Replace every `[bracketed placeholder]` (date, times, hotel blocks, RSVP deadline, story, photos, email).

## RSVPs
Replies are saved to the "Wedding RSVPs" Google Sheet (Drive › 01 Master Docs) by a small
Google Apps Script web app: `tools/rsvp-apps-script.gs`. Its `/exec` URL is set as
`RSVP_ENDPOINT` inside the locked site, so it is only visible to guests with the password.
Until it is set, the form tells guests that RSVPs aren't open yet.

## Publish with GitHub Pages
Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
