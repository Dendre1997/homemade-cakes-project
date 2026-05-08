import 'client-only';
import PusherClient from "pusher-js";

// 2. The Client Instance (Used in React components to LISTEN for events)
// We wrap it in a function or check if it exists so we don't spawn multiple connections in development
export const pusherClient =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_PUSHER_KEY
    ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
        authEndpoint: "/api/pusher/auth",
      })
    : null;
