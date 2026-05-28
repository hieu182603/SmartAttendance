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
import { UserRole } from '@/utils/roles';
import { toast } from 'sonner';

interface ChatbotContextType {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
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

const ACTIVE_CONVERSATION_STORAGE_KEY = 'smartattendance_active_conversation_id';

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

  // Check if chatbot is available based on config, health, and user role
  const isChatbotAvailable = React.useMemo(() => {
    // 1. Check if user is TRIAL (AI features disabled for TRIAL)
    if (user?.role === 'TRIAL') {
      return false;
    }

    // 2. Default to enabled if environment variable is not set or is 'true'
    const isEnabled = import.meta.env.VITE_CHATBOT_ENABLED !== 'false';

    // 3. Require successful health check before enabling chat UI
    if (chatbotHealth === null) {
      return false; // Don't assume available until health check runs
    }

    // 4. Check health status - allow chatbot to work if at least MongoDB is connected
    const isHealthy = chatbotHealth.status === 'healthy' &&
      chatbotHealth.components?.mongodb === 'connected';

    return isEnabled && isHealthy;
  }, [chatbotHealth, user?.role]);

  // Check chatbot health
  const checkChatbotHealth = async () => {
    try {
      const health = await getChatbotHealth();
      setChatbotHealth(health);
    } catch (error) {
      const err = error as Error & { name?: string; code?: string; message?: string }
      // Only log non-network errors (network errors are expected when service is down)
      if (err?.message !== 'Network Error' && err?.code !== 'ERR_NETWORK' && err?.name !== 'NetworkError') {
        console.error('Failed to check chatbot health:', error);
      }
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

  const isTrialUser = user?.role === UserRole.TRIAL;

  // Check chatbot health when user is authenticated (skip for trial)
  useEffect(() => {
    if (user && !isTrialUser) {
      checkChatbotHealth().catch(() => {
        // Error already handled in checkChatbotHealth
      });
    }
  }, [user, isTrialUser]);

  // Load conversations when user is authenticated (skip for trial)
  useEffect(() => {
    if (user && !isTrialUser) {
      loadConversations().catch(() => {
        // Error already handled in loadConversations
      });
    } else if (!user) {
      // Clear conversations when user logs out
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  }, [user, isTrialUser]);

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingConversations(true);
      const response = await getConversations(user.id);
      const convs = response.conversations;
      setConversations(convs);

      // Restore last active conversation from localStorage if available
      const savedConversationId = localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
      if (savedConversationId && !currentConversation) {
        const matched = convs.find(c => c.id === savedConversationId);
        if (matched) {
          await loadConversation(matched);
        } else {
          // stale ID in storage
          localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
        }
      }
    } catch (error) {
      const err = error as Error & { name?: string; code?: string; message?: string }
      // Only show error toast for non-network errors (network errors are expected when service is down)
      if (err?.message !== 'Network Error' && err?.code !== 'ERR_NETWORK' && err?.name !== 'NetworkError') {
        console.error('Error loading conversations:', error);
        toast.error('Failed to load conversations');
      }
      // Silently fail for network errors - service is just unavailable
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (conversation: Conversation) => {
    if (!user?.id) return;

    try {
      setCurrentConversation(conversation);
      localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, conversation.id);

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
    localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
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
      const response = await sendMessage(messageToSend, currentConversation?.id);

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
          preview: messageToSend.substring(0, 100)
        };
        setCurrentConversation(newConv);
        localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, response.conversation_id);
        // Reload conversations to include the new one
        loadConversations();
      } else {
        // Update current conversation preview
        setCurrentConversation(prev => prev ? {
          ...prev,
          lastActivity: response.timestamp,
          messageCount: prev.messageCount + 2,
          preview: messageToSend.substring(0, 100)
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
        localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
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
    setMessages,
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
