import { useEffect, useRef } from "react";

interface CursorPosition {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

interface LiveCursorsProps {
  cursors: CursorPosition[];
  containerRef: React.RefObject<HTMLElement>;
  onCursorMove?: (x: number, y: number) => void;
}

export function LiveCursors({ cursors, containerRef, onCursorMove }: LiveCursorsProps) {
  const lastSentRef = useRef(0);
  
  useEffect(() => {
    if (!containerRef.current || !onCursorMove) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSentRef.current < 50) return;
      lastSentRef.current = now;
      
      const rect = containerRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      onCursorMove(x, y);
    };
    
    const element = containerRef.current;
    element.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      element.removeEventListener("mousemove", handleMouseMove);
    };
  }, [containerRef, onCursorMove]);

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-50 transition-all duration-75"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: "translate(-2px, -2px)"
          }}
          data-testid={`cursor-${cursor.userId}`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
          >
            <path
              d="M5.5 3.5L19 12L12.5 13.5L9.5 20L5.5 3.5Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          <div
            className="absolute left-5 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username}
          </div>
        </div>
      ))}
    </>
  );
}
