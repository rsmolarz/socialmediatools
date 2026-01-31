import { useEffect, useRef, useState, useCallback } from "react";

interface CollaboratorPresence {
  userId: string;
  username: string;
  color: string;
}

interface CursorPosition {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

interface ChatMessage {
  userId: string;
  username: string;
  color: string;
  message: string;
  timestamp: string;
}

interface UseCollaborationOptions {
  thumbnailId: string;
  username?: string;
  onEdit?: (data: any) => void;
  onSync?: (data: any) => void;
  onConflict?: (currentData: any, rejectedTimestamp: number) => void;
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { thumbnailId, username = "Anonymous", onEdit, onSync, onConflict } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userColor, setUserColor] = useState<string>("#4ECDC4");
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [selections, setSelections] = useState<Map<string, {layerId: string; userId: string; username: string; color: string}>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "connected":
            setUserId(message.userId);
            setUserColor(message.color);
            ws.send(JSON.stringify({
              type: "join",
              thumbnailId,
              username
            }));
            break;
            
          case "presence":
            setCollaborators(message.users || []);
            break;
            
          case "join":
            setCollaborators(prev => {
              if (prev.some(c => c.userId === message.userId)) return prev;
              return [...prev, {
                userId: message.userId,
                username: message.username,
                color: message.color
              }];
            });
            break;
            
          case "leave":
            setCollaborators(prev => 
              prev.filter(c => c.userId !== message.userId)
            );
            setCursors(prev => {
              const next = new Map(prev);
              next.delete(message.userId);
              return next;
            });
            break;
            
          case "cursor":
            setCursors(prev => {
              const next = new Map(prev);
              next.set(message.userId, {
                userId: message.userId,
                username: message.username,
                color: message.color,
                x: message.data.x,
                y: message.data.y
              });
              return next;
            });
            break;
            
          case "edit":
            onEdit?.(message.data);
            break;
            
          case "sync":
            onSync?.(message.data);
            break;
            
          case "chat":
            setChatMessages(prev => [...prev, {
              userId: message.userId,
              username: message.username,
              color: message.color,
              message: message.data.message,
              timestamp: message.timestamp
            }]);
            break;

          case "selection":
            setSelections(prev => {
              const next = new Map(prev);
              if (message.data?.layerId) {
                next.set(message.userId, {
                  layerId: message.data.layerId,
                  userId: message.userId,
                  username: message.username,
                  color: message.color
                });
              } else {
                next.delete(message.userId);
              }
              return next;
            });
            break;
            
          case "edit_rejected":
            onConflict?.(message.currentData, message.timestamp);
            break;
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return ws;
  }, [thumbnailId, username, onEdit, onSync]);

  useEffect(() => {
    const ws = connect();
    return () => {
      ws.close();
    };
  }, [connect]);

  const sendCursor = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "cursor",
        data: { x, y }
      }));
    }
  }, []);

  const sendEdit = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "edit",
        data,
        timestamp: Date.now()
      }));
    }
  }, []);

  const sendSync = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "sync",
        data
      }));
    }
  }, []);

  const sendChat = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chat",
        data: { message }
      }));
    }
  }, []);

  return {
    connected,
    userId,
    userColor,
    collaborators,
    cursors: Array.from(cursors.values()),
    chatMessages,
    sendCursor,
    sendEdit,
    sendSync,
    sendChat,
    selections: Array.from(selections.values()),
    sendSelection: useCallback((layerId: string | null) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "selection",
          data: { layerId }
        }));
      }
    }, [])
  };
}
