# Rollo - Inventory Management System

## Overview

Rollo is a full-stack inventory management system designed for restaurants, stores, and warehouses. It allows users to track stock levels, manage products with categories and suppliers, monitor inventory movements (entries, exits, adjustments), and view dashboard summaries of inventory health including low stock alerts and expiring items.

The application follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Directory Structure
- `client/` — React frontend (SPA)
- `server/` — Express backend (API server)
- `shared/` — Shared code between frontend and backend (database schema, types)
- `migrations/` — Drizzle database migrations
- `attached_assets/` — Reference files from a previous version of the project (not actively used in the current codebase)
- `script/` — Build scripts

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management / Data Fetching**: TanStack React Query for server state
- **UI Components**: Shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite
- **Pages**: Dashboard, Inventory, Movements, Products, Categories, Suppliers, Warehouses
- **API Communication**: Custom `apiRequest` helper using fetch with JSON, queries use React Query's `queryFn` pattern with URL-based query keys (e.g., `["/api/stores"]`)

### Backend Architecture
- **Framework**: Express 5 (TypeScript, running via tsx in dev)
- **API Pattern**: RESTful JSON API under `/api/*` prefix
- **Storage Layer**: `IStorage` interface implemented by `DatabaseStorage` class in `server/storage.ts` — all database operations go through this abstraction
- **Database Initialization**: `server/db-init.ts` creates tables via raw SQL if they don't exist, then calls seed function
- **Seeding**: `server/seed.ts` populates demo data (stores, warehouses, categories, suppliers, products, inventory, movements) if the database is empty
- **Dev Server**: Vite dev server is integrated as middleware for HMR during development
- **Production**: Client is built to `dist/public`, server is bundled with esbuild to `dist/index.cjs`

### Database
- **Database**: PostgreSQL (required, connected via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema Location**: `shared/schema.ts` — defines all tables and insert schemas
- **Key Tables**:
  - `stores` — Physical store locations
  - `warehouses` — Storage areas within stores
  - `product_categories` — Product categorization with color/icon
  - `suppliers` — Vendor/supplier information
  - `products` — Product catalog with min stock, cost price, shelf life, category/supplier references
  - `inventory` — Current stock levels per warehouse/product with expiry dates, batch numbers, unit costs
  - `inventory_movements` — Audit trail of all stock changes (entrada/salida/ajuste)
- **Schema Push**: Use `npm run db:push` (drizzle-kit push) to sync schema to database

### API Endpoints
- `GET/POST /api/stores` — Store CRUD
- `GET/POST /api/warehouses` — Warehouse CRUD
- `GET/POST /api/categories` — Product category CRUD
- `GET/POST /api/suppliers` — Supplier CRUD
- `GET/POST /api/products` — Product CRUD
- `GET/POST /api/inventory` — Inventory listing and creation
- `GET /api/inventory/summary` — Dashboard stock summary stats
- `PATCH /api/inventory/:id` — Adjust inventory quantity
- `GET /api/inventory/movements` — Movement history
- `POST /api/inventory/movements` — Record a new movement

### Key Design Decisions

1. **Shared schema between frontend and backend**: The `shared/` directory contains Drizzle table definitions and Zod validation schemas used by both the API (for request validation) and the frontend (for TypeScript types). This ensures type safety across the stack.

2. **Storage interface pattern**: The `IStorage` interface decouples business logic from database implementation, making it possible to swap storage backends if needed.

3. **Dual table creation strategy**: Tables are created both via Drizzle schema (for `db:push`) and via raw SQL in `db-init.ts` (for runtime initialization). The `db-init.ts` approach ensures the app can self-initialize on first run.

4. **CSS variables for theming**: All colors are defined as HSL CSS variables, enabling light/dark mode switching without changing component code.

5. **Sidebar navigation**: The app uses a collapsible sidebar with two navigation groups — main views (Dashboard, Inventory, Movements) and management views (Products, Categories, Suppliers, Warehouses).

## External Dependencies

### Required Services
- **PostgreSQL Database**: Connected via `DATABASE_URL` environment variable. Required for all data storage. Uses `pg` (node-postgres) driver with Drizzle ORM.

### Key NPM Packages
- **Backend**: Express 5, Drizzle ORM, pg, drizzle-zod, zod, connect-pg-simple, express-session
- **Frontend**: React 18, Wouter, TanStack React Query, Shadcn/ui (Radix UI), Tailwind CSS, Recharts, Lucide React icons, date-fns
- **Build**: Vite, esbuild, tsx (TypeScript execution)
- **Replit-specific**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`

### Development Commands
- `npm run dev` — Start development server with hot reload
- `npm run build` — Build client (Vite) and server (esbuild) for production
- `npm run start` — Run production build
- `npm run db:push` — Push Drizzle schema changes to PostgreSQL
- `npm run check` — TypeScript type checking