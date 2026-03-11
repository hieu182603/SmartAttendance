import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Minimize2, Send, Loader2, Sparkles, MessageSquare, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbot } from '@/context/ChatbotContext';
import { useAuth } from '@/context/AuthContext';
import { ChatMessage } from './ChatMessage';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getRoleName, getRoleScope } from '@/utils/roles';

// Quick suggestion chips based on user role
const ROLE_SUGGESTIONS: Record<string, string[]> = {
  employee: [
    'Hôm nay tôi đã chấm công chưa?',
    'Tôi còn bao nhiêu ngày phép?',
    'Thông tin cá nhân của tôi',
    'Đơn từ của tôi',
  ],
  supervisor: [
    'Nhân viên phòng ban đã chấm công hôm nay?',
    'Đơn nào đang chờ duyệt?',
    'Thống kê chấm công phòng ban',
    'Danh sách nhân viên phòng ban',
  ],
  manager: [
    'Thống kê nhân viên phòng ban',
    'Đơn nào đang chờ duyệt?',
    'Báo cáo chấm công hôm nay',
    'Danh sách nhân viên',
  ],
  hr_manager: [
    'Có bao nhiêu nhân viên?',
    'Thống kê chấm công hôm nay',
    'Đơn nào đang chờ duyệt?',
    'Tổng quỹ lương tháng này',
  ],
  admin: [
    'Có bao nhiêu nhân viên?',
    'Danh sách chi nhánh',
    'Thống kê chấm công hôm nay',
    'Tổng quỹ lương',
  ],
  super_admin: [
    'Tổng quan hệ thống',
    'Có bao nhiêu nhân viên?',
    'Danh sách chi nhánh',
    'Thống kê chấm công hôm nay',
  ],
};

interface FloatingChatWidgetProps { }

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const {
    messages,
    setMessages,
    isLoading,
    sendChatMessage,
    createNewConversation,
    isChatbotAvailable,
    chatbotHealth
  } = useChatbot();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, isOpen]);

  // Show welcome message when chat is opened for the first time
  useEffect(() => {
    if (isOpen && !hasOpenedBefore && isChatbotAvailable && messages.length === 0) {
      const userName = user?.name || t('common:there', 'there');
      const welcomeMessage = t('dashboard:chatbot.welcomeWithName', 'Hi {{name}}! I\'m your AI assistant. What would you like to know?', { name: userName });

      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString()
      }]);
      setHasOpenedBefore(true);
    }
  }, [isOpen, hasOpenedBefore, isChatbotAvailable, messages.length, user, t]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    if (!isOpen) {
      setIsOpen(true);
      setUnreadCount(0);
    }

    await sendChatMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
      setUnreadCount(0);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    setInputValue('');
    await sendChatMessage(suggestion);
  };

  // Get suggestions for current user role
  const suggestions = user?.role
    ? ROLE_SUGGESTIONS[user.role] || ROLE_SUGGESTIONS.employee
    : ROLE_SUGGESTIONS.employee;

  // Get user role scope for display
  const userRoleScope = user?.role ? getRoleScope(user.role as import('@/utils/roles').UserRoleType) : 'own';

  return (
    <>
      {/* Chat Bubble Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div
          title={
            isChatbotAvailable
              ? t('dashboard:floatingWidget.tooltip', 'Open AI Assistant')
              : t('dashboard:floatingWidget.disabledTooltip', 'AI Assistant is currently unavailable')
          }
          className="relative group"
        >
          <Button
            onClick={handleToggleChat}
            disabled={!isChatbotAvailable}
            className={`relative h-14 w-14 rounded-full shadow-lg transition-all duration-200 border-0 ${isChatbotAvailable
              ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 hover:shadow-xl hover:shadow-violet-500/25 hover:scale-105 active:scale-95'
              : 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50'
              }`}
            aria-label={
              isChatbotAvailable
                ? t('dashboard:floatingWidget.tooltip', 'Open AI Assistant')
                : t('dashboard:floatingWidget.disabledTooltip', 'AI Assistant is currently unavailable')
            }
          >
            {isOpen ? (
              <MessageSquare className="h-6 w-6 text-white" />
            ) : (
              <Bot className="h-6 w-6 text-white" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="w-[400px] max-h-[calc(100vh-10rem)] h-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/10 dark:shadow-black/30 flex flex-col overflow-hidden rounded-2xl">

              {/* Header */}
              <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      SmartBot
                    </h3>
                    <p className="text-[11px] text-white/70">
                      {user?.role ? (
                        t('dashboard:floatingWidget.roleInfo', 'You can view: {{scope}}', {
                          scope: userRoleScope === 'all' ? t('common:roles.all', 'all data') :
                            userRoleScope === 'department' ? t('common:roles.department', 'department data') :
                              t('common:roles.own', 'your own data')
                        })
                      ) : (
                        t('dashboard:floatingWidget.subtitle', 'AI-powered assistant')
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewConversation}
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/15 rounded-lg"
                    title={t('dashboard:floatingWidget.newChat', 'New conversation')}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMinimize}
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/15 rounded-lg"
                    aria-label={t('dashboard:floatingWidget.minimize', 'Minimize')}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/15 rounded-lg"
                    aria-label={t('dashboard:floatingWidget.close', 'Close')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      {isChatbotAvailable ? (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center mb-4">
                            <Bot className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            {t('dashboard:chatbot.welcomeTitle', 'How can I help you?')}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 max-w-[260px]">
                            {t('dashboard:chatbot.welcomeDesc', 'Ask about attendance, leave, payroll, or any HR-related topic.')}
                          </p>
                          {/* Suggestion chips */}
                          <div className="flex flex-col gap-2 w-full max-w-[300px]">
                            {suggestions.slice(0, 4).map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSuggestionClick(suggestion)}
                                disabled={isLoading}
                                className="text-xs text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
                              >
                                <span className="text-indigo-400 group-hover:text-indigo-500 mr-1.5">→</span>
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                            <Bot className="h-7 w-7 text-slate-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            {t('dashboard:chatbot.unavailable', 'AI Assistant Unavailable')}
                          </p>
                          <p className="text-slate-400 dark:text-slate-500 text-xs">
                            {t('dashboard:chatbot.unavailableMessage', 'The AI assistant is currently not configured or disabled. Please contact your administrator.')}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <ChatMessage
                          key={index}
                          message={message}
                        />
                      ))}

                      {/* Typing indicator */}
                      {isLoading && (
                        <div className="flex items-start gap-2.5 mb-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]"></span>
                              </div>
                              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                                {t('dashboard:floatingWidget.typing', 'Đang suy nghĩ...')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input Area */}
              {!isMinimized && isChatbotAvailable && (
                <div className="flex-none p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 pl-1.5">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={t('dashboard:floatingWidget.placeholder', 'Nhập tin nhắn...')}
                      className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 px-2.5 h-9"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      size="sm"
                      className="h-8 w-8 rounded-lg p-0 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-600 dark:disabled:to-slate-600 shrink-0 transition-all shadow-sm"
                      aria-label={t('dashboard:floatingWidget.send', 'Send')}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 text-white ml-0.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat disabled message */}
              {!isMinimized && !isChatbotAvailable && (
                <div className="flex-none p-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center py-2">
                    <p className="text-slate-400 dark:text-slate-500 text-xs">
                      {t('dashboard:chatbot.inputDisabled', 'Chat input is disabled')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={handleClose}
        />
      )}
    </>
  );
};
