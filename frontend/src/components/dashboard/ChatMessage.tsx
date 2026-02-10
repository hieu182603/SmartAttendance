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
    <div className={`flex gap-3 mb-6 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <Avatar className="w-10 h-10 mt-1 shadow-sm border border-blue-100">
          <AvatarFallback className="bg-blue-600 text-white">
            <Bot className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        {isAssistant && (
          <span className="text-xs font-medium text-gray-500 mb-1 ml-1 flex items-center gap-1">
            SmartBot <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
          </span>
        )}

        <Card className={`p-4 shadow-sm relative group transition-all duration-200 ${isAssistant
            ? 'bg-white border-gray-100 text-gray-800 rounded-tl-none hover:shadow-md'
            : 'bg-blue-600 text-white border-blue-600 rounded-tr-none hover:bg-blue-700'
          }`}>
          <div className={`prose prose-sm max-w-none ${isAssistant ? 'prose-slate' : 'prose-invert'} 
            prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100
            prose-table:border prose-table:border-collapse prose-th:border prose-th:p-2 prose-td:border prose-td:p-2
            prose-ul:my-2 prose-li:my-0.5
          `}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </Card>

        <div className={`text-[10px] text-gray-400 mt-1.5 px-1 uppercase tracking-wider font-semibold ${isAssistant ? 'text-left' : 'text-right'
          }`}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>

      {!isAssistant && (
        <Avatar className="w-10 h-10 mt-1 shadow-sm border border-gray-100">
          <AvatarFallback className="bg-slate-700 text-white font-bold">
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
