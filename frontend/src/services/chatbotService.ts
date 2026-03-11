import api from './api';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: Array<{
    content: string;
    metadata: any;
    score: number;
  }>;
}

export interface Conversation {
  id: string;
  lastActivity: string;
  messageCount: number;
  preview: string;
  departmentId?: string;
  role?: string;
}

export interface ChatbotResponse {
  conversation_id: string;
  message: string;
  timestamp: string;
  sources?: Array<{
    content: string;
    metadata: any;
    score: number;
  }>;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

/**
 * Send a message to the RAG chatbot.
 * 
 * Authentication (user_id, department_id, role) is handled automatically
 * via JWT token in the Authorization header (set by the api interceptor).
 * The backend extracts user context from the JWT token, so we only need
 * to send the message content and optional conversation_id.
 */
export const sendMessage = async (
  message: string,
  conversationId?: string
): Promise<ChatbotResponse> => {
  const response = await api.post<ChatbotResponse>('/rag/chat', {
    message: message.trim(),
    conversation_id: conversationId
  });

  return response.data;
};

/**
 * Get user's conversations
 */
export const getConversations = async (
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<ConversationsResponse> => {
  const response = await api.get<ConversationsResponse>(
    `/rag/conversations?page=${page}&limit=${limit}`
  );

  return response.data;
};

/**
 * Get specific conversation details
 */
export const getConversation = async (
  conversationId: string,
  userId: string
): Promise<{
  id: string;
  messages: ChatMessage[];
  lastActivity: string;
  departmentId?: string;
  role?: string;
}> => {
  const response = await api.get(`/rag/conversation/${conversationId}`);

  return response.data;
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  await api.delete(`/rag/conversation/${conversationId}`);
};


/**
 * Check RAG service health
 */
export const getChatbotHealth = async (): Promise<{
  status: string;
  timestamp: string;
  components: {
    mongodb: string;
    embeddings: string;
    llm: string;
  };
}> => {
  const response = await api.get('/rag/health');

  return response.data;
};
