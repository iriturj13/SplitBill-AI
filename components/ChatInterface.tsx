import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isProcessing: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const text = input;
    setInput('');
    await onSendMessage(text);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-semibold text-gray-800 flex items-center">
          <span className="material-icons mr-2 text-indigo-500">auto_awesome</span>
          Smart Assistant
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Try "Tom had the burger" or "Everyone shared the appetizers"
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center py-8 opacity-50">
             <span className="material-icons text-4xl text-gray-300 mb-2">chat_bubble_outline</span>
             <p className="text-sm text-gray-500">Chat to assign items...</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`
                max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm
                ${msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400 text-sm text-gray-900"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <span className="material-icons text-xl">send</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
