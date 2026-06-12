All traffic on this Hosting site is proxied to the `flipper-production`
Cloud Run service via the `**` rewrite in `firebase.json` — the Next.js app
serves every page and API route. This directory exists only because Firebase
Hosting requires a `public` directory; any file placed here would SHADOW the
Cloud Run rewrite for its path, so keep it empty.
