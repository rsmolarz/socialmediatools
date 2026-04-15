import type { Request, Response, NextFunction } from "express";

export function requireSessionOwner(getSession: (id: string) => Promise<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const userId = (req.user as any)?.id || (req as any).userId;
    if (session.hostUserId !== userId) return res.status(403).json({ error: "Forbidden" });
    (req as any).studioSession = session;
    next();
  };
}
