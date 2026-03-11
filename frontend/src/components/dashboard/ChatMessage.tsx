import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Bot, User, Clock } from 'lucide-react';
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
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-full text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/40">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 mb-4 w-full ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <Avatar className="w-8 h-8 mt-1 shrink-0 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[82%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        {isAssistant && (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1 ml-0.5">
            SmartBot
          </span>
        )}

        <div className={`px-3.5 py-2.5 text-[13.5px] leading-relaxed ${isAssistant
          ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl rounded-tl-md shadow-sm'
          : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl rounded-tr-md shadow-sm shadow-indigo-500/20'
          }`}>
          <div className={`prose prose-sm max-w-none ${isAssistant ? 'prose-slate dark:prose-invert' : 'prose-invert'} 
            prose-p:leading-relaxed prose-p:my-1
            prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:rounded-lg prose-pre:p-3 prose-pre:text-xs prose-pre:my-2
            prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-code:bg-violet-50 dark:prose-code:bg-violet-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
            prose-table:border-collapse prose-table:w-full prose-table:my-2 prose-table:text-xs prose-table:border prose-table:border-slate-200 dark:prose-table:border-slate-700 prose-table:rounded-lg prose-table:overflow-hidden
            prose-th:bg-slate-50 dark:prose-th:bg-slate-800/80 prose-th:p-2 prose-th:border-b prose-th:border-slate-200 dark:prose-th:border-slate-700 prose-th:text-left prose-th:font-semibold prose-th:text-xs
            prose-td:p-2 prose-td:border-b prose-td:border-slate-100 dark:prose-td:border-slate-700/50 prose-td:text-xs
            prose-blockquote:border-l-3 prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-900/10 prose-blockquote:pl-3 prose-blockquote:py-1 prose-blockquote:italic prose-blockquote:rounded-r-lg prose-blockquote:my-2 prose-blockquote:text-sm
            prose-ul:list-disc prose-ul:pl-4 prose-ul:my-1.5
            prose-ol:list-decimal prose-ol:pl-4 prose-ol:my-1.5
            prose-li:my-0.5
            prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:mb-1.5 prose-headings:mt-3
            prose-h3:text-sm prose-h4:text-xs
            [&_a]:text-indigo-500 [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-white
            [&_hr]:my-2 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-700
          `}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        <div className={`text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-0.5 flex items-center gap-1 ${isAssistant ? 'justify-start' : 'justify-end'
          }`}>
          <Clock className="w-2.5 h-2.5" />
          {formatTimestamp(message.timestamp)}
        </div>
      </div>

      {!isAssistant && (
        <Avatar className="w-8 h-8 mt-1 shrink-0 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-xs">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
