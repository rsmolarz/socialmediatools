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
- **Website & App Evaluator**: AI-powered website/app analysis with 7 scoring categories: Copy (15 P's of Compelling Copy - Brand Builders Group framework), SEO (title, meta, headings, images, links, mobile, schema, keywords), Graphics/Design (visual hierarchy, color scheme, typography, imagery, whitespace, consistency, CTAs), Performance (load speed, CDN, caching, code optimization, bundle size), Security (HTTPS, auth patterns, headers, data protection, compliance), Mobile (responsive design, touch targets, viewport, PWA, mobile-first), Content (readability, structure, freshness, documentation quality, writing clarity). Features: action plan table (priority/category/action/impact/effort), executive summary with strengths/weaknesses/immediate actions/long-term strategy/next steps, animated progress indicator during analysis, PDF report download (jsPDF, client-side generation with styled headers, score bars, tables, and page numbers), markdown report download, review history with DB persistence (site_reviews table), shareable proof ID verification certificates. Routes: `/site-evaluator`, `/site-evaluator/proof/:proofId` (public). API: POST `/api/site-evaluator/evaluate`, GET `/api/site-evaluator/reviews`, GET `/api/site-evaluator/review/:id`, GET `/api/site-evaluator/proof/:proofId`, GET `/api/site-evaluator/review/:id/download`, POST `/api/site-evaluator/review/:id/email`.
- **YouTube Analytics (VidIQ Replacement)**: Full YouTube analytics dashboard at `/youtube-analytics` with 6 features: (1) Dashboard — channel overview with subscriber count, total views, video count, engagement rate, top videos by views and engagement; (2) Video Analytics — sortable table of all videos with views, likes, comments, engagement rate, duration, publish date; (3) SEO Scorer — AI-powered SEO scoring per video (title/description/tags scores, suggested improvements, tag recommendations); (4) Best Time to Post — AI analysis of publishing patterns to find optimal days/hours, weekly schedule suggestions; (5) Tag/Keyword Research — AI-powered keyword research with primary/long-tail keywords, suggested tags, hashtags, title suggestions, content angles; (6) Competitor Analysis — look up any public YouTube channel, head-to-head comparison (subscribers, views, engagement), view their recent videos with stats. Backend: `server/youtube.ts` (fetchVideoStatistics, fetchChannelStats, fetchCompetitorData), API routes: GET `/api/youtube/analytics`, GET `/api/youtube/channel`, GET `/api/youtube/seo-score/:videoId`, POST `/api/youtube/tag-research`, GET `/api/youtube/best-time`, GET `/api/youtube/competitor/:handle`. Includes 15-minute server-side caching and YouTube API quota protection with 30-minute cooldown.
- **Instagram Content Planner**: Full Instagram content toolkit at `/instagram-planner` with 4 tabs: (1) Hashtag Research — AI-powered hashtag research with high-volume, niche, low-competition, and branded hashtags plus ready-to-copy hashtag sets; (2) Caption Generator — generates 5 caption variations with different styles (story-driven, educational, controversial, inspirational, listicle), configurable tone and post type; (3) Best Time to Post — AI analysis of optimal posting times for feed, reels, and stories with full weekly schedule; (4) Content Calendar — generates multi-week content calendars with daily content plans, content type, pillars, and hashtags. API routes: POST `/api/instagram/hashtags`, `/api/instagram/caption`, `/api/instagram/best-time`, `/api/instagram/content-calendar`.
- **TikTok Content Optimizer**: TikTok content creation suite at `/tiktok-optimizer` with 5 tabs: (1) Hook Generator — viral hook generator with full scripts, visual cues, and hook formulas; (2) Trending Topics — trending topics, sounds, formats, and content ideas for any niche; (3) Caption Writer — optimized captions with CTAs and hashtags; (4) Script Writer — timestamped video scripts with dialogue, visual cues, and text overlays for 15s-3min durations; (5) Hashtag Strategy — viral, niche, trending, and FYP-boosting hashtag sets. API routes: POST `/api/tiktok/hooks`, `/api/tiktok/trending`, `/api/tiktok/caption`, `/api/tiktok/script`, `/api/tiktok/hashtags`.
- **LinkedIn Content Suite**: LinkedIn professional content toolkit at `/linkedin-suite` with 4 tabs: (1) Post Writer — generates 5 post variations (story, hot take, framework, listicle, personal reflection) with hooks, hashtags, best posting times; (2) Carousel Generator — slide-by-slide carousel content with cover/content/stat/quote/CTA slides plus companion caption; (3) Article Generator — full SEO-optimized articles with promotion post and keyword targeting; (4) Hashtag Research — LinkedIn-specific hashtag research with engagement tips and algorithm insights. API routes: POST `/api/linkedin/post`, `/api/linkedin/carousel`, `/api/linkedin/article`, `/api/linkedin/hashtags`.
- **Podcast Show Notes Generator**: Podcast content repurposing toolkit at `/podcast-tools` with shared transcript input and 4 tabs: (1) Show Notes — generates title, summary, description, timestamps, key takeaways, memorable quotes, resources, keywords; (2) Blog Post — converts podcast content into SEO-optimized blog posts with social promotion snippets for Twitter/LinkedIn/Instagram; (3) Social Clips — identifies clip-worthy moments with platform recommendations, captions, hooks, hashtags, and repurposing strategy; (4) Newsletter — generates email newsletters with subject lines, section breakdowns, CTAs, and send time suggestions. API routes: POST `/api/podcast/show-notes`, `/api/podcast/blog-post`, `/api/podcast/social-clips`, `/api/podcast/newsletter`.
- **Social Media Command Center**: Unified cross-platform content hub at `/social-command-center` with 2 tabs: (1) Cross-Platform Generator — enter one topic, select platforms (YouTube, Instagram, TikTok, LinkedIn, X/Twitter), get fully optimized content for each with platform-specific formatting, hashtags, and strategy, plus cross-platform posting order, timing recommendations, and adaptation notes; (2) Content Calendar — generates weekly cross-platform content calendars with daily posts across all platforms, content types, topics, hashtags, and timing. API routes: POST `/api/social/generate-all`, `/api/social/content-calendar`.
- **Feature Documentation System**: Self-contained, versioned knowledge base in the Admin section documenting every platform feature. Each feature entry includes summary, architecture, files, API routes, and dependencies. Supports version history, full-text search, Markdown export (individual or all), and sharing to other Replit apps or external teams via URL POST or clipboard copy. Component: `client/src/components/feature-docs.tsx`. Tab in Admin page (`/admin`).

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