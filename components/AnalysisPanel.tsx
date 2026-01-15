import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, Sparkles, StopCircle, User } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface AnalysisPanelProps {
  contextContent: string;
  fileName: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ contextContent, fileName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamText]);

  useEffect(() => {
    if (messages.length === 0) {
        setMessages([{
            role: 'model',
            text: `I've analyzed **${fileName}**. I can help you understand the architecture, find bugs, or suggest refactors. What would you like to know?`
        }]);
    }
  }, [fileName]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    setStreamText('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `You are a senior software architect analyzing a codebase. 
The user has provided the codebase content below. 
Answer questions about the code, architecture, bugs, and improvements.
Be concise, technical, and helpful.

CODEBASE CONTEXT (${fileName}):
${contextContent.slice(0, 500000)} 
`;
// Limit context to ~500k chars to be safe for now, though Gemini supports more

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash-preview',
        config: {
            systemInstruction: systemInstruction,
        },
        history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessageStream({ message: userMsg });

      let fullText = '';
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setStreamText(fullText);
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: fullText }]);
      setStreamText('');
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message || 'Failed to generate response.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-20">
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              "flex gap-3 max-w-3xl mx-auto", 
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-slate-700" : "bg-primary/20"
            )}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-5 h-5 text-primary" />}
            </div>
            <div className={clsx(
              "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap font-sans",
              msg.role === 'user' ? "bg-slate-800 text-slate-200 rounded-tr-sm" : "bg-surfaceHighlight text-slate-300 rounded-tl-sm border border-white/5"
            )}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 max-w-3xl mx-auto"
            >
             <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-surfaceHighlight border border-white/5 text-sm text-slate-300 w-full">
                {streamText}
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse"/>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface/50 backdrop-blur-md border-t border-white/5 absolute bottom-0 left-0 right-0 z-10">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the code..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-500"
                disabled={isLoading}
            />
            <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="absolute right-2 p-1.5 bg-primary rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primaryDim transition-colors"
            >
                {isLoading ? <StopCircle className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
            </button>
        </form>
      </div>
    </div>
  );
};

export default AnalysisPanel;