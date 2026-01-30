# Replit.md

## Overview

This is a Mastra-based AI automation framework for building agentic workflows with durable execution. The project enables users to create time-based (cron) and webhook-triggered automations using TypeScript. It leverages Mastra for agent orchestration, Inngest for durable workflow execution, and supports integrations with Slack, Telegram, Linear, and other services.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Framework Core
- **Mastra Framework**: Primary orchestration layer for AI agents, tools, and workflows. All agents, tools, and workflows are defined in `src/mastra/` directory.
- **Inngest Integration**: Provides durable execution for workflows - if a workflow fails, it can resume from where it left off. Custom Inngest code lives in `src/mastra/inngest/`.

### Agent Architecture
- Agents use LLMs and tools to solve tasks autonomously
- Agents are created using the `Agent` class from `@mastra/core/agent`
- Must use `.generateLegacy()` method (not `.generate()`) for Replit Playground UI compatibility
- Agents can have memory (conversation history, semantic recall, working memory) via `@mastra/memory`

### Workflow Architecture
- Workflows orchestrate complex multi-step processes using graph-based execution
- Created with `createWorkflow()` and `createStep()` from `@mastra/core/workflows`
- Support branching (`.parallel()`), chaining (`.then()`), conditions, and human-in-the-loop patterns
- Can suspend and resume execution using snapshots

### Trigger System
Two trigger types supported:
1. **Time-based (Cron)**: Register with `registerCronTrigger()` BEFORE Mastra initialization in `src/mastra/index.ts`
2. **Webhook-based**: Spread trigger registration into `apiRoutes` array in `src/mastra/index.ts`. Implementations live in `src/triggers/` folder.

### Tool Architecture
- Tools extend agent capabilities for API calls, database queries, and custom functions
- Created using `createTool()` from `@mastra/core/tools`
- Define `inputSchema` and `outputSchema` with Zod for type safety

### Storage Layer
- Uses `@mastra/pg` (PostgreSQL) or `@mastra/libsql` (LibSQL) for persistence
- Shared storage configured via `sharedPostgresStorage` in `src/mastra/storage.ts`
- Memory storage supports conversation threads, semantic recall with vector embeddings

## External Dependencies

### AI/LLM Providers
- `@ai-sdk/openai`: OpenAI model integration
- `@openrouter/ai-sdk-provider`: OpenRouter for multi-provider access
- `ai`: Vercel AI SDK for streaming and model routing

### Orchestration & Durability
- `inngest`: Durable workflow execution engine
- `@inngest/realtime`: Real-time event streaming
- `@mastra/inngest`: Mastra-Inngest integration layer

### Storage
- `@mastra/pg`: PostgreSQL storage adapter
- `@mastra/libsql`: LibSQL storage adapter
- `drizzle-zod`: Schema validation for database models

### Messaging Integrations
- `@slack/web-api`: Slack bot and webhook integration
- Telegram support via `src/triggers/telegramTriggers.ts`

### External APIs
- `googleapis`: Google APIs integration
- `openai`: Direct OpenAI API access

### Utilities
- `zod`: Schema validation throughout the codebase
- `pino`: Logging via `@mastra/loggers`
- `dotenv`: Environment variable management