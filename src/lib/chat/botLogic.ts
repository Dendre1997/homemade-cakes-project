export type BotActionType = 'NAVIGATE' | 'SHOW_INFO' | 'ESCALATE' | 'LINK' | 'RESOLVE';

export interface BotOption {
  label: string;
  action: BotActionType;
  nextNodeId?: string;
  infoKey?: 'delivery' | 'pickup'; // Explicitly map to the two checkout concepts
  url?: string;
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
      { label: "Order a Custom Cake", action: 'NAVIGATE', nextNodeId: 'custom_cake_info' },
      { label: "Delivery Info", action: 'SHOW_INFO', infoKey: 'delivery' },
      { label: "Pickup Info", action: 'SHOW_INFO', infoKey: 'pickup' },
      { label: "Chat with Baker", action: 'ESCALATE' }
    ]
  },
  custom_cake_info: {
    id: 'custom_cake_info',
    botText: "Custom cakes require at least 3 days' notice. To get an accurate quote and secure your date, please fill out our detailed order form.",
    options: [
      { label: "Go to Custom Order Form", action: 'LINK', url: '/custom-order' },
      { label: "I have a specific question", action: 'ESCALATE' },
      { label: "Start Over", action: 'NAVIGATE', nextNodeId: 'greeting' }
    ]
  },
  anything_else: {
    id: 'anything_else',
    botText: "Is there anything else I can help you with?",
    options: [
      { label: "Start Over", action: 'NAVIGATE', nextNodeId: 'greeting' },
      { label: "No, thank you", action: 'RESOLVE' }
    ]
  }
};
