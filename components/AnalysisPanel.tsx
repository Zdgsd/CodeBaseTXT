import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, Sparkles, StopCircle, User, Copy, Check, Key, AlertTriangle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AnalysisPanelProps {
  contextContent: string;
  fileName: string;
  apiKey: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

const CodeBlock = ({ children, className }: any) => {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-white/10 bg-black/40">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
        <span className="text-[10px] font-mono text-slate-400 lowercase">{lang || 'code'}</span>
        <button 
          onClick={handleCopy}
          className="text-slate-500 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <div className="overflow-x-auto p-3">
        <code className={clsx("font-mono text-xs leading-relaxed text-slate-200", className)}>
          {children}
        </code>
      </div>
    </div>
  );
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ contextContent, fileName, apiKey }) => {
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
            text: `I've analyzed **${fileName}**. I can help you understand the architecture, find bugs, or suggest refactors.\n\nWhat would you like to know?`
        }]);
    }
  }, [fileName]);

  const parseError = (err: any): string => {
      // Handle the complex nested JSON string error from Vercel/Proxy
      try {
          // If it's a string, try parsing it as JSON first
          let errorObj = err;
          if (typeof err.message === 'string' && err.message.startsWith('{')) {
             try {
                 const parsed = JSON.parse(err.message);
                 if (parsed.error) errorObj = parsed.error;
             } catch {}
          }

          if (errorObj?.code === 429 || errorObj?.status === 'RESOURCE_EXHAUSTED') {
              return "⚠️ **Rate Limit Exceeded**\n\nYou are sending too many requests too quickly for the free tier.\n\n* **Wait 30-60 seconds** and try again.\n* Upgrade your API key quotas in Google AI Studio if this persists.";
          }
          
          if (err.message) return err.message;
          return "An unexpected error occurred.";

      } catch (e) {
          return err.message || "Unknown error occurred.";
      }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
        setMessages(prev => [...prev, { role: 'user', text: input.trim() }, { role: 'model', text: "⚠️ **No API Key detected.**\n\nPlease enter your Gemini API Key in the **Configuration** panel (right sidebar) to use this feature.", isError: true }]);
        setInput('');
        return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    setStreamText('');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are a senior software architect analyzing a codebase. 
The user has provided the codebase content below. 
Answer questions about the code, architecture, bugs, and improvements.
Use Markdown formatting for your responses. Use code blocks for code snippets.
Be concise, technical, and helpful.

CODEBASE CONTEXT (${fileName}):
${contextContent.slice(0, 500000)} 
`;

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: systemInstruction,
        },
        history: messages.filter(m => !m.isError).map(m => ({
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
      console.error("AI Error:", error);
      const niceError = parseError(error);
      setMessages(prev => [...prev, { role: 'model', text: niceError, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (text: string, isUser: boolean, isError?: boolean) => (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({node, ...props}) => <p className={clsx("mb-3 last:mb-0 leading-relaxed", isError && "text-red-200")} {...props} />,
        a: ({node, ...props}) => <a className="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-3 space-y-1" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-3 space-y-1" {...props} />,
        li: ({node, ...props}) => <li className="pl-1" {...props} />,
        h1: ({node, ...props}) => <h1 className="text-lg font-bold text-white mt-4 mb-2 border-b border-white/10 pb-1" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-base font-bold text-white mt-4 mb-2" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-sm font-bold text-slate-200 mt-3 mb-1" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-slate-400 my-3 bg-white/5 py-1 pr-2 rounded-r" {...props} />,
        code: ({node, className, children, ...props}: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !String(children).includes('\n');
          return isInline ? (
            <code className="font-mono text-xs bg-black/30 text-primary px-1.5 py-0.5 rounded border border-primary/20" {...props}>
              {children}
            </code>
          ) : (
            <CodeBlock className={className}>{children}</CodeBlock>
          );
        },
        table: ({node, ...props}) => <div className="overflow-x-auto my-3"><table className="min-w-full divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden" {...props} /></div>,
        thead: ({node, ...props}) => <thead className="bg-white/5" {...props} />,
        th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider" {...props} />,
        td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-400 border-t border-white/5" {...props} />,
      }}
    >
      {text}
    </ReactMarkdown>
  );

  return (
    <div className="flex flex-col h-full bg-[#050505] relative w-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              "flex gap-3 max-w-3xl mx-auto w-full", 
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
                msg.role === 'user' ? "bg-slate-700" : msg.isError ? "bg-red-500/20" : "bg-primary/20"
            )}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : msg.isError ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Bot className="w-5 h-5 text-primary" />}
            </div>
            <div className={clsx(
              "p-4 rounded-2xl text-sm leading-relaxed font-sans min-w-0 overflow-hidden shadow-sm",
              msg.role === 'user' ? "bg-slate-800 text-slate-200 rounded-tr-sm" : msg.isError ? "bg-red-900/10 border border-red-500/30 text-red-200 w-full" : "bg-surfaceHighlight text-slate-300 rounded-tl-sm border border-white/5 w-full"
            )}>
              {renderMessageContent(msg.text, msg.role === 'user', msg.isError)}
            </div>
          </motion.div>
        ))}
        {isLoading && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 max-w-3xl mx-auto w-full"
            >
             <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 animate-pulse mt-1">
                <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-surfaceHighlight border border-white/5 text-sm text-slate-300 w-full shadow-sm">
                {renderMessageContent(streamText, false)}
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse"/>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface/50 backdrop-blur-md border-t border-white/5 z-10 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={apiKey ? "Ask about the code..." : "Enter API Key in Config to chat..."}
                className={clsx(
                  "w-full bg-black/40 border rounded-xl pl-4 pr-12 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-500",
                  !apiKey ? "border-red-500/30 focus:border-red-500/50 focus:ring-red-500/50" : "border-white/10 focus:border-primary/50 focus:ring-primary/50"
                )}
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