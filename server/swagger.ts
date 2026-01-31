import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Medicine & Money Show - Thumbnail Generator API",
      version: "1.0.0",
      description: "API documentation for the YouTube Thumbnail Generator platform featuring analytics, A/B testing, social media integration, and more.",
      contact: {
        name: "Medicine & Money Show",
        url: "https://medicineandmoneyshow.com"
      }
    },
    servers: [
      {
        url: "/api",
        description: "API Server"
      }
    ],
    tags: [
      { name: "Analytics", description: "Analytics and performance tracking endpoints" },
      { name: "Thumbnails", description: "Thumbnail CRUD operations" },
      { name: "A/B Testing", description: "A/B test management" },
      { name: "Social Media", description: "Viral content and social posts" },
      { name: "YouTube", description: "YouTube channel integration" },
      { name: "Templates", description: "Thumbnail template library" },
      { name: "Collections", description: "Thumbnail organization" },
      { name: "Authentication", description: "User authentication" }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description: "Session-based authentication using Replit Auth (OIDC)"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique user identifier (sub claim from OIDC)" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            profileImageUrl: { type: "string", format: "uri" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AuthSession: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            expiresAt: { type: "string", format: "date-time" }
          }
        },
        AnalyticsSummary: {
          type: "object",
          properties: {
            totalImpressions: { type: "integer", example: 15000 },
            totalClicks: { type: "integer", example: 750 },
            overallEngagementRate: { type: "number", example: 5.0 },
            thumbnails: {
              type: "array",
              items: { $ref: "#/components/schemas/ThumbnailStats" }
            }
          }
        },
        ThumbnailStats: {
          type: "object",
          properties: {
            thumbnailId: { type: "string", format: "uuid" },
            title: { type: "string", example: "Episode 42 Thumbnail" },
            impressions: { type: "integer", example: 5000 },
            clicks: { type: "integer", example: 250 },
            engagementRate: { type: "number", example: 5.0 }
          }
        },
        ThumbnailAnalytics: {
          type: "object",
          properties: {
            thumbnailId: { type: "string", format: "uuid" },
            dailyStats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  impressions: { type: "integer" },
                  clicks: { type: "integer" }
                }
              }
            },
            totalImpressions: { type: "integer" },
            totalClicks: { type: "integer" },
            engagementRate: { type: "number" }
          }
        },
        AnalyticsEvent: {
          type: "object",
          required: ["thumbnailId", "eventType"],
          properties: {
            thumbnailId: { type: "string", format: "uuid" },
            eventType: { type: "string", enum: ["impression", "click"] }
          }
        },
        BulkAnalytics: {
          type: "object",
          required: ["thumbnailId", "impressions", "clicks"],
          properties: {
            thumbnailId: { type: "string", format: "uuid" },
            impressions: { type: "integer", example: 100 },
            clicks: { type: "integer", example: 5 },
            platform: { type: "string", example: "youtube" },
            date: { type: "string", format: "date" }
          }
        },
        Thumbnail: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            config: { type: "object" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        ABTest: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            status: { type: "string", enum: ["draft", "active", "completed"] },
            variants: { type: "array", items: { type: "object" } },
            winnerId: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        ViralTopic: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            topic: { type: "string" },
            viralityScore: { type: "integer" },
            category: { type: "string" },
            hooks: { type: "array", items: { type: "string" } }
          }
        },
        SocialPost: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            platform: { type: "string", enum: ["facebook", "instagram", "linkedin"] },
            description: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            status: { type: "string", enum: ["pending", "approved", "rejected"] }
          }
        },
        Template: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            category: { type: "string" },
            config: { type: "object" }
          }
        },
        Collection: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            color: { type: "string" },
            icon: { type: "string" },
            isPrivate: { type: "boolean" }
          }
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" }
          }
        }
      }
    },
    paths: {
      "/login": {
        get: {
          summary: "Initiate login with Replit Auth",
          description: "Redirects to Replit's OIDC authentication page. After successful authentication, user is redirected back with a session cookie.",
          tags: ["Authentication"],
          responses: {
            302: {
              description: "Redirect to Replit Auth login page"
            }
          }
        }
      },
      "/logout": {
        get: {
          summary: "Logout current user",
          description: "Destroys the current session and logs out the user.",
          tags: ["Authentication"],
          security: [{ sessionAuth: [] }],
          responses: {
            302: {
              description: "Redirect to home page after logout"
            }
          }
        }
      },
      "/auth/user": {
        get: {
          summary: "Get current authenticated user",
          description: "Returns the currently authenticated user's profile information. Requires valid session.",
          tags: ["Authentication"],
          security: [{ sessionAuth: [] }],
          responses: {
            200: {
              description: "Current user profile",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" }
                }
              }
            },
            401: {
              description: "Not authenticated"
            },
            500: {
              description: "Server error"
            }
          }
        }
      }
    }
  },
  apis: ["./server/routes.ts"]
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Medicine & Money API Docs",
    swaggerOptions: {
      tryItOutEnabled: true,
      persistAuthorization: true
    }
  }));

  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}
