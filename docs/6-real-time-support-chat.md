Real-time Support Chat
Type Definitions
The chat subsystem is typed in src/types/index.ts through four named constructs that govern persistence, authorization, and UI rendering.

MessageSender — union 'client' | 'admin' | 'bot'. Identifies the author of each message in IMessage.sender. Validated server-side in POST /api/chat/message; non-admin users cannot submit sender: "admin" (anti-spoofing). Bot messages during the bot_active phase are predominantly client-local (appendLocalBotMessage in ContactClient) and are not persisted until escalation triggers API-backed messaging.

ChatStatus — union defining the IChat.status lifecycle:

Value Semantics
'bot_active'
Client interacts with the local decision tree; chat hidden from admin inbox; Pusher not subscribed on client
'waiting_admin'
Client escalated or sent a message while bot_active; ticket visible in admin inbox; hasUnread typically true
'admin_active'
Admin has replied; live human dialogue in progress
'archived_bot'
Client closed while still in bot mode (reserved lifecycle state)
'resolved'
Ticket closed by admin or client; excluded from active lists
IMessage — embedded message document appended to IChat.messages[]:

export interface IMessage {
  id: string;           // crypto.randomUUID() on server persist
  sender: MessageSender;
  text: string;
  createdAt: Date;
}
IChat — MongoDB document in the chats collection:

export interface IChat {
  _id?: string | ObjectId;
  userId: string;       // Owner's users._id as string
  status: ChatStatus;
  hasUnread: boolean;   // Admin inbox unread indicator
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}
Factory createInitialChat(userId) (src/lib/api/chat.ts) initializes { status: 'bot_active', hasUnread: false, messages: [] }.

Pusher WebSocket Architecture
The platform uses Pusher Channels for server-triggered, client-listened real-time events. Transport is WebSocket over TLS.

Server instance (src/lib/pusher-server.ts, server-only):

new PusherServer({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});
Used exclusively in API routes to trigger() events. Never instantiated in client bundles.

Client instance (src/lib/pusher-client.ts, client-only):

new PusherClient(NEXT_PUBLIC_PUSHER_KEY, {
  cluster: NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  authEndpoint: "/api/pusher/auth",
});
Singleton pusherClient exported for admin components. ContactClient instantiates a separate PusherClient per widget session stored in pusherRef.

Channel Topology
Channel name Type Subscribers Events
private-admin-inbox
Private
Admin UI only (AdminSupportDashboard, AdminSidebar)
inbox-update
private-chat-{chatId}
Private
Client + admin viewing that IChat._id
new-message, typing-update
All channels require Pusher private-channel authorization via POST /api/pusher/auth before subscription succeeds.

Event Flow (message delivery)
Client/Admin → POST /api/chat/message
  → MongoDB $push messages + $set status/hasUnread/updatedAt
  → pusherServer.trigger(`private-chat-${chatId}`, 'new-message', IMessage)
  → pusherServer.trigger('private-admin-inbox', 'inbox-update', { chatId, message, hasUnread, status, updatedAt })
  → Subscribed clients receive events without polling
inbox-update is a coarse-grained wake signal; AdminSupportDashboard re-fetches GET /api/admin/chats on every inbox-update. AdminSidebar patches hasUnread optimistically or full-refetches if the chat is new.

Channel Authorization
Route: POST /api/pusher/auth (src/app/api/pusher/auth/route.ts).

Pusher SDK posts URL-encoded body: socket_id, channel_name. The handler returns pusherServer.authorizeChannel(socket_id, channel_name) — a cryptographic HMAC signature binding the socket to the channel.

Identity chain:

Read session or admin_session Firebase cookie.
adminAuth.verifySessionCookie(sessionCookie, true).
users.findOne({ firebaseUid: decodedToken.uid }) — must exist.
Authorization rules:

Channel pattern Non-admin Admin
private-admin-inbox
403 Forbidden
Authorized
private-chat-{chatId}
chats.findOne({ _id }); deny if chat.userId !== user._id.toString()
Authorized without ownership check (admin bypass)
Invalid chatId ObjectId format → 403. Missing chat document (customer path) → 403.

Customers cannot subscribe to another tenant's conversation channel. Admins can subscribe to any private-chat-* channel once authenticated with role === 'admin'.

Message API: State Mutations
Route: POST /api/chat/message (src/app/api/chat/message/route.ts).

Request: { chatId, text, sender: MessageSender }.

Auth & tenancy: Same cookie verification as Pusher auth. Loads IChat by ObjectId(chatId). Non-admin must own chat.userId === user._id.toString(). sender === 'admin' requires user.role === 'admin'.

Persisted message:

const newMessage: IMessage = {
  id: crypto.randomUUID(),
  sender,
  text,
  createdAt: new Date(),
};
Status transition logic (atomic updateOne):

if (sender === 'client') {
  hasUnread = true;
  if (chat.status === 'bot_active') {
    newStatus = 'waiting_admin';
  }
} else if (sender === 'admin') {
  hasUnread = false;
  newStatus = 'admin_active';
}
// sender === 'bot': status/hasUnread unchanged (if ever submitted via API)
$push: { messages: newMessage } + $set: { status, hasUnread, updatedAt }.

Returns persisted IMessage as JSON 200.

Typing Indicators
Route: POST /api/chat/typing (src/app/api/chat/typing/route.ts).

Request: { chatId, isTyping: boolean, sender: string }.

Auth: Session cookie verification only (verifySessionCookie); no chat ownership re-validation on this route.

Broadcast:

pusherServer.trigger(`private-chat-${chatId}`, 'typing-update', { isTyping, sender });
Ephemeral — not persisted to MongoDB.

