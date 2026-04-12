@AGENTS.md
# Next.js Project Context
This is a sea-pos built with Next.js 15+, TypeScript, and Tailwind CSS.
It uses the App Router for routing and Server Actions for data mutations.

## Essential Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm run test`

## Code Style & Conventions
- Framework: Use App Router (`app/` directory).
- Components: Prefer React Server Components (RSC) by default. Use 'use client' only when necessary.
- Styling: Tailwind CSS with `shadcn/ui`. Use the `cn()` utility for class merging.
- State: Favor Server Actions over client-side fetch for data mutations.
- Naming: PascalCase for components (e.g., `UserCard.tsx`), camelCase for utilities.
- Imports: Use absolute paths with the `@/*` alias.

## Architecture
- `app/`: Routing and layouts.
- `components/ui/`: Shared shadcn components.
- `lib/`: Shared utility functions and database clients.
- `hooks/`: Custom React hooks.

## Testing & Quality
- Write Vitest unit tests for new business logic in `lib/`.
- Ensure all new components pass `npm run lint` and `npm run typecheck` before finishing.

## Spec Maintenance
- **Every time a feature is added or updated, you MUST update `spec.md`** at the project root.
- Keep `spec.md` as the living specification: add new features, update existing entries, and mark removed ones.
- Each entry should describe: feature name, purpose, key files/routes involved, and any notable constraints.
