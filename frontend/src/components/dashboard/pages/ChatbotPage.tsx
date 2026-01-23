import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../ChatMessage';
import { useChatbot } from '../../../context/ChatbotContext';

const ChatbotPage: React.FC = () => {
  const { t } = useTranslation();

  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isLoadingConversations,
    loadConversations,
    loadConversation,
    createNewConversation,
    sendChatMessage,
    deleteChatConversation
  } = useChatbot();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    await sendChatMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  const formatConversationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('chatbot.conversations', 'Conversations')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={createNewConversation}
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={createNewConversation}
            className="w-full"
            variant="default"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('chatbot.newConversation', 'New Conversation')}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('chatbot.noConversations', 'No conversations yet')}</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${currentConversation?.id === conversation.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                    } border`}
                  onClick={() => loadConversation(conversation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {conversation.preview || t('chatbot.newChat', 'New Chat')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {conversation.messageCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatConversationDate(conversation.lastActivity)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatConversation(conversation.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                {t('chatbot.title', 'AI Assistant')}
              </h1>
              <p className="text-sm text-gray-600">
                {currentConversation
                  ? t('chatbot.conversationWith', 'Conversation')
                  : t('chatbot.startConversation', 'Start a new conversation')
                }
              </p>
            </div>
            {currentConversation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteChatConversation(currentConversation.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete', 'Delete')}
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('chatbot.welcome', 'Welcome to AI Assistant')}
              </h3>
              <p className="text-gray-600 max-w-md">
                {t('chatbot.welcomeMessage', 'Ask me about your attendance, payroll, leave requests, or request reports. I\'m here to help!')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.timestamp || index}
                  message={message}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-600">
                        {t('chatbot.typing', 'AI is thinking...')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('chatbot.placeholder', 'Type your message...')}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <AlertCircle className="w-3 h-3" />
            <span>
              {t('chatbot.hint', 'Try asking: "How many days have I worked this month?" or "Generate payroll report"')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
