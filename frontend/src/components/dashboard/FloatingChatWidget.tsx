import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Minimize2, Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbot } from '@/context/ChatbotContext';
import { useAuth } from '@/context/AuthContext';
import { ChatMessage } from './ChatMessage';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { getRoleName, getRoleScope } from '@/utils/roles';

interface FloatingChatWidgetProps {}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const {
    messages,
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    // Reset unread count when opening chat
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


  // Get user role scope for display
  const userRoleScope = user?.role ? getRoleScope(user.role) : 'own';

  return (
    <>
      {/* Chat Bubble Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div
          title={
            isChatbotAvailable
              ? t('dashboard:floatingWidget.tooltip', 'Open AI Assistant')
              : t('dashboard:floatingWidget.disabledTooltip', 'AI Assistant is currently unavailable')
          }
        >
          <Button
            onClick={handleToggleChat}
            disabled={!isChatbotAvailable}
            className={`relative h-14 w-14 rounded-full shadow-2xl transition-all duration-200 ${
              isChatbotAvailable
                ? 'bg-[var(--primary)] hover:bg-[var(--primary)]/90 hover:shadow-3xl'
                : 'bg-gray-400 cursor-not-allowed opacity-50'
            }`}
            aria-label={
              isChatbotAvailable
                ? t('dashboard:floatingWidget.tooltip', 'Open AI Assistant')
                : t('dashboard:floatingWidget.disabledTooltip', 'AI Assistant is currently unavailable')
            }
          >
          <Bot className="h-6 w-6 text-white" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
          </Button>
        </div>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="w-96 h-[600px] bg-[var(--surface)] border-[var(--border)] shadow-2xl backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--text-main)]">
                      {t('dashboard:floatingWidget.title', 'AI Assistant')}
                    </h3>
                    {user?.role && (
                      <p className="text-xs text-[var(--text-sub)]">
                        {t('dashboard:floatingWidget.roleInfo', 'You can view: {{scope}}', {
                          scope: userRoleScope === 'all' ? t('common:roles.all', 'all data') :
                                userRoleScope === 'department' ? t('common:roles.department', 'department data') :
                                t('common:roles.own', 'your own data')
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMinimize}
                    className="h-8 w-8 p-0 hover:bg-[var(--shell)]"
                    aria-label={t('dashboard:floatingWidget.minimize', 'Minimize')}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-8 w-8 p-0 hover:bg-[var(--shell)]"
                    aria-label={t('dashboard:floatingWidget.close', 'Close')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[480px]">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-[var(--text-sub)] mx-auto mb-3" />
                      {isChatbotAvailable ? (
                        <p className="text-[var(--text-sub)]">
                          {t('dashboard:chatbot.welcome', 'Hi! I\'m your AI assistant. How can I help you today?')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[var(--text-sub)] font-medium">
                            {t('dashboard:chatbot.unavailable', 'AI Assistant Unavailable')}
                          </p>
                          <p className="text-[var(--text-sub)] text-sm">
                            {t('dashboard:chatbot.unavailableMessage', 'The AI assistant is currently not configured or disabled. Please contact your administrator.')}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <ChatMessage
                        key={index}
                        message={message}
                      />
                    ))
                  )}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                      </div>
                      <div className="bg-[var(--shell)] rounded-lg px-3 py-2">
                        <p className="text-sm text-[var(--text-sub)]">
                          {t('dashboard:floatingWidget.typing', 'AI is thinking...')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input Area */}
              {!isMinimized && (
                <div className="p-4 border-t border-[var(--border)]">
                  {isChatbotAvailable ? (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('dashboard:floatingWidget.placeholder', 'Type your message...')}
                        className="flex-1 bg-[var(--background)] border-[var(--border)] text-[var(--text-main)] placeholder-[var(--text-sub)]"
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        size="sm"
                        className="h-10 w-10 p-0 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                        aria-label={t('dashboard:floatingWidget.send', 'Send')}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-[var(--text-sub)] text-sm">
                        {t('dashboard:chatbot.inputDisabled', 'Chat input is disabled')}
                      </p>
                    </div>
                  )}
                  {isChatbotAvailable && (
                    <p className="text-xs text-[var(--text-sub)] mt-1">
                      {t('common:pressEnter', 'Press Enter to send, Shift+Enter for new line')}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />
      )}
    </>
  );
};
