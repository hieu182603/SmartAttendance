import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  getChatbotHealth,
  ChatMessage,
  Conversation
} from '../services/chatbotService';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface ChatbotContextType {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingConversations: boolean;
  isChatbotAvailable: boolean;
  chatbotHealth: {
    status: string;
    timestamp: string;
    components: {
      mongodb: string;
      embeddings: string;
      llm: string;
    };
  } | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadConversation: (conversation: Conversation) => Promise<void>;
  createNewConversation: () => void;
  sendChatMessage: (message: string) => Promise<void>;
  deleteChatConversation: (conversationId: string) => Promise<void>;
  checkChatbotHealth: () => Promise<void>;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};

interface ChatbotProviderProps {
  children: React.ReactNode;
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [chatbotHealth, setChatbotHealth] = useState<{
    status: string;
    timestamp: string;
    components: {
      mongodb: string;
      embeddings: string;
      llm: string;
    };
  } | null>(null);

  // Check if chatbot is available based on config and health
  const isChatbotAvailable = React.useMemo(() => {
    // Default to enabled if environment variable is not set or is 'true'
    const isEnabled = import.meta.env.VITE_CHATBOT_ENABLED !== 'false';

    // Require successful health check before enabling chat UI
    if (chatbotHealth === null) {
      return false; // Don't assume available until health check runs
    }

    const isHealthy = chatbotHealth.status === 'healthy' &&
      chatbotHealth.components?.mongodb === 'connected' &&
      chatbotHealth.components?.embeddings === 'working' &&
      chatbotHealth.components?.llm === 'working';
    return isEnabled && isHealthy;
  }, [chatbotHealth]);

  // Check chatbot health
  const checkChatbotHealth = async () => {
    try {
      const health = await getChatbotHealth();
      setChatbotHealth(health);
    } catch (error) {
      console.error('Failed to check chatbot health:', error);
      // Set clear unavailable state when health check fails
      setChatbotHealth({
        status: 'unavailable',
        timestamp: new Date().toISOString(),
        components: {
          mongodb: 'error',
          embeddings: 'error',
          llm: 'error'
        }
      });
    }
  };

  // Check chatbot health when user is authenticated
  useEffect(() => {
    if (user) {
      checkChatbotHealth();
    }
  }, [user]);

  // Load conversations when user is authenticated
  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      // Clear conversations when user logs out
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingConversations(true);
      const response = await getConversations(user.id);
      setConversations(response.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (conversation: Conversation) => {
    if (!user?.id) return;

    try {
      setCurrentConversation(conversation);
      const response = await getConversation(conversation.id, user.id);
      setMessages(response.messages);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const createNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  const sendChatMessage = async (message: string) => {
    if (!message.trim() || isLoading || !user?.id) return;

    const messageToSend = message.trim();

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(messageToSend, currentConversation?.id, {
        userId: user.id,
        departmentId: user.department,
        role: user.role
      });

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
        sources: response.sources
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If this was a new conversation, update the current conversation
      if (!currentConversation) {
        const newConv: Conversation = {
          id: response.conversation_id,
          lastActivity: response.timestamp,
          messageCount: 2,
          preview: response.message.substring(0, 100)
        };
        setCurrentConversation(newConv);
        // Reload conversations to include the new one
        loadConversations();
      } else {
        // Update current conversation preview
        setCurrentConversation(prev => prev ? {
          ...prev,
          lastActivity: response.timestamp,
          messageCount: prev.messageCount + 2,
          preview: response.message.substring(0, 100)
        } : null);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');

      // Remove the user message if sending failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChatConversation = async (conversationId: string) => {
    if (!user?.id) return;

    try {
      await deleteConversation(conversationId, user.id);
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };


  const value: ChatbotContextType = {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isLoadingConversations,
    isChatbotAvailable,
    chatbotHealth,
    loadConversations,
    loadConversation,
    createNewConversation,
    sendChatMessage,
    deleteChatConversation,
    checkChatbotHealth
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
};
