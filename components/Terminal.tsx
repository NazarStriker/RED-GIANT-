import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../types';

interface TerminalProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  isGameOver: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ messages, isLoading, onSendMessage, isGameOver }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isGameOver) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black pointer-events-none"></div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-8 z-10 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
            
            {/* Image (AI only) */}
            {msg.imageUrl && (
              <div className="mb-4 w-full max-w-2xl rounded-lg overflow-hidden border border-gray-800 shadow-2xl shadow-red-900/20">
                <img 
                  src={msg.imageUrl} 
                  alt="Scene visualization" 
                  className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-700"
                />
              </div>
            )}

            {/* Text Bubble */}
            <div 
              className={`max-w-2xl p-4 rounded-lg leading-relaxed font-mono whitespace-pre-wrap shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-gray-800 text-gray-100 border border-gray-700' 
                  : 'bg-black/40 text-red-50 border-l-2 border-red-600 backdrop-blur-sm'
              }`}
            >
              {msg.role === 'ai' && <span className="text-red-500 font-bold text-xs block mb-2 tracking-widest">СИСТЕМА</span>}
              {msg.text}
            </div>
            
            <span className="text-xs text-gray-600 mt-2 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex flex-col items-start w-full max-w-2xl animate-pulse">
            <div className="h-64 w-full bg-gray-900/50 rounded mb-4"></div>
            <div className="h-4 w-3/4 bg-gray-900/50 rounded mb-2"></div>
            <div className="h-4 w-1/2 bg-gray-900/50 rounded"></div>
            <div className="text-red-500 text-xs font-mono mt-2 animate-pulse-slow">ОБРАБОТКА НЕЙРОННОЙ СИМУЛЯЦИИ...</div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 lg:p-6 bg-black border-t border-gray-900 z-20">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || isGameOver}
            placeholder={isGameOver ? "СИГНАЛ ПОТЕРЯН..." : "Введите действие..."}
            className="w-full bg-gray-900/50 text-gray-100 p-4 pl-6 rounded border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-900 outline-none font-mono transition-all"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={isLoading || isGameOver || !input.trim()}
            className="absolute right-2 top-2 bottom-2 px-6 bg-red-900/20 text-red-500 hover:bg-red-800 hover:text-white rounded transition-all font-mono uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed border border-red-900/30"
          >
            ВЫПОЛНИТЬ
          </button>
        </form>
      </div>
    </div>
  );
};

export default Terminal;