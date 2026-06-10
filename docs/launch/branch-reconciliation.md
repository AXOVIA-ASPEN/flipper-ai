# Branch Reconciliation — main ↔ django-main

**Status:** Required pre-launch hygiene. Do this before any production deploy.

---

## The current state (as of 2026-05-06)

```
              merge-base 191ae1d ("wrapping up epic 1")
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
     main                   origin/django-main
   (11 commits ahead)        (89 commits ahead)
   - Stale since Feb 2026    - The active development trunk
   - Sprint stories 4.2,     - All 13 functional epics done
     4.5, 8.2, 8.4           - Epic 14 (UI design) ~60% done
   - API doc generation      - Multi-provider AI architecture
   - 5 BDD step defs         - Vercel → Firebase Hosting + Cloud Run migration
                             - NextAuth → Firebase Auth migration
                             - YAML-driven GCP Secret Manager
                             - Glassmorphism dark theme rebuild
                             - Major security hardening across all routes
                             - Versioning workflow + CHANGELOG discipline
```

## The 11 commits on `main` not in `django-main`

| Commit  | What it adds                                                 | django-main equivalent                                |
| ------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| b605779 | API documentation section to README                          | Already covered in django-main's docs/api/ tree       |
| c62148f | Generate comprehensive API documentation                     | django-main has more comprehensive docs               |
| 9d7700f | [8.4] Message Approval Workflow                              | Story 8.4 done on django-main (refactored)            |
| f128429 | Set up GitHub Actions CI/CD pipeline                         | django-main has more workflows (release.yml + others) |
| 299f707 | Refactor E-004 step definitions                              | django-main reorganized step defs entirely            |
| 8e89dcb | E-004 BDD step definitions for sellability                   | Same — superseded                                     |
| 58064b3 | [8.2] AI Negotiation Strategy                                | Story 8.2 done on django-main                         |
| 5824764 | Fix BDD test failures - offline server fallback              | Likely no longer relevant on django-main              |
| bbda617 | [4.5] BDD scenarios for LLM Sellability                      | Story 4.5 done on django-main                         |
| b731495 | [4.5] Configurable undervalue discount threshold             | Same                                                  |
| a3a4aeb | [4.2] Platform-specific fees & opportunity threshold         | Story 4.2 done on django-main                         |

**Conclusion:** Everything meaningful on `main` has already been redone (usually better) on `django-main`. There is no work on `main` that needs to be saved before reconciliation.

---

## Why this needs to happen before launch

1. **CI/CD ambiguity.** Tag-triggered releases (per `7ccb893 ci: add tag-triggered GitHub Release workflow` on django-main) need a single canonical trunk. If `main` is the protected branch but `django-main` has the actual code, deploys are confusing and dangerous.
2. **External integrations point to `main`.** The README badge URLs, the GitHub Actions on-push-to-main triggers, and the Vercel/Cloud Run main-branch deploy hooks all assume `main` is the truth. They aren't.
3. **Future BMAD sprint planning** writes to `_bmad-output/implementation-artifacts/sprint-status.yaml`. If two branches have divergent sprint state, every sprint planning session has to manually reconcile them.
4. **PR review confusion.** Anyone opening a PR has to know to target django-main, not main. New collaborators (or future-you) will get this wrong.

---

## Option A — Force-reset main to django-main (recommended)

**When to use:** Default. Use this unless you have collaborators who'd be confused by a force-push.

```bash
# 1. Backup main first (paranoia — recoverable for 90+ days from reflog anyway)
git push origin main:refs/heads/backup/main-2026-05-06

# 2. Reset main to django-main locally
git checkout main
git fetch origin
git reset --hard origin/django-main

# 3. Force-push main (with --force-with-lease for safety against concurrent updates)
git push origin main --force-with-lease

# 4. Optional but recommended: archive django-main and remove it
git push origin origin/django-main:refs/heads/legacy/django-main-pre-merge
git push origin --delete django-main

# 5. Locally:
git fetch --all --prune
git branch -D django-main 2>/dev/null  # in case of leftover local copy
```

**What this looks like to anyone watching:**

