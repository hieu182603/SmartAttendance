import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Bot, User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/chatbotService';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message
}) => {
  const { t } = useTranslation();

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <Badge variant="outline" className="text-xs">
          {message.content}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 mb-5 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <Avatar className="w-8 h-8 mt-1 shadow-sm border border-[var(--border)] shrink-0">
          <AvatarFallback className="bg-[var(--primary)] text-white">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        {isAssistant && (
          <span className="text-[11px] font-medium text-[var(--text-sub)] mb-1 ml-1 flex items-center gap-1.5">
            SmartBot <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </span>
        )}

        <div className={`px-4 py-2.5 shadow-sm relative group transition-all duration-200 ${isAssistant
            ? 'bg-[var(--shell)] text-[var(--text-main)] rounded-2xl rounded-tl-sm'
            : 'bg-[var(--primary)] text-white rounded-2xl rounded-tr-sm'
          }`}>
          <div className={`prose prose-sm max-w-none ${isAssistant ? 'prose-slate dark:prose-invert' : 'prose-invert'} 
            prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100
            prose-table:border prose-table:border-collapse prose-th:border prose-th:p-2 prose-td:border prose-td:p-2
            prose-ul:my-2 prose-li:my-0.5
            [&_a]:text-blue-500 [&_a]:underline
            [&_strong]:font-semibold
          `}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        <div className={`text-[10px] text-[var(--text-sub)] mt-1 px-1 font-medium ${isAssistant ? 'text-left' : 'text-right'
          }`}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>

      {!isAssistant && (
        <Avatar className="w-8 h-8 mt-1 shadow-sm border border-[var(--border)] shrink-0">
          <AvatarFallback className="bg-slate-700 dark:bg-slate-600 text-white font-bold text-xs">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
