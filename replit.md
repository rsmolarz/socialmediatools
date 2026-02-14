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

### Latest Updates (February 14, 2026)
- **Auto-Save System**: Thumbnails now auto-save 3 seconds after any change with visual status indicator (Saved/Unsaved/Saving)
- **YouTube Metadata Persistence**: Added youtubeTitle, youtubeDescription, and tags fields to thumbnailConfigSchema - these persist with the thumbnail and survive tab switches
- **MetadataEditor Component**: New editable YouTube Metadata section in BG tab with title input, description textarea, tag management (add/remove), and copy-to-clipboard buttons
- **TranscriptAnalyzer Integration**: Analysis results now automatically populate the MetadataEditor fields and persist in the thumbnail config
- **Save Status Indicator**: Header shows real-time save status with green "Saved", amber "Unsaved", or blue spinning "Saving..." indicator
- **Incremental Saving**: Changes are saved incrementally - each change triggers a debounced auto-save that creates or updates the current thumbnail

### Previous Updates (January 31, 2026)
- **YouTube Video Upgrade**: New tab in Tools page for managing YouTube channel videos:
  - **Video Library**: View all videos from connected YouTube channel
  - **AI SEO Optimizer**: AI-powered optimization for video descriptions and tags
  - **Direct YouTube Updates**: Push optimized metadata directly to YouTube
  - **Tag Management**: Add, remove, and edit video tags
  - API endpoints: /api/youtube/status, /api/youtube/videos, /api/youtube/optimize-seo, /api/youtube/videos/:videoId (PATCH)
  - Uses Replit's YouTube integration for OAuth authentication
- **Tools Page (Tier 1 Features)**: New dedicated tools page accessible via header button with 7 feature tabs:
  - **Template Library**: Browse and apply pre-made thumbnail templates with categories (Health, Finance, Tech, Gaming, Lifestyle, Business), search functionality, and 6 default templates
  - **Batch Export**: Export multiple thumbnails at once in PNG/JPG/WebP formats with quality control (10-100%) and ZIP download, includes configuration file export option
  - **Content Scheduling Calendar**: Visual calendar interface for scheduling content across platforms (YouTube, TikTok, Instagram, Twitter), date navigation, and scheduled item management
  - **Font Management**: Comprehensive typography controls with 13+ fonts across categories (Modern, Classic, Creative), font size/weight controls, letter spacing, line height, text alignment, color presets, and text shadow effects
  - **Collaboration Panel**: Share thumbnails with team members via email with permission levels (view, edit, comment), share link generation, and comments system with resolve/delete functionality
  - **Collections Panel**: Color-coded folder organization for thumbnails with 8 colors, 6 icons, privacy settings, and full CRUD operations
  - Database tables: templates, brandKits, scheduledContent, collections, collaborations, comments, keyboardShortcuts, analytics
  - Navigation: Tools button in home header, back button in tools header, ThemeToggle on both pages
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
- **Tier 3 Features Complete**:
  - **Background Remover (Feature 11)**: New component with 3 modes (remove, blur, replace), blur presets (slight/moderate/heavy), 8 background colors, transparent background support, accessible via BG Remover tab in Tools page
  - **Stock Image Integration (Feature 12)**: Curated stock photo library with 4 categories (Medical, Finance, Podcast, Abstract), search functionality, grid/list view toggle, favorites system, one-click background application
  - **User Authentication (Feature 13)**: Replit Auth integration with OIDC, session management via PostgreSQL, users/sessions tables, /api/login, /api/logout, /api/auth/user endpoints, useAuth hook for React
  - **Export Optimization (Feature 14)**: Advanced export controls with 4 formats (PNG, JPG, WebP, AVIF), quality slider (10-100%), platform presets (YouTube, Instagram, Twitter, LinkedIn, Custom), transparency preservation, web optimization, metadata stripping, estimated file size preview
  - **Keyboard Shortcuts (Feature 15)**: Global shortcuts with useKeyboardShortcuts hook - Ctrl+S (save), Ctrl+E (export), Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo), Ctrl+N (new), Ctrl+R (reset), Ctrl+T (toggle theme), Shift+? (show help), plus keyboard shortcuts help modal
  - **Undo/Redo System (Feature 16)**: Full history stack with useHistory hook, 50-step history limit, undo/redo buttons in header with visual disabled states, integrated with keyboard shortcuts
- **Tier 4 Features Complete**:
  - **Drag & Drop Layers (Feature 17)**: LayerPanel component with drag-and-drop reordering, visual layer list showing all elements (background, highlight, text lines, person image), layer visibility toggle, move up/down buttons, delete layer functionality, layer selection with visual highlighting
  - **A/B Testing (Feature 18)**: ABTestingPanel for creating thumbnail variants, tracking test status (draft/active/completed), selecting winners, with validated PATCH endpoints
  - **Instagram-style Filters (Feature 19)**: ImageFiltersPanel with 12 preset filters (Vintage, Warm, Cool, Dramatic, Muted, B&W, Noir, Fade, Punch, Glow, Cinematic, Classic) plus manual sliders for brightness, contrast, saturation, hue, sepia, grayscale, blur
  - **Search & Organization (Feature 20)**: SearchOrganization component with full-text search, tag-based filtering, folder management, sort options (date, title, engagement), and grid/list view toggle
- **Analytics Dashboard**: New comprehensive analytics system for tracking thumbnail performance:
  - **Performance Metrics**: Track total impressions, clicks, and engagement rates
  - **Per-Thumbnail Stats**: View performance for individual thumbnails with CTR calculations
  - **Daily Statistics**: Historical data with 30-day views for trend analysis
  - **Manual Data Entry**: Add analytics data via dialog with thumbnail selector, impressions, clicks, platform, and date fields
  - **Event Recording**: API endpoints for recording individual impression/click events
  - **Performance Charts**: Line graphs for views over time, bar charts for thumbnail comparison using recharts library
  - **Engagement Visualization**: Pie chart showing impressions vs clicks breakdown, CTR leaderboard ranking top performers
  - **A/B Test Results**: Compare thumbnail variants side-by-side with winner highlighting
  - **Export Reports**: Export analytics as CSV spreadsheet or PDF report with summary and per-thumbnail data
  - Database tables: thumbnail_analytics, analytics_events
  - API endpoints: /api/analytics/summary, /api/analytics/thumbnail/:id, /api/analytics/event, /api/analytics/bulk, /api/analytics/events/:id

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