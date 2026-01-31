import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

interface CollaborationClient {
  ws: WebSocket;
  odisId: string;
  thumbnailId?: string;
  username?: string;
  color: string;
  lastActivity: number;
  status: "online" | "away" | "busy";
}

interface CollaborationMessage {
  type: "join" | "leave" | "cursor" | "edit" | "presence" | "chat" | "sync" | "selection" | "activity";
  thumbnailId?: string;
  userId?: string;
  username?: string;
  data?: any;
  timestamp?: number;
}

interface ActivityItem {
  userId: string;
  username: string;
  action: string;
  timestamp: string;
}

const activityLogs = new Map<string, ActivityItem[]>();

interface SelectionState {
  layerId: string | null;
  userId: string;
  username: string;
  color: string;
}

const thumbnailSelections = new Map<string, Map<string, SelectionState>>();

interface EditState {
  data: any;
  timestamp: number;
  userId: string;
}

const thumbnailStates = new Map<string, EditState>();

const clients = new Map<WebSocket, CollaborationClient>();
const thumbnailRooms = new Map<string, Set<WebSocket>>();

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F8B500", "#00CED1"
];

let colorIndex = 0;

function getNextColor(): string {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
}

function broadcast(thumbnailId: string, message: object, excludeWs?: WebSocket) {
  const room = thumbnailRooms.get(thumbnailId);
  if (!room) return;
  
  const payload = JSON.stringify(message);
  room.forEach(ws => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function getPresenceList(thumbnailId: string): Array<{userId: string; username: string; color: string; status: string; lastSeen: number}> {
  const room = thumbnailRooms.get(thumbnailId);
  if (!room) return [];
  
  const presence: Array<{userId: string; username: string; color: string; status: string; lastSeen: number}> = [];
  room.forEach(ws => {
    const client = clients.get(ws);
    if (client) {
      presence.push({
        userId: client.odisId,
        username: client.username || "Anonymous",
        color: client.color,
        status: client.status || "online",
        lastSeen: client.lastActivity
      });
    }
  });
  return presence;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  
  log("WebSocket server initialized", "websocket");
  
  wss.on("connection", (ws) => {
    const clientId = Math.random().toString(36).substring(7);
    const client: CollaborationClient = {
      ws,
      odisId: clientId,
      color: getNextColor(),
      lastActivity: Date.now()
    };
    clients.set(ws, client);
    
    log(`Client connected: ${clientId}`, "websocket");
    
    ws.send(JSON.stringify({
      type: "connected",
      userId: clientId,
      color: client.color
    }));
    
    ws.on("message", (data) => {
      try {
        const message: CollaborationMessage = JSON.parse(data.toString());
        client.lastActivity = Date.now();
        
        switch (message.type) {
          case "join":
            if (message.thumbnailId) {
              if (client.thumbnailId) {
                const oldRoom = thumbnailRooms.get(client.thumbnailId);
                oldRoom?.delete(ws);
                broadcast(client.thumbnailId, {
                  type: "leave",
                  userId: client.odisId,
                  username: client.username
                });
              }
              
              client.thumbnailId = message.thumbnailId;
              client.username = message.username || "Anonymous";
              client.status = "online";
              client.lastActivity = Date.now();
              
              if (!thumbnailRooms.has(message.thumbnailId)) {
                thumbnailRooms.set(message.thumbnailId, new Set());
              }
              thumbnailRooms.get(message.thumbnailId)!.add(ws);
              
              broadcast(message.thumbnailId, {
                type: "join",
                userId: client.odisId,
                username: client.username,
                color: client.color,
                status: client.status,
                lastSeen: client.lastActivity
              }, ws);
              
              ws.send(JSON.stringify({
                type: "presence",
                users: getPresenceList(message.thumbnailId)
              }));

              // Send existing activity log to newly joined user
              const log = activityLogs.get(message.thumbnailId) || [];
              ws.send(JSON.stringify({
                type: "activity_history",
                data: log
              }));
            }
            break;
            
          case "cursor":
            if (client.thumbnailId && message.data) {
              broadcast(client.thumbnailId, {
                type: "cursor",
                userId: client.odisId,
                username: client.username,
                color: client.color,
                data: message.data
              }, ws);
            }
            break;
            
          case "edit":
            if (client.thumbnailId && message.data) {
              const incomingTimestamp = message.timestamp || Date.now();
              const currentState = thumbnailStates.get(client.thumbnailId);
              
              if (!currentState || incomingTimestamp >= currentState.timestamp) {
                thumbnailStates.set(client.thumbnailId, {
                  data: message.data,
                  timestamp: incomingTimestamp,
                  userId: client.odisId
                });
                
                // Add to activity log
                if (!activityLogs.has(client.thumbnailId)) {
                  activityLogs.set(client.thumbnailId, []);
                }
                const log = activityLogs.get(client.thumbnailId)!;
                const activityItem = {
                  userId: client.odisId,
                  username: client.username || "Anonymous",
                  action: `Edited ${message.data.type || 'thumbnail'}`,
                  timestamp: new Date().toISOString()
                };
                log.push(activityItem);
                if (log.length > 50) log.shift();

                broadcast(client.thumbnailId, {
                  type: "activity",
                  data: activityItem
                });

                broadcast(client.thumbnailId, {
                  type: "edit",
                  userId: client.odisId,
                  username: client.username,
                  data: message.data,
                  timestamp: incomingTimestamp,
                  accepted: true
                }, ws);
                
                ws.send(JSON.stringify({
                  type: "edit_ack",
                  timestamp: incomingTimestamp,
                  accepted: true
                }));
              } else {
                ws.send(JSON.stringify({
                  type: "edit_rejected",
                  timestamp: incomingTimestamp,
                  currentTimestamp: currentState.timestamp,
                  currentData: currentState.data,
                  reason: "Newer edit exists"
                }));
              }
            }
            break;

          case "join":
            if (message.thumbnailId) {
              // ... existing join logic ...
              
              // Send existing activity log to newly joined user
              const log = activityLogs.get(message.thumbnailId) || [];
              ws.send(JSON.stringify({
                type: "activity_history",
                data: log
              }));
            }
            break;
            
          case "presence":
            if (message.data?.status) {
              client.status = message.data.status;
              client.lastActivity = Date.now();
              if (client.thumbnailId) {
                broadcast(client.thumbnailId, {
                  type: "presence_update",
                  userId: client.odisId,
                  status: client.status,
                  lastSeen: client.lastActivity
                });
              }
            }
            break;

          case "chat":
            if (client.thumbnailId && message.data) {
              broadcast(client.thumbnailId, {
                type: "chat",
                userId: client.odisId,
                username: client.username,
                color: client.color,
                data: message.data,
                timestamp: new Date().toISOString()
              });
            }
            break;
            
          case "sync":
            if (client.thumbnailId && message.data) {
              broadcast(client.thumbnailId, {
                type: "sync",
                userId: client.odisId,
                data: message.data
              }, ws);
            }
            break;

          case "selection":
            if (client.thumbnailId) {
              if (!thumbnailSelections.has(client.thumbnailId)) {
                thumbnailSelections.set(client.thumbnailId, new Map());
              }
              const selections = thumbnailSelections.get(client.thumbnailId)!;
              
              if (message.data?.layerId) {
                selections.set(client.odisId, {
                  layerId: message.data.layerId,
                  userId: client.odisId,
                  username: client.username || "Anonymous",
                  color: client.color
                });
              } else {
                selections.delete(client.odisId);
              }

              broadcast(client.thumbnailId, {
                type: "selection",
                userId: client.odisId,
                username: client.username,
                color: client.color,
                data: message.data
              }, ws);
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        log(`Client disconnected: ${client.odisId}`, "websocket");
        
        if (client.thumbnailId) {
          const room = thumbnailRooms.get(client.thumbnailId);
          room?.delete(ws);
          
          if (room?.size === 0) {
            thumbnailRooms.delete(client.thumbnailId);
          } else {
            broadcast(client.thumbnailId, {
              type: "leave",
              userId: client.odisId,
              username: client.username
            });
          }
        }
        
        clients.delete(ws);
      }
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
  
  setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000;
    
    clients.forEach((client, ws) => {
      if (now - client.lastActivity > timeout) {
        ws.terminate();
      }
    });
  }, 60000);
  
  return wss;
}
