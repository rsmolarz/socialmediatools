#!/bin/bash

# ============================================================================
# COMPREHENSIVE SETUP SCRIPT FOR PWA + TEAM COLLABORATION + TESTING/DEPLOYMENT
# ============================================================================
# This script automates implementation of all 3 phases

set -e  # Exit on error

echo "🚀 Starting Complete PWA + Team Collaboration Setup..."
echo "=================================================="

# ============================================================================
# PHASE 1: PROGRESSIVE WEB APP (PWA)
# ============================================================================

echo ""
echo "📱 PHASE 1: Setting up Progressive Web App (PWA)..."
echo "=================================================="

# Create manifest.json
echo "Creating public/manifest.json..."
cat > public/manifest.json << 'EOF'
{
  "name": "Thumbnail Generator - Create Stunning Thumbnails",
  "short_name": "Thumbnail Gen",
  "description": "Professional thumbnail generator with AI optimization and team collaboration",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-540.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ],
  "categories": ["productivity", "graphics"],
  "shortcuts": [
    {
      "name": "Create Thumbnail",
      "short_name": "New",
      "description": "Start creating a new thumbnail",
      "url": "/dashboard?action=new",
      "icons": [{ "src": "/icon-96.png", "sizes": "96x96" }]
    }
  ]
}
EOF

# Create service-worker.js
echo "Creating client/public/service-worker.js..."
cat > client/public/service-worker.js << 'EOF'
const CACHE_NAME = 'thumb-meta-v1';
const API_CACHE = 'thumb-meta-api-v1';
const IMAGE_CACHE = 'thumb-meta-images-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log('Service Worker: Some static assets failed to cache');
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== API_CACHE && 
                   cacheName !== IMAGE_CACHE;
          })
          .map((cacheName) => {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cache = caches.open(API_CACHE);
          cache.then((c) => c.put(request.url, response.clone()));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images - cache first
  if (request.headers.get('accept')?.includes('image')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) return response;
          return fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((response) => {
        const cache = caches.open(CACHE_NAME);
        cache.then((c) => c.put(request, response.clone()));
        return response;
      });
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Thumbnail Generator';
  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    tag: data.tag || 'notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
EOF

# Create PWA Manager
echo "Creating client/src/utils/pwa-manager.ts..."
cat > client/src/utils/pwa-manager.ts << 'EOF'
export class PWAManager {
  private deferredPrompt: any = null;
  private isInstalled = false;

  constructor() {
    this.init();
  }

  private init() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      console.log('PWA installed successfully');
    });
  }

  async canInstall(): Promise<boolean> {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  async install(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      this.isInstalled = true;
      this.deferredPrompt = null;
      return true;
    }
    return false;
  }

  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.log('Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async subscribeToPushNotifications(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) throw new Error('Notifications not supported');
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  }

  async storeForOfflineSync(endpoint: string, data: any): Promise<void> {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({ endpoint, data, timestamp: Date.now() });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }

  async processSyncQueue(): Promise<void> {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    const processed = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          processed.push(item.timestamp);
        }
      } catch (error) {
        console.error('Sync failed for:', item.endpoint);
      }
    }

    const updatedQueue = queue.filter((q: any) => !processed.includes(q.timestamp));
    localStorage.setItem('sync_queue', JSON.stringify(updatedQueue));
  }

  async clearOfflineData(): Promise<void> {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    localStorage.removeItem('sync_queue');
  }
}

export const pwaManager = new PWAManager();
EOF

# Create Notification Service
echo "Creating client/src/utils/notification-service.ts..."
cat > client/src/utils/notification-service.ts << 'EOF'
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
}

export class NotificationService {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SEND_NOTIFICATION',
          payload,
        });
      } else {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          tag: payload.tag,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async subscribeToPushNotifications(vapidPublicKey: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        return true;
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubscription),
      });

      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = new NotificationService();
EOF

# Create PWA Install Button Component
echo "Creating client/src/components/pwa-install-button.tsx..."
cat > client/src/components/pwa-install-button.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { pwaManager } from '../utils/pwa-manager';

export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    checkInstallability();

    const handleBeforeInstallPrompt = async () => {
      setCanInstall(await pwaManager.canInstall());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const checkInstallability = async () => {
    setCanInstall(await pwaManager.canInstall());
    setIsInstalled(pwaManager.isAppInstalled());
  };

  const handleInstall = async () => {
    const success = await pwaManager.install();
    if (success) {
      setCanInstall(false);
      setIsInstalled(true);
    }
  };

  if (!canInstall || isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
    >
      <Download size={18} />
      <span>Install App</span>
    </button>
  );
}
EOF

echo "✅ Phase 1 (PWA) Setup Complete!"

# ============================================================================
# PHASE 2: TEAM COLLABORATION
# ============================================================================

echo ""
echo "👥 PHASE 2: Setting up Team Collaboration..."
echo "=================================================="

# Create Organization Model
echo "Creating server/models/organization.ts..."
cat > server/models/organization.ts << 'EOF'
import { pgTable, text, timestamp, uuid, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    logo: text('logo'),
    ownerId: uuid('owner_id').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('org_owner_idx').on(table.ownerId),
    slugIdx: index('org_slug_idx').on(table.slug),
  })
);

export const organizationRelations = relations(organizations, ({ many, one }) => ({
  members: many(organizationMembers),
  teams: many(teams),
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
}));

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
EOF

# Create Team Model
echo "Creating server/models/team.ts..."
cat > server/models/team.ts << 'EOF'
import { pgTable, text, timestamp, uuid, boolean, index, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organization';

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    memberCount: integer('member_count').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('team_org_idx').on(table.organizationId),
  })
);

