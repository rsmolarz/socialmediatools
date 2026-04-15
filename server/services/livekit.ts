import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY as string;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET as string;
const LIVEKIT_URL        = process.env.LIVEKIT_URL as string;

let _roomService: RoomServiceClient | null = null;
function getRoomService(): RoomServiceClient {
  if (!_roomService) {
    _roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return _roomService;
}

export function createHostToken(roomName: string, userId: string, displayName: string): string {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId,
    name: displayName,
    ttl: "4h",
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: true,
    roomRecord: true,
  });
  return token.toJwt();
}

export function createGuestToken(roomName: string, guestId: string, displayName: string): string {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: guestId,
    name: displayName,
    ttl: "4h",
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}

export async function endRoom(roomName: string): Promise<void> {
  try {
    await getRoomService().deleteRoom(roomName);
  } catch (e) {
    // room may already be empty/deleted
  }
}

export async function listParticipants(roomName: string) {
  try {
    return await getRoomService().listParticipants(roomName);
  } catch {
    return [];
  }
}

export { LIVEKIT_URL };
