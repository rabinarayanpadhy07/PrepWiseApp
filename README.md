# PrepWise frontend

React + Vite single-page app. See the [root README](../README.md) for full setup.

```powershell
npm ci
copy .env.example .env.local
npm run dev        # http://localhost:5173
npm test
npm run lint
npm run build      # output in dist/
```

## Structure

```
src/
├── components/
│   ├── ui/          Radix-based primitives (button, input, select, dialog, sheet, dropdown, tabs, table, ...)
│   ├── feedback/    Loading, empty, and error states
│   ├── forms/       FormField (label + description + accessible error wiring)
│   ├── layout/      PageContainer, PageHeader, AppShell, AppSidebar, MobileNav, public header/footer
│   └── marketing/   Section helpers for public pages
├── content/         Product copy shared by public pages
├── features/auth/   Auth form schemas (Zod) and card layout
├── layouts/         Route layouts
├── lib/             API client (Axios), query client, formatting, cn()
├── pages/           Route components (lazy-loaded)
└── index.css        Design tokens (CSS variables mapped into Tailwind's theme)
```

## Design tokens

Colours are defined once, in `src/index.css`, and used through semantic Tailwind classes such as
`bg-primary`, `text-muted-foreground`, `border-border`, `bg-success-subtle` and `text-destructive-text`.
Don't use raw hex values in components.

The brand success green (#16A34A) is 3.3:1 against white, which is not enough for body text.
Use `text-success-text` (#15803D) for text, and keep `success` for icons and borders.

## shadcn/ui

`components.json` is configured for the shadcn CLI (`new-york` style, JavaScript, `@/` aliases).
Components in `src/components/ui` follow shadcn/ui's Radix patterns and are adapted to the PrepWise tokens.
If you add components with `npx shadcn@latest add <name>`, check the generated imports
(`cn` must come from `@/lib/utils`) and replace any colour classes the project doesn't define.
