# Licenses & third-party material

## This game (Iron Meridian)

- **Code:** original, written for this project. MIT License (see `LICENSE`).
- **Game content** (setting, factions, names, maps, scenario texts, balance):
  original, created for this project.
- **Artwork** (`public/assets/img/*`): AI-generated originals created for this
  project from original prompts; no third-party game art or screenshots were
  used as references. See `public/assets/img/ASSETS.md` for the manifest.
- **Sound:** original, synthesized at runtime with the Web Audio API (no
  samples, no files).
- **Fonts:** Geist via `next/font/google` (SIL Open Font License 1.1).

## Relationship to LGeneral / Panzer General

Iron Meridian is a clean-room implementation inspired only by the *broad
gameplay ideas* of classic turn-based wargames (move/attack activations,
terrain costs and defense, objective capture, a persistent core force).
**No LGeneral source code (GPL-2.0), no Panzer General game data, maps,
artwork, dialogue or branding is included, derived from, or used as an
artistic reference.** No GPL obligations therefore apply to this codebase.

## Third-party libraries (via package.json, each under its own MIT/ISC-style license)

Next.js, React, ReactDOM, Tailwind CSS 4, tailwindcss-animate, tw-animate-css,
shadcn/ui component set (MIT), Radix UI primitives (MIT), Zustand (MIT),
Zod (MIT), Vitest (MIT), Testing Library (MIT), sharp (Apache-2.0),
class-variance-authority, clsx, tailwind-merge, Lucide (ISC),
date-fns (MIT), next-themes (MIT). The full dependency list with versions is
in `package.json` / `bun.lock`.

Some scaffold dependencies that this game does not use (e.g. Prisma, NextAuth,
recharts, socket.io examples) remain installed from the base template; they
are not part of the game and can be removed without effect.

## Monetization note

The prototype contains no payments, ads, stores or gameplay boosts. The
intended future model (free demo + one-time purchase) keeps all tactical
advantages earnable in play.

## Unresolved rights questions

None known. If any asset is ever found to resemble protected material, it
will be regenerated as an original replacement.
