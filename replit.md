# YouTube Thumbnail Generator

## Overview

This project is a web-based YouTube thumbnail generator designed to empower content creators with an intuitive tool for crafting, customizing, and saving high-quality thumbnail designs. It features a canvas-based editor, robust text overlay capabilities, and flexible background options. The application aims to streamline the thumbnail creation process, offering persistent storage for designs and advanced features to optimize content visibility and engagement on YouTube and other social media platforms. The long-term vision includes becoming a comprehensive content creation and optimization suite, integrating AI-powered tools for SEO, content generation, and performance analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React useState for local state
- **Styling**: Tailwind CSS with shadcn/ui (New York style)
- **Build Tool**: Vite
- **Architecture**: Component-based with dedicated directories for pages, UI components, feature components, and custom hooks. Includes theme support (light/dark mode).

### Backend
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Architecture**: Layered, separating Express app setup, route definitions, data access, and database connection.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` for shared access.
- **Migrations**: Managed via `drizzle-kit`.
- **Key Entities**: `thumbnails`, `users`, `templates`, `brandKits`, `scheduledContent`, `collections`, `collaborations`, `comments`, `keyboardShortcuts`, `analytics`, `site_reviews`, `speaker_kits`, `speaker_opportunities`, `viral_content`, `social_posts`, `social_thumbnails`, `viral_topics`, `thumbnail_analytics`, `analytics_events`.

### Build System
- **Development**: Vite dev server with HMR, proxied through Express.
- **Production**: Custom build script using esbuild for server and Vite for client, outputting to `dist/`.

### UI/UX
- **Canvas Editor**: Core interface for thumbnail design with layer management, undo/redo, and advanced export options.
- **Theming**: Light/dark mode support.
- **Component Library**: shadcn/ui for consistent UI elements.
- **Visual Calendars**: Content Scheduling Calendar.
- **Analytics Dashboards**: Performance metrics, charts, A/B test results.

### Technical Implementations
- **AI-Powered Tools**: Transcript Analyzer, AI SEO Optimizer, AI Website/App Evaluator, AI-powered YouTube/Instagram/TikTok/LinkedIn analytics, content generation, and optimization tools (e.g., Hook Generator, Script Writer, Thread Writer).
- **Image Editing**: Background Remover (remove, blur, replace), Stock Image Integration, Instagram-style Filters.
- **User Authentication**: Replit Auth integration with OIDC and session management.
- **Content Management**: Auto-Save, Search & Organization (full-text search, tag filtering, folder management), Content Repurposing Engine, Social Media Command Center.
- **Optimization & Testing**: A/B Testing for thumbnails and hooks, export optimization, keyboard shortcuts, undo/redo.
- **Feature Documentation**: Self-contained, versioned knowledge base for platform features, available in the Admin section.
- **Email Marketing**: Landing page, lead magnet, and email sequence builder at `/funnel-builder`.
- **Influencer Collaboration**: AI-powered partner discovery and outreach tools at `/collab-finder`.
- **Viral Content Analysis**: Tool to analyze and learn from viral content at `/viral-analyzer`.
- **X/Twitter Growth Suite**: Thread writer, viral tweet generator, growth strategy, trend hijacker at `/twitter-suite`.
- **Content Repurposing Engine**: Transform one piece of content into 20+ pieces across platforms at `/content-repurposer`.
- **AI A/B Tester**: Thumbnail/title/hook variation scoring and comparison at `/ab-tester`.
- **BBG Bot Hub**: 30+ AI chatbots across 5 categories (BrandDNA, Captivating Content, WCPC, Rev Engine, Other). Email-gated access, real-time AI chat with persistent chat history (DB-backed via `bot_chats` table), starter prompts per bot, chat export (download as .txt), and favorite bots (DB-backed via `bot_favorites` table with unique constraints). Route: `/bots`. API: POST `/api/bots/verify-email`, GET `/api/bots/list`, POST `/api/bots/chat`, GET `/api/bots/history`, GET/DELETE `/api/bots/history/:botId`, GET/POST `/api/bots/favorites`.

## External Dependencies

### Database
- PostgreSQL
- Drizzle ORM
- connect-pg-simple

### UI Framework
- shadcn/ui (built on Radix UI)
- Tailwind CSS
- Lucide React (icons)

### Frontend Libraries
- TanStack React Query
- react-hook-form
- wouter
- date-fns
- recharts

### Validation
- Zod
- drizzle-zod

### Development Tools
- TypeScript
- Vite plugins
- @imgly/background-removal (for background removal functionality)