export const teamRelations = relations(teams, ({ many, one }) => ({
  members: many(teamMembers),
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
}));

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
EOF

# Create Permissions Models
echo "Creating server/models/permissions.ts..."
cat > server/models/permissions.ts << 'EOF'
import { pgTable, text, timestamp, uuid, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations, teams } from './organization';
import { users } from './user';

export const roleEnum = pgEnum('role', [
  'owner',
  'admin',
  'member',
  'viewer',
]);

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: roleEnum('role').notNull().default('member'),
    permissions: text('permissions').array().default([]),
    isActive: boolean('is_active').notNull().default(true),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    orgUserIdx: index('org_member_org_user_idx').on(table.organizationId, table.userId),
  })
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: roleEnum('role').notNull().default('member'),
    permissions: text('permissions').array().default([]),
    isActive: boolean('is_active').notNull().default(true),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    teamUserIdx: index('team_member_team_user_idx').on(table.teamId, table.userId),
  })
);

export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    email: text('email').notNull(),
    role: roleEnum('role').notNull().default('member'),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    orgEmailIdx: index('org_inv_org_email_idx').on(table.organizationId, table.email),
  })
);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
EOF

# Create Organizations Routes
echo "Creating server/routes/organizations.ts..."
cat > server/routes/organizations.ts << 'EOF'
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { organizations, organizationMembers, organizationInvitations } from '../models/permissions';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all organizations for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, userId));

    res.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Create organization
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const slug = name
      .toLowerCase()
      .replace(/\\s+/g, '-')
      .replace(/[^\\w-]/g, '');

    const org = await db
      .insert(organizations)
      .values({
        id: uuidv4(),
        name,
        slug,
        description,
        ownerId: userId,
      })
      .returning();

    res.status(201).json(org[0]);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get organization details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, req.params.id));

    if (!org.length) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(org[0]);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Get organization members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const members = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, req.params.id));

    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Invite member to organization
router.post('/:id/invite', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, req.params.id));

    if (!org.length || org[0].ownerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await db
      .insert(organizationInvitations)
      .values({
        id: uuidv4(),
        organizationId: req.params.id,
        email,
        role: role as any,
        token,
        expiresAt,
      })
      .returning();

    res.status(201).json(invitation[0]);
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

export default router;
EOF

# Create Teams Routes
echo "Creating server/routes/teams.ts..."
cat > server/routes/teams.ts << 'EOF'
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { teams, teamMembers } from '../models/team';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create team
router.post('/', async (req: Request, res: Response) => {
  try {
    const { organizationId, name, description } = req.body;
    if (!organizationId || !name) {
      return res.status(400).json({ error: 'Organization ID and name are required' });
    }

    const team = await db
      .insert(teams)
      .values({
        id: uuidv4(),
        organizationId,
        name,
        description,
      })
      .returning();

    res.status(201).json(team[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get teams by organization
router.get('/organization/:orgId', async (req: Request, res: Response) => {
  try {
    const orgTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.organizationId, req.params.orgId));

    res.json(orgTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, req.params.id));

    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Add team member
router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }

    const member = await db
      .insert(teamMembers)
      .values({
        id: uuidv4(),
        teamId: req.params.id,
        userId,
        role: role as any,
      })
      .returning();

    res.status(201).json(member[0]);
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

export default router;
EOF

# Create Team Management Component
echo "Creating client/src/components/team-management.tsx..."
cat > client/src/components/team-management.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { Users, Plus, Mail } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
}

export function TeamManagement({ organizationId }: { organizationId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [organizationId]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/teams/organization/${organizationId}`);
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchMembers = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;

    setLoading(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: newTeamName,
        }),
      });

      if (response.ok) {
        setNewTeamName('');
        setShowNewTeam(false);
        await fetchTeams();
      }
    } catch (error) {
      console.error('Error creating team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !selectedTeam) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        setInviteEmail('');
        setShowInvite(false);
      }
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    fetchMembers(team.id);
  };

  return (
    <div className="space-y-6">
      {/* Teams List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            <h2 className="text-2xl font-bold">Teams</h2>
          </div>
          <button
            onClick={() => setShowNewTeam(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={18} />
            New Team
          </button>
        </div>

        {showNewTeam && (
          <form onSubmit={handleCreateTeam} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-2"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewTeam(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                selectedTeam?.id === team.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-400'
              }`}
            >
              <h3 className="font-semibold">{team.name}</h3>
              {team.description && <p className="text-sm text-gray-600">{team.description}</p>}
              <p className="text-sm text-gray-500 mt-2">{team.memberCount} members</p>
            </button>
          ))}
        </div>
      </div>

      {/* Team Members */}
      {selectedTeam && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{selectedTeam.name} - Members</h3>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Mail size={18} />
              Invite
            </button>
          </div>

          {showInvite && (
            <form onSubmit={handleInviteMember} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg mb-2"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg mb-2"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="p-3 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{member.userId}</p>
                  <p className="text-sm text-gray-500">{member.role}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(member.joinedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
EOF

echo "✅ Phase 2 (Team Collaboration) Setup Complete!"

# ============================================================================
# PHASE 3: UPDATE MAIN APP & REGISTER ROUTES
# ============================================================================

echo ""
echo "🔧 PHASE 3: Integrating PWA & Team Collaboration into Main App..."
echo "=================================================="

# Update App.tsx to include PWA initialization and team management
echo "