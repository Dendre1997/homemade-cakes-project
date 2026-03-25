export type BotActionType = 'NAVIGATE' | 'SHOW_INFO' | 'ESCALATE' | 'LINK' | 'RESOLVE' | 'FETCH_FLAVORS';

export interface BotOption {
  label: string;
  action: BotActionType;
  nextNodeId?: string;
  infoKey?: 'delivery' | 'pickup' | 'flavors' | 'sizes'; // Explicitly map to contextual lookups
  url?: string;
  categoryId?: string; // For dynamic MongoDB fetching
}

export interface BotNode {
  id: string;
  botText: string;
  options: BotOption[];
}

export const botDecisionTree: Record<string, BotNode> = {
  greeting: {
    id: 'greeting',
    botText: "", // We will overwrite this dynamically in React using support.botGreetingMessage!
    options: [
      { label: "Explore Menu & Custom Orders", action: 'NAVIGATE', nextNodeId: 'explore_menu_and_orders' },
      { label: "Delivery & Pickup Info", action: 'NAVIGATE', nextNodeId: 'logistics_info' },
      { label: "Chat with Baker", action: 'ESCALATE' }
    ]
  },
  explore_menu_and_orders: {
    id: 'explore_menu_and_orders',
    botText: "Awesome! Whether you're looking for our daily treats or a custom masterpiece (which requires 3 days' notice), I've got you covered. What would you like to explore?",
    options: [
      { label: "View Flavors & Fillings", action: 'SHOW_INFO', infoKey: 'flavors' }, 
      { label: "Cake Sizing Guide", action: 'SHOW_INFO', infoKey: 'sizes' },
      { label: "I have a specific question", action: 'ESCALATE' },
      { label: "View Full Menu", action: 'LINK', url: '/products' },
      { label: "Go to Custom Order Form", action: 'LINK', url: '/custom-order' },
      { label: "Start Over", action: 'NAVIGATE', nextNodeId: 'greeting' }
    ]
  },
  logistics_info: {
    id: 'logistics_info',
    botText: "We offer both delivery and pickup options! Which one would you like to know more about?",
    options: [
      { label: "Delivery Info", action: 'SHOW_INFO', infoKey: 'delivery' },
      { label: "Pickup Info", action: 'SHOW_INFO', infoKey: 'pickup' },
      { label: "Go Back", action: 'NAVIGATE', nextNodeId: 'greeting' }
    ]
  },
  logistics_followup: {
    id: 'logistics_followup',
    botText: "Do you also need advice on how to transport or store your cake safely?",
    options: [
      { label: "Transportation Instructions", action: 'NAVIGATE', nextNodeId: 'transport_info' },
      { label: "Storage Instructions", action: 'NAVIGATE', nextNodeId: 'storage_info' },
      { label: "No, thank you", action: 'NAVIGATE', nextNodeId: 'anything_else' }
    ]
  },
  transport_info: {
    id: 'transport_info',
    botText: "Pick up and carry the cake box from the bottom. Always keep the cake level, during travel, storage, and display. Transport the cake in an air conditioned vehicle only.",
    options: [
      { label: "Storage Instructions", action: 'NAVIGATE', nextNodeId: 'storage_info' },
      { label: "Go Back", action: 'NAVIGATE', nextNodeId: 'logistics_followup' },
      { label: "Start Over", action: 'NAVIGATE', nextNodeId: 'greeting' }
    ]
  },
  storage_info: {
    id: 'storage_info',
    botText: "Store the cake in the fridge before the event. Remove the cake from the refrigerator 1-2hours before serving. Use sturdy cake stand at least 1 inch larger then the cake board. Store any leftover cake in a sealed container in the refrigerator. Spongy cakes expire after 3-4 days. Cream, custard, or fresh fruit cakes expire after 1-2 days",
    options: [
      { label: "Transportation Instructions", action: 'NAVIGATE', nextNodeId: 'transport_info' },
      { label: "Go Back", action: 'NAVIGATE', nextNodeId: 'logistics_followup' },
      { label: "Start Over", action: 'NAVIGATE', nextNodeId: 'greeting' }
    ]
  },
  anything_else: {
    id: 'anything_else',
    botText: "Is there anything else I can help you with today?",
    options: [
      { label: "View Full Menu", action: 'LINK', url: '/products' },
      { label: "Go to Custom Order Form", action: 'LINK', url: '/custom-order' },
      { label: "Start Over", action: 'NAVIGATE', nextNodeId: 'greeting' },
      { label: "No, thank you", action: 'RESOLVE' }
    ]
  },
  login_required: {
    id: 'login_required',
    botText: "To chat directly with Baker please log in or sign up!",
    options: [
      { label: "Log In / Sign Up", action: 'LINK', url: '/login?callbackUrl=/contact' },
      { label: "Go Back", action: 'NAVIGATE', nextNodeId: 'greeting' }
    ]
  }
};
