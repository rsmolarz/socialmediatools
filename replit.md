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

## Recent Changes

### Latest Updates (January 31, 2026)
- **Social Media Suite**: New comprehensive social media dashboard (Social tab) with:
  - **Viral Topic Discovery**: AI-powered trending topic analysis for Medicine & Money niche
  - **Multi-Platform Content Generation**: Generate optimized content for YouTube, TikTok, and Instagram
  - **Content Queue Management**: Review, approve, reject, and delete generated content
  - **Virality Scoring**: AI-assessed viral potential scores for all content
  - **Photo Upload**: Upload custom photos for social post thumbnails via file input with base64 encoding, supports drag and drop, automatic background removal using @imgly/background-removal
  - **Background Layering**: Upload background images behind person cutouts with opacity control (10-100%)
  - **Post Preview Modal**: View platform-specific preview of posts with thumbnail, description, and hashtags
  - **Logo Overlay**: Toggle to add Medicine & Money Show logo to post thumbnails (showLogo field)
  - **Platform Switching**: Change post format between Facebook, Instagram, and LinkedIn with optimistic UI updates
  - **AI Hook Selection**: Auto-picks the best hook from generated options using GPT-4 (selectedHook field)
  - **Editable Call-to-Action**: Inline CTA input field with auto-save on blur (callToAction field, default: "Come join us at medmoneyincubator.com...")
  - Database tables: viral_content, social_posts, social_thumbnails, viral_topics
  - API endpoints: /api/viral/discover-topics, /api/viral/generate-content, /api/viral/posts (GET, POST, PATCH, DELETE) - PATCH supports platform, selectedHook, callToAction field updates
- **Three-Line Text Fix**: Viral title handlers now preserve all three text lines (only updates line 1)
- **Viral Title Helper**: AI-powered feature in Text tab to create short, punchy viral titles
- **Background Opacity Control**: Slider to adjust background image transparency (10-100%)

### Previous Updates (January 30, 2026)
- **Transcript Analyzer**: New AI-powered feature to analyze podcast transcripts and generate:
  - Key themes detection (3-5 topics extracted from content)
  - Auto-generated headlines for thumbnail text lines
  - AI background generation based on transcript themes
- **Updated Tab Layout**: Changed from (Text, BG, SEO, Saved) to (Text, Photos, BG, Saved)
- **Removed YouTube SEO Optimizer**: Replaced with Transcript Analyzer feature

### Previous Updates
- **Layout Options**: Updated from (centered, left-aligned, stacked) to (centered, twoFace, soloLeft, soloRight) with backward compatibility for legacy values
- **Quick Headlines**: Added 8 preset headline options for rapid content creation
- **AI Background Generator**: Enhanced with additional styles (Futuristic, Abstract, Cosmic, Cyberpunk, Medical, Financial) and moods (Luxurious, Tech-focused, Trustworthy, Urgent)
- **Element Opacity**: Added slider control to adjust highlight background transparency (0-100%)
- **Preset Backgrounds**: Added grid of 12 preset gradients and solid colors
- **Mobile Feed Preview**: Added component showing how thumbnail appears in mobile feeds
- **Export 1280×720**: Added dedicated export button for full-resolution PNG output
- **Reset to Default**: Added button to reset all settings to defaults

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