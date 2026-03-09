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
  AlertCircle,
  Bot,
  Search
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../ChatMessage';
import { useChatbot } from '../../../context/ChatbotContext';
import { useAuth } from '../../../context/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Quick suggestion chips based on user role
const ROLE_SUGGESTIONS: Record<string, string[]> = {
  employee: [
    'Hôm nay tôi đã chấm công chưa?',
    'Tôi còn bao nhiêu ngày phép?',
    'Thông tin cá nhân của tôi',
    'Đơn từ của tôi',
    'Lịch làm việc tuần này',
    'Lương tháng này',
  ],
  supervisor: [
    'Nhân viên phòng ban đã chấm công hôm nay?',
    'Đơn nào đang chờ duyệt?',
    'Thống kê chấm công phòng ban',
    'Danh sách nhân viên phòng ban',
    'Ai đi muộn hôm nay?',
    'Báo cáo tuần này',
  ],
  manager: [
    'Thống kê nhân viên phòng ban',
    'Đơn nào đang chờ duyệt?',
    'Báo cáo chấm công hôm nay',
    'Danh sách nhân viên',
    'Hiệu suất phòng ban',
    'Ai đi muộn hôm nay?',
  ],
  hr_manager: [
    'Có bao nhiêu nhân viên?',
    'Thống kê chấm công hôm nay',
    'Đơn nào đang chờ duyệt?',
    'Tổng quỹ lương tháng này',
    'Danh sách phòng ban',
    'Báo cáo nhân sự',
  ],
  admin: [
    'Có bao nhiêu nhân viên?',
    'Danh sách chi nhánh',
    'Thống kê chấm công hôm nay',
    'Tổng quỹ lương',
    'Danh sách phòng ban',
    'Báo cáo tổng quan',
  ],
  super_admin: [
    'Tổng quan hệ thống',
    'Có bao nhiêu nhân viên?',
    'Danh sách chi nhánh',
    'Thống kê chấm công hôm nay',
    'Tổng quỹ lương',
    'Danh sách phòng ban',
  ],
};

const ChatbotPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

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
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get suggestions for current user role
  const suggestions = user?.role
    ? ROLE_SUGGESTIONS[user.role] || ROLE_SUGGESTIONS.employee
    : ROLE_SUGGESTIONS.employee;

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    await sendChatMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    setInputMessage('');
    await sendChatMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations by search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c =>
        (c.preview || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

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
    <div className="flex h-[calc(100vh-12rem)] bg-[var(--shell)] rounded-xl overflow-hidden border border-[var(--border)]">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-main)]">
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

          {/* Search conversations */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-sub)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chatbot.searchConversations', 'Search conversations...')}
              className="pl-8 h-8 text-sm bg-[var(--shell)] border-[var(--border)]"
            />
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
              <Loader2 className="w-6 h-6 animate-spin text-[var(--text-sub)]" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-sub)]">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery
                  ? t('chatbot.noSearchResults', 'No conversations found')
                  : t('chatbot.noConversations', 'No conversations yet')
                }
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group p-3 rounded-lg mb-2 cursor-pointer transition-colors border ${
                    currentConversation?.id === conversation.id
                      ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30'
                      : 'border-transparent hover:bg-[var(--shell)]'
                  }`}
                  onClick={() => loadConversation(conversation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate text-[var(--text-main)]">
                          {conversation.preview || t('chatbot.newChat', 'New Chat')}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {conversation.messageCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--text-sub)]">
                        {formatConversationDate(conversation.lastActivity)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-opacity"
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
      <div className="flex-1 flex flex-col bg-[var(--shell)]">
        {/* Chat Header */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-main)]">
                {t('chatbot.title', 'AI Assistant')}
              </h1>
              <p className="text-sm text-[var(--text-sub)]">
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
                className="hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
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
              <Bot className="w-16 h-16 text-[var(--text-sub)] mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
                {t('chatbot.welcome', 'Welcome to AI Assistant')}
              </h3>
              <p className="text-[var(--text-sub)] max-w-md mb-6">
                {t('chatbot.welcomeMessage', 'Ask me about your attendance, payroll, leave requests, or request reports. I\'m here to help!')}
              </p>

              {/* Suggestion chips for empty state */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                    className="text-sm px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
                <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex gap-3 max-w-[85%] sm:max-w-[70%] items-start">
                    <Avatar className="w-10 h-10 shadow-sm border border-[var(--border)]">
                      <AvatarFallback className="bg-[var(--primary)] text-white">
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-medium text-[var(--text-sub)] mb-1 ml-1 flex items-center gap-1">
                        SmartBot <div className="w-1 h-1 rounded-full bg-[var(--primary)] animate-pulse" />
                      </span>
                      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg rounded-tl-none p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-[var(--primary)] opacity-60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-[var(--primary)] opacity-80 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce"></span>
                          </div>
                          <span className="text-sm font-medium text-[var(--text-sub)] italic">
                            SmartBot đang suy nghĩ...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-[var(--surface)] border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-2 bg-[var(--shell)] border border-[var(--border)] rounded-full p-1.5 pr-2 focus-within:ring-1 focus-within:ring-[var(--primary)] focus-within:border-[var(--primary)] transition-all max-w-4xl mx-auto">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('chatbot.placeholder', 'Type your message...')}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-[var(--text-main)] placeholder-[var(--text-sub)] px-4 h-10"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
              className="h-10 w-10 rounded-full p-0 bg-[var(--primary)] hover:bg-[var(--primary)]/90 shrink-0 transition-transform active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[var(--text-sub)]">
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
