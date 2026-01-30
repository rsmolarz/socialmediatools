# YouTube Thumbnail Generator

## Overview

A web-based YouTube thumbnail generator that allows users to create, customize, and save thumbnail designs. The application features a canvas-based editor with text overlay support, customizable backgrounds (solid colors, gradients, or images), and persistent storage for saving thumbnail configurations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React useState for local state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom path aliases (@/, @shared/, @assets/)

The frontend follows a component-based architecture with:
- Page components in `client/src/pages/`
- Reusable UI components from shadcn/ui in `client/src/components/ui/`
- Feature components in `client/src/components/`
- Custom hooks in `client/src/hooks/`
- Theme support (light/dark mode) via ThemeProvider

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

The server uses a layered architecture:
- `server/index.ts`: Express app setup, middleware configuration
- `server/routes.ts`: API route definitions
- `server/storage.ts`: Data access layer with IStorage interface
- `server/db.ts`: Database connection pool

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Generated in `./migrations` directory via `drizzle-kit push`

Key entities:
- `thumbnails`: Stores thumbnail configurations with JSONB for flexible config storage
- `users`: Basic user table for future authentication support

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Custom build script (`script/build.ts`) using esbuild for server and Vite for client
- **Output**: Combined into `dist/` directory with server bundle and static client files

## External Dependencies

### Database
- PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations
- connect-pg-simple for session storage support

### UI Framework
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with CSS variables for theming
- Lucide React for icons

### Frontend Libraries
- TanStack React Query for data fetching and caching
- react-hook-form with zod resolvers for form validation
- wouter for client-side routing
- date-fns for date formatting

### Validation
- Zod for runtime type validation
- drizzle-zod for generating Zod schemas from database tables

### Development Tools
- TypeScript for type safety across the stack
- Vite plugins for Replit integration (error overlay, cartographer, dev banner)