import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Sparkles, RotateCcw, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbot } from '@/context/ChatbotContext';
import { useAuth } from '@/context/AuthContext';
import { ChatMessage } from './ChatMessage';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  employee: [
    'Tôi đã chấm công hôm nay chưa?',
    'Tôi còn bao nhiêu ngày phép?',
    'Xem thông tin cá nhân của tôi',
    'Xem danh sách đơn từ của tôi',
  ],
  supervisor: [
    'Nhân viên phòng ban đã chấm công chưa?',
    'Có đơn nào đang chờ duyệt không?',
    'Thống kê chấm công phòng ban',
    'Danh sách nhân viên phòng ban',
  ],
  manager: [
    'Thống kê nhân viên phòng ban',
    'Các đơn đang chờ phê duyệt',
    'Báo cáo chấm công hôm nay',
    'Hiển thị danh sách nhân viên',
  ],
  hr_manager: [
    'Công ty có bao nhiêu nhân viên?',
    'Tổng quan chấm công hôm nay',
    'Phê duyệt các đơn đang chờ',
    'Dự toán quỹ lương tháng này',
  ],
  admin: [
    'Thống kê số lượng nhân viên',
    'Danh sách các chi nhánh',
    'Báo cáo vận hành hôm nay',
    'Thông tin về quỹ lương',
  ],
  super_admin: [
    'Báo cáo tổng quan hệ thống',
    'Tổng số nhân viên hiện tại',
    'Quản lý danh sách chi nhánh',
    'Sức khỏe hệ thống chatbot',
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
  } = useChatbot();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, isOpen]);

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
      setUnreadCount(0);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    setInputValue('');
    await sendChatMessage(suggestion);
  };

  const suggestions = user?.role
    ? ROLE_SUGGESTIONS[user.role] || ROLE_SUGGESTIONS.employee
    : ROLE_SUGGESTIONS.employee;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div
          title={isChatbotAvailable ? t('dashboard:floatingWidget.tooltip', 'Open AI Assistant') : t('dashboard:floatingWidget.disabledTooltip', 'AI Assistant is currently unavailable')}
          className="relative group"
        >
          <Button
            onClick={handleToggleChat}
            disabled={!isChatbotAvailable}
            className={`relative h-15 w-15 rounded-full shadow-[0_8px_30px_rgb(99,102,241,0.4)] transition-all duration-500 border border-white/20 ${isChatbotAvailable
              ? 'bg-gradient-to-tr from-[#6366f1] via-[#a855f7] to-[#ec4899] hover:shadow-[#6366f1]/60 hover:scale-110 hover:-translate-y-1 active:scale-95'
              : 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50'
              }`}
          >
            <div className="relative">
              {isOpen ? (
                <X className="h-7 w-7 text-white" />
              ) : (
                <>
                  <Bot className="h-7 w-7 text-white animate-pulse" />
                </>
              )}
            </div>
            {!isOpen && isChatbotAvailable && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white dark:border-slate-900 shadow-sm"></span>
              </span>
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-2 -left-2 h-6 w-6 rounded-lg bg-red-500 text-white text-[11px] flex items-center justify-center font-bold shadow-lg border-2 border-white dark:border-slate-900 animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-40"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="w-[400px] max-h-[calc(100vh-10rem)] h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden rounded-[2.5rem]">
              <div className="flex-none flex items-center justify-between px-6 py-5 border-b border-white/10 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute inset-0 z-0">
                  <div className="absolute inset-0 bg-[#4f46e5]" />
                  <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,#7c3aed_0%,transparent_50%)] opacity-80 animate-pulse" />
                  <div className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,#c026d3_0%,transparent_50%)] opacity-80" />
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-2xl transition-transform hover:rotate-12 duration-300">
                    <div className="relative">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-white text-lg tracking-tight drop-shadow-sm">
                        SmartBot AI
                      </h3>
                    </div>
                    <p className="text-[11px] text-white/80 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                      {user?.role ? t('common:roles.active', 'Sẵn sàng phục vụ') : 'Direct Access'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewConversation}
                    className="h-9 w-9 p-0 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-9 w-9 p-0 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900 relative">
                <div
                  className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 0)', backgroundSize: '32px 32px' }}
                />

                <div className="relative z-10 min-h-full">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                      {isChatbotAvailable ? (
                        <>
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/40 flex items-center justify-center mb-8 shadow-inner border border-white dark:border-white/5 hover:scale-110 transition-transform duration-500">
                            <div className="relative">
                              <Bot className="h-12 w-12 text-indigo-500 dark:text-indigo-400" />
                              <Sparkles className="h-5 w-5 text-violet-400 absolute -top-2 -right-2 animate-pulse" />
                            </div>
                          </div>
                          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
                            {t('dashboard:chatbot.welcomeTitle', 'Xin chào, tôi là SmartBot')}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 max-w-[300px] leading-relaxed font-medium">
                            Tôi đã sẵn sàng để xử lý các yêu cầu về nhân sự, tiền lương và chấm công của bạn.
                          </p>
                          <div className="flex flex-col gap-3 w-full max-w-[340px]">
                            {suggestions.slice(0, 4).map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSuggestionClick(suggestion)}
                                disabled={isLoading}
                                className="text-[13px] text-left px-5 py-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-between shadow-sm hover:shadow-md"
                              >
                                <span className="flex-1 font-semibold">{suggestion}</span>
                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 group-hover:rotate-12">
                                  <span className="text-[10px]">→</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                            <Bot className="h-8 w-8 text-slate-400" />
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">
                            Offline Mode
                          </p>
                          <p className="text-slate-500 dark:text-slate-500 text-sm max-w-[240px] mx-auto leading-relaxed">
                            Tín hiệu từ trung tâm AI đang gặp sự cố. Vui lòng quay lại sau.
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
                      {isLoading && (
                        <div className="flex items-start gap-4 mb-8">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4f46e5] to-[#c026d3] flex items-center justify-center shrink-0 shadow-xl border border-white/20">
                            <Bot className="w-6 h-6 text-white" />
                          </div>
                          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-slate-200/50 dark:border-white/5 rounded-3xl rounded-tl-sm px-6 py-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce"></span>
                              </div>
                              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 tracking-[2px] uppercase">
                                Neural Link
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {isChatbotAvailable && (
                <div className="flex-none p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3 bg-slate-100/50 dark:bg-slate-800/80 backdrop-blur-3xl rounded-[1.5rem] p-2 pl-5 border border-slate-200/50 dark:border-white/10 shadow-inner group transition-all duration-500 focus-within:ring-8 focus-within:ring-indigo-500/5 focus-within:border-indigo-500/30">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Trò chuyện với trợ lý SmartBot..."
                      className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-[15px] font-medium text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-0 h-10"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      size="sm"
                      className={`h-10 w-10 rounded-2xl p-0 transition-all duration-500 shadow-xl ${inputValue.trim() && !isLoading
                        ? 'bg-gradient-to-tr from-[#4f46e5] via-[#7c3aed] to-[#c026d3] text-white hover:scale-110 hover:-rotate-6 active:scale-95 shadow-indigo-500/40'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                        }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className={`h-5 w-5 ${inputValue.trim() ? 'text-white' : 'text-slate-400 dark:text-slate-600'} transition-colors`} />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex-none py-3 px-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/5 flex justify-center items-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[1px] flex items-center gap-1.5 font-mono">
                  <Cpu className="w-2.5 h-2.5" /> Powered by SmartAI Engine
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-30 lg:hidden"
          onClick={handleClose}
        />
      )}
    </>
  );
};
