# Abby & Richard — Wedding Website

Wedding website for Abby & Richard, June 2028, at The CAPE (347 Picton Main Street, Picton, ON).

The site is password-protected. `index.html` holds only an encrypted copy of the site
(AES-256-GCM, key derived from the password with PBKDF2-SHA256), so its content can't be
read from this repo without the password. Guests enter the password from their invitation.

## Files
- `index.html`: the locked site that GitHub Pages serves.
- `tools/lock.mjs`: locks and unlocks the site (Node 18+).
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
- The RSVP form does not send replies anywhere yet. Connect it to a form service first.

## Publish with GitHub Pages
Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
