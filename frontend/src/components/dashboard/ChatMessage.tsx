import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Bot, User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/chatbotService';
import { useTranslation } from 'react-i18next';

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


  const renderMessageContent = () => {
    // Parse simple markdown-like formatting and render safely
    const parseContent = (text: string) => {
      const parts = [];
      let lastIndex = 0;

      // Handle line breaks
      const lines = text.split('\n');

      return lines.map((line, lineIndex) => {
        const elements = [];
        let currentIndex = 0;

        // Handle bold text **text**
        const boldRegex = /\*\*(.*?)\*\*/g;
        let boldMatch;
        while ((boldMatch = boldRegex.exec(line)) !== null) {
          // Add text before the match
          if (boldMatch.index > currentIndex) {
            elements.push(line.slice(currentIndex, boldMatch.index));
          }
          // Add the bold text
          elements.push(
            <strong key={`bold-${boldMatch.index}`} className="font-bold">
              {boldMatch[1]}
            </strong>
          );
          currentIndex = boldMatch.index + boldMatch[0].length;
        }

        // Add remaining text
        if (currentIndex < line.length) {
          elements.push(line.slice(currentIndex));
        }

        return (
          <div key={`line-${lineIndex}`}>
            {elements.length > 0 ? elements : line}
          </div>
        );
      });
    };

    return (
      <div className="text-sm leading-relaxed">
        {parseContent(message.content)}
      </div>
    );
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
    <div className={`flex gap-3 mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className="bg-blue-100 text-blue-600">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[70%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        <Card className={`p-3 shadow-sm ${
          isAssistant
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-blue-600 text-white border-blue-600'
        }`}>
          {renderMessageContent()}

        </Card>

        <div className={`text-xs text-gray-500 mt-1 px-1 ${
          isAssistant ? 'text-left' : 'text-right'
        }`}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>

      {!isAssistant && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className="bg-gray-100 text-gray-600">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
