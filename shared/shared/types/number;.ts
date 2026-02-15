import { z } from 'zod';

// Thumbnail creation schema
export const CreateThumbnailSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    imageUrl: z.string().url(),
    format: z.enum(['jpeg', 'png', 'webp', 'gif', 'svg']),
    aspectRatio: z.enum(['1:1', '4:3', '16:9', '3:2', '21:9', 'custom']),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fileSize: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    textColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    borderRadius: z.number().min(0).max(100).optional(),
    opacity: z.number().min(0).max(1).optional(),
});

export type CreateThumbnailInput = z.infer<typeof CreateThumbnailSchema>;

// Thumbnail update schema
export const UpdateThumbnailSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    format: z.enum(['jpeg', 'png', 'webp', 'gif', 'svg']).optional(),
    tags: z.array(z.string()).optional(),
    backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    textColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    borderRadius: z.number().min(0).max(100).optional(),
    opacity: z.number().min(0).max(1).optional(),
    scale: z.number().min(0.1).max(5).optional(),
    rotation: z.number().min(0).max(360).optional(),
    flipHorizontal: z.boolean().optional(),
    flipVertical: z.boolean().optional(),
    filters: z.object({
          brightness: z.number().min(-100).max(100).optional(),
          contrast: z.number().min(-100).max(100).optional(),
          saturation: z.number().min(-100).max(100).optional(),
          blur: z.number().min(0).max(50).optional(),
          grayscale: z.boolean().optional(),
          sepia: z.boolean().optional(),
    }).optional(),
});

export type UpdateThumbnailInput = z.infer<typeof UpdateThumbnailSchema>;

// Export options schema
export const ExportThumbnailSchema = z.object({
    formats: z.array(z.enum(['jpeg', 'png', 'webp', 'gif', 'svg'])),
    sizes: z.array(z.object({
          width: z.number().int().positive(),
          height: z.number().int().positive(),
    })),
    quality: z.number().min(1).max(100).optional(),
    includeMetadata: z.boolean().optional(),
});

export type ExportThumbnailInput = z.infer<typeof ExportThumbnailSchema>;

// Batch operation schema
export const BatchThumbnailSchema = z.object({
    thumbnailIds: z.array(z.string().min(1)),
    action: z.enum(['delete', 'archive', 'tag', 'export']),
    metadata: z.any().optional(),
});

export type BatchThumbnailInput = z.infer<typeof BatchThumbnailSchema>;

// Query parameters schema
export const ThumbnailQuerySchema = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort: z.enum(['created', 'updated', 'title', 'size']).default('created'),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['draft', 'ready', 'processing', 'error', 'archived']).optional(),
    format: z.enum(['jpeg', 'png', 'webp', 'gif', 'svg']).optional(),
    minWidth: z.number().int().positive().optional(),
    maxWidth: z.number().int().positive().optional(),
    minHeight: z.number().int().positive().optional(),
    maxHeight: z.number().int().positive().optional(),
});

export type ThumbnailQueryInput = z.infer<typeof ThumbnailQuerySchema>;
})
})
    }))
})
    })
})
})