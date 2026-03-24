import PusherServer from "pusher";
import PusherClient from "pusher-js";

// 1. The Server Instance (Used in API routes to TRIGGER events)
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// 2. The Client Instance (Used in React components to LISTEN for events)
// We wrap it in a function or check if it exists so we don't spawn multiple connections in development
export const pusherClient =
  typeof window !== "undefined"
    ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      })
    : null;
