# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
```

## Architecture Overview

This is a Vue 3 e-commerce frontend for "ShakiShaki Archive" (clothing store), built with TypeScript, Tailwind CSS, and Shadcn/Vue components.

### Tech Stack
- **Vue 3** with Composition API (`<script setup>`)
- **Pinia** for state management
- **Vue Router** with auth guards
- **Shadcn/Vue** (radix-vue based) UI components
- **Tailwind CSS** with CSS variables for theming
- **Vite** bundler
- **Zod + vee-validate** for form validation

### Project Structure

```
src/
├── components/        # Shared components (Navbar, Footer, Hero, etc.)
│   └── ui/           # Shadcn/Vue primitives (button, card, input, etc.)
├── pages/            # Route-level page components
├── stores/           # Pinia stores (auth.ts)
├── lib/              # API client and utilities
│   ├── api.ts        # All REST API functions
│   └── utils.ts      # Tailwind class merge utilities
├── types/            # TypeScript interfaces (api.ts)
└── router/           # Vue Router config with guards
```

### API Layer

All backend communication goes through `src/lib/api.ts` using fetch with credentials. The backend runs at `http://localhost:5000` by default (configurable via `VITE_API_URL`).

Key API domains:
- `/api/auth/*` - Authentication (login, signup, logout, user info)
- `/api/products/*` - Product catalog
- `/api/cart/*` - Shopping cart
- `/api/orders/*` - Order management
- `/api/admin/*` - Admin operations (products, categories, orders)
- `/api/user/addresses` - Delivery addresses

### Authentication & Authorization

- Session-based auth with cookies (`credentials: 'include'`)
- Auth state managed in `src/stores/auth.ts`
- Route guards check `requiresAuth` and `requiresAdmin` meta fields
- Admin routes: `/admin/products`, `/admin/categories`, `/admin/orders`

### Styling

Uses Tailwind CSS with Shadcn/Vue theming system:
- CSS variables defined in `src/assets/index.css`
- Dark mode via `class` strategy
- Use `cn()` utility from `@/lib/utils` for conditional classes

### Path Aliases

`@/*` maps to `./src/*` (configured in vite.config.ts and tsconfig.json)

## 🇰🇷 Communication Rules
- **Language:** Always respond in **Korean (한국어)**.
- **Thinking Process:** You can think in English, but the final output must be in Korean.