Admin dashboard (AdminSupportDashboard)
Outbound (admin typing): handleInputChange on first non-empty keystroke → POST /api/chat/typing with { isTyping: true, sender: "admin" }. Debounced 1500ms timeout → { isTyping: false, sender: "admin" }. Cleared on send.

Inbound (client typing): Binds typing-update on private-chat-${activeTicket._id}. Processes only data.sender === "client". Sets isRemoteUserTyping. 5-second failsafe setTimeout auto-clears stuck typing state if no isTyping: false arrives.

Renders <TypingIndicator role="client" /> when isRemoteUserTyping.

Client widget (ContactClient)
Symmetric pattern: outbound sender: "client", inbound listens for sender: "admin", same 1500ms debounce and 5s failsafe. Renders <TypingIndicator role="admin" />.

TypingIndicator component (src/components/chat/TypingIndicator.tsx) — animated three-dot bubble with role-specific avatar (UserCircle2 for client, Cat for admin/bot).

Bot → Administrator State Handoff
The handoff is a multi-stage transition from client-local bot UI to server-persisted, Pusher-connected human support.

Phase 1: bot_active (pre-escalation)
New IChat created via POST /api/chat with status: 'bot_active' (createInitialChat).
Bot dialogue runs entirely in React state via botDecisionTree (src/lib/chat/botLogic.ts). Options include ESCALATE ("Chat with Baker", "I have a specific question").
IMessage records with sender: 'bot' are local only — not written to MongoDB.
Text input disabled; UI shows "Choose an option above to continue".
GET /api/admin/chats filters status: { $in: ['waiting_admin', 'admin_active'] } — bot_active chats are invisible to admins.
Pusher subscription gated: shouldConnectToPusher = isAuthenticated && !isLocal && status !== "bot_active".
Phase 2: Escalation trigger (ESCALATE action)
In ContactClient.handleBotOptionClick case 'ESCALATE':

Requires isAuthenticated; otherwise navigates to login_required bot node.
If chat is local (isLocal) or missing_id:
POST /api/chat → persists new IChat with bot_active, returns chatId.
Client state updated: {_id: chatId, isLocal: false, status: "waiting_admin" } (optimistic status ahead of server).
If chat already persisted: client sets status: "waiting_admin" locally.
Sends escalation message via POST /api/chat/message:
{
  "chatId": "<targetChatId>",
  "text": "You're connected with the baker. Replies may take some time...",
  "sender": "client"
}
Server-side transition on that message:

chat.status === 'bot_active' → newStatus = 'waiting_admin'
hasUnread = true
Message appended to IChat.messages
inbox-update broadcast → admin sidebar badge + support page refetch
Phase 3: waiting_admin (queued for human)
Chat appears in GET /api/admin/chats aggregation (with $lookup to users for userData.name/email).
Sorted { hasUnread: -1, updatedAt: -1 }.
Client subscribes to private-chat-{chatId} (status ≠ bot_active).
Admin inbox renders status badge: waiting_admin → error styling ("waiting admin").
Admin has not yet replied; ChatStatus remains waiting_admin until first admin message.
Phase 4: admin_active (human dialogue)
Admin AdminSupportDashboard.handleSendMessage:

POST /api/chat/message
{ "chatId": "...", "text": "...", "sender": "admin" }
Server sets:

newStatus = 'admin_active'
hasUnread = false
Optimistic UI: temp client-generated ID replaced by server IMessage.id on 200. Both parties receive new-message via Pusher on the per-chat channel.

Phase 5: Resolution
PATCH /api/chat with { chatId, status: "resolved" } — admin support page or client widget. Sets IChat.status = 'resolved'. Ticket removed from admin list client-side. No Pusher broadcast on resolve (clients discover on next fetch or channel unsubscribe).

Concurrent ticket limit: POST /api/chat enforces max 3 active chats per user (status ∈ ['bot_active', 'waiting_admin', 'admin_active']) → 429.

Admin Support Dashboard
Page: src/app/bakery-manufacturing-orders/support/page.tsx (AdminSupportDashboard).

Initial load: GET /api/admin/chats → PopulatedAdminChat[] (extends IChat with userData from aggregation).

Layout: Split-pane — left inbox (1/3), right thread (2/3). Mobile stack via isViewingThread.

Pusher subscriptions:

Global: private-admin-inbox → inbox-update → fetchTickets().
Per-thread: private-chat-${activeTicket._id} → new-message (dedupe by IMessage.id), typing-update (client only).
Unread handling: selectTicket clears hasUnread optimistically and dispatches CustomEvent("support-ticket-read", { detail: { chatId } }) for AdminSidebar badge sync.

Message rendering: sender === "admin" → right-aligned primary bubble. sender === "bot" → left-aligned with "Automated Bot" label. sender === "client" → left-aligned with user avatar.

Resolve: PATCH /api/chat { status: "resolved" } → removes ticket from local state, closes thread.

Data Stores & API Surface
Endpoint Method Role Purpose
/api/chat
GET
Client
List user's non-resolved IChat[]
/api/chat
POST
Client
Create IChat (bot_active)
/api/chat
PATCH
Client/Admin
Set status: 'resolved'
/api/chat/message
POST
Client/Admin
Persist IMessage, mutate ChatStatus, trigger Pusher
/api/chat/typing
POST
Client/Admin
Ephemeral typing-update broadcast
/api/pusher/auth
POST
Client/Admin
Private channel HMAC authorization
/api/admin/chats
GET
Admin
Active tickets (waiting_admin, admin_active) with user lookup
MongoDB collection: chats via getChatCollection() (Collection<IChat>). Messages are embedded arrays, not a separate collection.
