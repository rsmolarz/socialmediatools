# Feature Documentation System (v1.0 — Jan 20, 2026 at 2:15 PM)

**Brand:** HPG (Harbor Platform Group)

**Published:** Jan 20, 2026 at 2:15 PM | **Updated:** Feb 9, 2026 at 4:20 PM

**Status:** complete | **Maturity:** Verified | **Exposure:** exportable

## Summary
A self-contained, versioned knowledge base built into the HPG portal that documents every feature, its architecture, files, API routes, and dependencies — with export, search, and version history capabilities.

## What It Is
The Feature Documentation System is a built-in knowledge base inside the HPG admin portal. Every major feature of the platform has its own entry here, documenting:

- What the feature does (summary)
- How it was built (architecture, data flow, design decisions)
- Which files are involved (with purpose descriptions)
- Which API routes it uses
- What external dependencies it relies on
- Version history showing how the feature evolved over time

This is NOT external documentation like a README or wiki. It lives inside the app itself, so it's always accessible to admins and staff, always up to date, and always in sync with the codebase.

Think of it as the platform's institutional memory — if a new developer or AI agent needs to understand how something works, they look here first.

## How It Was Built
The entire system is a single React component (feature-docs.tsx) with no backend — all content is stored as a typed TypeScript array in the source code.

Architecture decisions:
1. NO database storage — Feature docs are code, not user data. They change when the codebase changes, so they belong in source control, not the database.
2. NO CMS or external editor — Content is written directly in the code by developers/agents. This ensures accuracy and prevents drift between docs and implementation.
3. Versioned — Each feature can have multiple versions (e.g., v1.0, v2.0). The UI shows the latest by default with a dropdown to view older versions.
4. Exportable — Every doc can be copied as Markdown or downloaded as a .md file. There's also an "Export All" button that generates a single document with every feature.
5. Searchable — A search bar filters features by name, making it easy to find what you need.
6. Collapsible sections — Each feature's sections are collapsible to keep the page manageable when there are many features.

The component uses shadcn/ui primitives (Card, Badge, Button, Select) and Lucide icons for a consistent look with the rest of the portal.

## Data Structure
Each feature document follows this TypeScript interface:

FeatureDoc:
- id: string — unique slug (e.g., "authentication-mfa")
- name: string — display name (e.g., "Authentication & MFA")
- icon: LucideIcon — visual icon from lucide-react
- versions: FeatureVersion[] — array of version entries
- exportMarkdown: string — (auto-generated, not manually set)

FeatureVersion:
- version: string — version number (e.g., "1.0", "2.0")
- date: string — when this version was documented
- summary: string — one-paragraph description
- status: "complete" | "partial" | "planned" — current state
- sections: FeatureSection[] — the actual content
- files: { path, purpose }[] — which source files are involved
- apiRoutes: { method, path, description }[] — API endpoints
- dependencies: string[] — external libraries or services

FeatureSection:
- title: string — section heading
- content: string — the content (supports template literals for multi-line)

This structure ensures every feature is documented consistently.

## How to Add a New Feature Document
When you build a new feature, add its documentation by following these steps:

1. Open client/src/pages/portal/feature-docs.tsx
2. Find the featureDocs array
3. Add a new object to the array with:
   - A unique id (lowercase, hyphenated)
   - A descriptive name
   - An icon from lucide-react (import it at the top)
   - At least one version entry with sections, files, apiRoutes, and dependencies
4. Set exportMarkdown to "" (it's auto-generated)

Rules for writing good feature docs:
- Write for someone who has NEVER seen the codebase
- Explain WHY decisions were made, not just WHAT was built
- List EVERY file involved, even if it seems obvious
- Include the full API route with method, path, and description
- Use template literals (backticks) for multi-line content
- Keep sections focused — one topic per section
- Add a new version (don't overwrite) when the feature changes significantly

## Export & Sharing
Three export options are available:

1. Copy Markdown — Copies a single feature's documentation as Markdown to the clipboard. Uses the modern Clipboard API with a textarea fallback for environments where the Clipboard API is unavailable (like embedded iframes or non-HTTPS contexts).

2. Download .md — Downloads a single feature's documentation as a Markdown file. Creates a Blob, generates a temporary URL, and triggers a download.

3. Export All — Generates a single Markdown document containing EVERY feature's documentation, with a table of contents and generation date. Useful for sharing the full knowledge base with external teams or AI agents.

All exports use the generateExportMarkdown() function which formats the content consistently with proper headings, file lists, API route tables, and dependency lists.

## Version Switching
When a feature has multiple versions, a dropdown appears in the UI allowing users to switch between them.

How it works:
- The selectedVersions state (Record<string, string>) tracks which version is selected for each feature
- getSelectedVersion() returns the selected version or defaults to the latest (last in array)
- When switching versions, the entire content area updates to show that version's sections, files, routes, and dependencies
- The version badge shows the status (complete/partial/planned) for the selected version

Best practice: Always add new versions to the END of the versions array. The system treats the last entry as "latest."

Example: The Publishing & Deployment Guide has v1.0 (original checklist from Feb 7) and v2.0 (major update with root cause analysis, health endpoints, and reusable rules from Feb 9). Users can switch between them to see how the guide evolved.

## Current Feature Coverage
As of February 2026, the following features are documented:

Core Platform:
- Feature Documentation System (this document)
- Authentication & MFA
- Role-Based Access Control
- Domain Management
- Company & Brand Management
- Boards Hub
- Contact Form
- Announcements

Infrastructure:
- API Security & Rate Limiting
- Static Asset Caching
- Email Notification System
- Admin Recovery Safe Mode
- Cookie Consent

Operations:
- Publishing & Deployment Guide (v1.0 + v2.0)
- Financial Intelligence (Doc Captain integration)
- Internationalization (Translator 2.0)
- GitHub Backup Integration
- Investor Relations Portal
- AI Command Center
- Webhooks
- CRM Module

Each entry includes the full architecture, files, API routes, and dependencies. This is the authoritative reference for how the platform works.

## Files
- `client/src/pages/portal/feature-docs.tsx` — The entire Feature Documentation system — data, rendering, search, export, and version switching
- `client/src/App.tsx` — Route registration for /portal/feature-docs

## Dependencies
- lucide-react — Icons for each feature category
- shadcn/ui — Card, Badge, Button, Select components
- @/hooks/use-toast — Toast notifications for copy/download feedback

