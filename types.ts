export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
}

// Map of itemId -> array of person names assigned to it
export interface Assignments {
  [itemId: string]: string[];
}

export interface PersonTotal {
  name: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: ReceiptItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface AssignmentAction {
  itemIds: string[];
  people: string[];
  action: 'assign' | 'unassign';
}

export interface ChatResponse {
  reply: string;
  assignments: AssignmentAction[];
}
