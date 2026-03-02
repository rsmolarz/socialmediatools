# YouTube Thumbnail Generator

## Overview

This project is a web-based YouTube thumbnail generator designed to empower content creators with an intuitive tool for crafting, customizing, and saving high-quality thumbnail designs. It features a canvas-based editor, robust text overlay capabilities, and flexible background options including solid colors, gradients, and images. The application aims to streamline the thumbnail creation process, offering persistent storage for designs and advanced features to optimize content visibility and engagement on YouTube and other social media platforms. The long-term vision includes becoming a comprehensive content creation and optimization suite, integrating AI-powered tools for SEO, content generation, and performance analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React useState for local state
- **Styling**: Tailwind CSS with shadcn/ui (New York style)
- **Build Tool**: Vite
- **Architecture**: Component-based with dedicated directories for pages, UI components, feature components, and custom hooks. Includes theme support (light/dark mode).

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Architecture**: Layered, separating Express app setup, route definitions, data access, and database connection.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` for shared access.
- **Migrations**: Managed via `drizzle-kit`.
- **Key Entities**: `thumbnails` (JSONB for configurations), `users` (for authentication), `speaker_kits`, `speaker_opportunities`, `viral_content`, `social_posts`, `social_thumbnails`, `viral_topics`, `thumbnail_analytics`, `analytics_events`, `templates`, `brandKits`, `scheduledContent`, `collections`, `collaborations`, `comments`, `keyboardShortcuts`, `analytics`.

### Build System
- **Development**: Vite dev server with HMR, proxied through Express.
- **Production**: Custom build script using esbuild for server and Vite for client, outputting to `dist/`.

### UI/UX Decisions
- **Canvas Editor**: Core interface for thumbnail design.
- **Theming**: Light/dark mode support.
- **Component Library**: shadcn/ui for consistent UI elements.
- **Content Scheduling Calendar**: Visual interface for managing content.
- **Layer Panel**: Drag-and-drop reordering, visibility toggles.
- **Analytics Dashboard**: Performance metrics, charts (recharts), A/B test results.
- **Export Options**: Advanced controls for format, quality, platform presets.
- **Keyboard Shortcuts**: Global shortcuts for common actions.
- **Undo/Redo System**: History stack for design changes.

### Technical Implementations
- **Auto-Save System**: Debounced saving of thumbnail configurations.
- **Transcript Analyzer**: AI-powered analysis of podcast transcripts for themes, headlines, and background generation.
- **AI SEO Optimizer**: AI-driven optimization for video descriptions and tags.
- **Background Remover**: Three modes (remove, blur, replace) with presets and color options.
- **Stock Image Integration**: Curated library with search and categorization.
- **User Authentication**: Replit Auth integration with OIDC and session management.
- **Social Media Suite**: AI-powered viral topic discovery, multi-platform content generation, content queue management, virality scoring, photo upload with background removal, post previews, and logo overlays.
- **A/B Testing**: Variant creation and tracking.
- **Instagram-style Filters**: Preset filters and manual adjustment sliders.
- **Search & Organization**: Full-text search, tag filtering, folder management, sorting.
- **Analytics Event Tracking**: Recording impressions and clicks.

### Feature Specifications
- **Thumbnail Editor**: Text overlay, customizable backgrounds (solid, gradient, image), image uploads, layer management, undo/redo.
- **Speaker Kit Builder**: Comprehensive profile creation for speakers including bio, programs, topics, testimonials, and brand colors. Features brand kit integration (import colors from saved brand kits) and AI-powered document upload (PDF/DOCX/TXT) to auto-populate all form fields.
- **Speaker Opportunity Finder**: AI-powered search for speaking engagements with opportunity tracking and AI auto-fill for applications.
- **YouTube Video Management**: View channel videos, AI SEO optimization, direct YouTube metadata updates.
- **Tools Page**: Template library, batch export, content scheduling, font management, collaboration panel, collections panel.
- **Social Media Tools**: Content generation, queue management, virality scoring, custom photo uploads with background removal, post previews, editable CTAs.
- **Advanced Image Editing**: Background remover, stock image integration, Instagram-style filters.
- **User Management**: Authentication, session handling.
- **Optimization & Workflow**: Export optimization, keyboard shortcuts, undo/redo, search and organization.
- **Analytics**: Performance tracking (impressions, clicks, CTR), per-thumbnail stats, historical data, chart visualizations, A/B test result comparison, exportable reports.
- **Website Evaluator**: AI-powered website analysis evaluating copy against the 15 P's of Compelling Copy (Brand Builders Group framework), SEO audit (title, meta, headings, images, links, mobile, schema, keywords), and graphics/design quality (visual hierarchy, color scheme, typography, imagery, whitespace, consistency, CTAs). Supports URL input or pasted content. Route: `/site-evaluator`.

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
- react-hook-form (with Zod resolvers)
- wouter
- date-fns
- recharts (for analytics charts)

### Validation
- Zod
- drizzle-zod

### Development Tools
- TypeScript
- Vite plugins (for Replit integration)
- @imgly/background-removal (for background removal functionality)