- `main` jumps forward by 89 commits in one push.
- The 11 main-only commits become orphaned (still recoverable from `backup/main-2026-05-06` and from git's reflog).
- All open PRs targeting `main` will need to be rebased.

**Pros:**

- Cleanest history. `main` becomes the single, unambiguous trunk.
- No merge commit clutter.
- Easiest mental model going forward.

**Cons:**

- Force-push, period. If you have automation watching `main` for new commits, expect a flurry of notifications.

---

## Option B — Merge django-main into main

**When to use:** If you have collaborators who'd be tripped up by a force-push, or if you want to preserve the 11 main-only commits in case anything was missed.

```bash
# 1. Backup main first
git push origin main:refs/heads/backup/main-2026-05-06

# 2. Merge django-main into main
git checkout main
git fetch origin
git merge --no-ff origin/django-main -m "merge: integrate django-main (Epic 1-13 complete, Epic 14 in progress)"

# 3. Resolve any conflicts (likely in: README, package.json, vercel.json removal, prisma schema, sprint-status.yaml)

# 4. Push the merge commit
git push origin main

# 5. Optionally archive django-main
git push origin origin/django-main:refs/heads/legacy/django-main-pre-merge
git push origin --delete django-main
```

**What this looks like:**

- One merge commit on `main`.
- All 89 django-main commits land on `main` with their original hashes preserved.
- The 11 main-only commits still exist on `main` (which is mostly redundant but harmless).

**Pros:**

- No force-push. Anyone watching `main` sees it grow normally.
- Preserves all history.

**Cons:**

- Conflicts during the merge. The most likely conflicts are:
    - `package.json` (version + dependency drift)
    - `prisma/schema.prisma` (model evolution)
    - `_bmad-output/implementation-artifacts/sprint-status.yaml` (django-main has all-done; main has older state)
    - `README.md` (badge versions, feature lists)
    - `vercel.json` (django-main deleted it; main may have changes to it)
    - `CLAUDE.md` (architecture descriptions — django-main is current)
- Resolution decisions: in nearly every case, **prefer the django-main version**. The main-side changes have already been superseded by better implementations on django-main.

---

## Option C — Treat django-main as new trunk; rename it to main

**When to use:** Cleanest semantically, but requires updating all integrations that hard-code `main`.

```bash
# 1. Make django-main the default branch on GitHub:
#    Settings → Branches → Default branch → switch to django-main → confirm

# 2. Archive the old main:
git push origin main:refs/heads/legacy/main-pre-2026-05-06

# 3. Rename django-main to main:
#    Settings → Branches → Rename "django-main" to "main" → confirm
#    (Or: delete main, then create main from django-main via the API)

# 4. Locally:
git remote set-head origin main
git fetch --all --prune
```

**What needs updating after:**

- GitHub Actions workflows that reference `branches: [main]` (already fine if branch is named `main` after rename).
- Cloud Run deploy hooks pointing to a specific branch.
- Firebase Hosting deploy targets.
- Any external services webhook'd against `main` (Sentry releases, etc.).
- README badge URLs (they should auto-update if they were pointing to `main`).

**Pros:**

- Cleanest. No force-push, no merge commit, no leftover main-only commits.
- The "django-main" name confusion goes away forever.

**Cons:**

- Most disruptive to anyone with the repo cloned. They'll need to do `git fetch && git remote set-head origin main` after the rename.
- A few minutes of "where did django-main go?" confusion.

---

## My recommendation

**Option A** (force-reset main to django-main) for these reasons:

1. The 11 main-only commits don't add anything not already on django-main, so preservation has zero value.
2. The branch `django-main` has a misleading name; getting rid of it removes future confusion.
3. Force-push is fine for solo founders or small teams; the safety net (`backup/main-2026-05-06`) is durable.
4. The merge in Option B will produce ~6 conflicts that all resolve to "take django-main's version", which is busywork.
5. The rename in Option C requires touching every external integration.

**Execute Option A in one focused 30-minute session:** push the backup, force-reset, delete django-main, fetch + prune locally, smoke-test, done.

---

## Post-reconciliation cleanup

After whichever option you pick:

- [ ] Verify `git log --oneline main -5` shows the django-main tip commit at HEAD.
- [ ] Verify all GitHub Actions workflows still pass on the next push.
- [ ] Verify CHANGELOG.md is current and the [Unreleased] section reflects what's actually unreleased.
- [ ] Cut a release tag (`git tag v1.1.0 && git push origin v1.1.0`) to lock in the reconciled state and trigger the GitHub Release workflow.
- [ ] Update this document or move it to `docs/archive/` since the situation it describes no longer exists.

---

## What about the `claude/create-release-roadmap-NCkB5` branch?

This branch (where you're reading this) was forked from the *old* `main`. It contains:

- `RELEASE_ROADMAP.md`
- `docs/launch/*` (this directory)

After main is reconciled, the cleanest path is:

1. Reset this branch onto the new main: `git checkout claude/create-release-roadmap-NCkB5 && git rebase main`
2. Open a PR from `claude/create-release-roadmap-NCkB5` → `main`
3. Merge with squash so the roadmap + launch assets land as a single commit on the trunk.

If there are conflicts during the rebase, prefer this branch's version of `RELEASE_ROADMAP.md` and `docs/launch/*` (those files don't exist on django-main and are unique to this work).
