
import React, { useContext } from 'react';
import { DataContext } from '../context/UserContext';
import { motion } from 'framer-motion';
import { Bot, User, Trash2 } from 'lucide-react';

const ChatHistory = () => {
  const { chatHistory = [], setChatHistory } = useContext(DataContext);

  const clearHistory = () => {
    setChatHistory([]);
  };

  // Group chat messages by conversation
  const conversations = chatHistory.reduce((acc, message, index) => {
    // Start a new conversation every time a user message follows an assistant message
    if (index > 0 && message.role === 'user' && chatHistory[index - 1].role === 'assistant') {
      acc.push([message]);
    } else if (acc.length === 0) {
      acc.push([message]);
    } else {
      acc[acc.length - 1].push(message);
    }
    return acc;
  }, [] as {role: 'user' | 'assistant', content: string}[][]);

  // Render the timestamp based on the message index
  const renderTimestamp = (index: number) => {
    return (
      <span className="text-xs text-muted-foreground">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  };

  // Truncate long messages for the history view
  const truncateMessage = (message: string, maxLength = 100) => {
    if (!message) return "";
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col">
      {!chatHistory || chatHistory.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground text-sm">No chat history yet</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={clearHistory}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear History
            </button>
          </div>
          
          <div className="space-y-6 overflow-y-auto">
            {conversations.map((conversation, convIndex) => (
              <div key={convIndex} className="border-b border-gray-100 pb-4 last:border-0">
                {conversation.map((message, msgIndex) => (
                  <motion.div
                    key={`${convIndex}-${msgIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`p-2 rounded mb-2 text-xs ${
                      message.role === 'user' 
                        ? 'bg-primary/5 ml-4' 
                        : 'bg-gray-50 mr-4'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        message.role === 'user'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-primary text-white'
                      }`}>
                        {message.role === 'user' ? <User className="w-2 h-2" /> : <Bot className="w-2 h-2" />}
                      </span>
                      {renderTimestamp(msgIndex)}
                    </div>
                    <p className="whitespace-pre-line">{truncateMessage(message.content)}</p>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatHistory;
