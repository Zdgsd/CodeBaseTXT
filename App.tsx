import React, { useState, useEffect, useMemo } from 'react';
import { Download, Copy, RefreshCw, CheckCheck, Zap, Sidebar, Settings, Search, FileText, Menu, X, Layers, Code2, Bot, Github, ArrowUpRight, Key, PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { processZipFile, generateOutput, filterTree } from './utils/zipProcessor';
import { ProcessingResult, ProcessingStatus, OutputFormat, GenerationOptions, TreeNode } from './types';
import DropZone from './components/DropZone';
import FileTree from './components/FileTree';
import OutputControls from './components/OutputControls';
import SmartFilters from './components/SmartFilters';
import LanguageBreakdown from './components/LanguageBreakdown';
import AnalysisPanel from './components/AnalysisPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import JSZip from 'jszip';

type MobileTab = 'files' | 'preview' | 'config';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [data, setData] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<OutputFormat>('MARKDOWN');
  const [options, setOptions] = useState<GenerationOptions>({
    removeComments: false,
    removeEmptyLines: false,
    removeConsoleLogs: false,
    removeImports: false,
    minifyWhitespace: false,
    skeletonize: false,
    truncateLargeValues: false,
    customPrompt: ''
  });
  
  // Initialize API Key from localStorage or environment variable
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || process.env.API_KEY || '');
  
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [output, setOutput] = useState<string>('');
  const [stats, setStats] = useState<any>({ tokenCount: 0, fileCount: 0, charCount: 0 });
  const [rawTokenCount, setRawTokenCount] = useState<number>(0);
  const [languageStats, setLanguageStats] = useState<{ext: string, count: number}[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'stats' | 'analysis'>('preview');
  
  // Desktop Sidebar States
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // Mobile state
  const [mobileTab, setMobileTab] = useState<MobileTab>('files');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle API Key updates
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newKey = e.target.value;
      setApiKey(newKey);
      localStorage.setItem('gemini_api_key', newKey);
  };

  const handleFileProcess = async (file: File) => {
    setStatus(ProcessingStatus.PROCESSING);
    setError(null);
    try {
      // Small delay to allow UI to render spinner
      setTimeout(async () => {
        try {
            const result = await processZipFile(file);
            setData(result);
            setSelectedPaths(new Set(result.rawFiles.keys())); // Select all valid by default
            setStatus(ProcessingStatus.COMPLETE);
        } catch (err: any) {
            setError(err.message || 'Failed to process zip');
            setStatus(ProcessingStatus.ERROR);
        }
      }, 1500);
    } catch (e) {
      setError('Unexpected error');
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleGithubUrl = async (url: string) => {
    setStatus(ProcessingStatus.PROCESSING);
    try {
        const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
        const match = url.match(regex);
        if (!match) throw new Error("Invalid GitHub URL");
        
        const owner = match[1];
        const repo = match[2].replace('.git', '');
        
        // Try main, then master
        const fetchZip = async (branch: string) => {
            const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
            // Use corsproxy for demo purposes. In production, use your own proxy.
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(zipUrl)}`; 
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Repo not found or private");
            return response.blob();
        }

        let blob;
        try {
            blob = await fetchZip('main');
        } catch (e) {
            blob = await fetchZip('master');
        }

        const file = new File([blob], `${repo}.zip`, { type: 'application/zip' });
        await handleFileProcess(file);

    } catch (e: any) {
        setError("Failed to fetch repo. Ensure it is public.");
        setStatus(ProcessingStatus.IDLE);
    }
  }

  const handlePasteText = async () => {
      const text = prompt("Paste your code here:");
      if (!text) return;
      const zip = new JSZip();
      zip.file("pasted_content.txt", text);
      const content = await zip.generateAsync({ type: "blob" });
      const file = new File([content], "pasted_text.zip", { type: 'application/zip' });
      handleFileProcess(file);
  }

  useEffect(() => {
    if (data && status === ProcessingStatus.COMPLETE) {
      // Debounce generation for large files
      const timer = setTimeout(() => {
          const res = generateOutput(data.rawFiles, selectedPaths, format, options);
          setOutput(res.content);
          setStats(res.stats);
          setRawTokenCount(res.rawStats.tokenCount);
          setLanguageStats(res.languageStats);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [data, selectedPaths, format, options, status]);

  const handleToggle = (path: string, isFolder: boolean, node: TreeNode) => {
    const newSelection = new Set(selectedPaths);
    if (!isFolder) {
      if (newSelection.has(path)) newSelection.delete(path);
      else newSelection.add(path);
    } else {
      // Toggle folder recursively
      const getAllFiles = (n: TreeNode): string[] => {
        if (n.type === 'file') return [n.path];
        return n.children ? n.children.flatMap(getAllFiles) : [];
      };
      const allFiles = getAllFiles(node);
      const allSelected = allFiles.every(p => newSelection.has(p));
      
      if (allSelected) {
        allFiles.forEach(p => newSelection.delete(p));
      } else {
        allFiles.forEach(p => newSelection.add(p));
      }
    }
    setSelectedPaths(newSelection);
  };

  const filteredTree = useMemo(() => {
      if (!data?.root) return null;
      return filterTree(data.root, searchQuery);
  }, [data?.root, searchQuery]);

  const selectFiltered = (selectAll: boolean) => {
    if (!filteredTree) return;
    const newSelection = new Set(selectedPaths);
     const getAllFiles = (n: TreeNode): string[] => {
        if (n.type === 'file') return [n.path];
        return n.children ? n.children.flatMap(getAllFiles) : [];
      };
      const visibleFiles = getAllFiles(filteredTree);
      visibleFiles.forEach(p => {
          if (selectAll) newSelection.add(p);
          else newSelection.delete(p);
      });
      setSelectedPaths(newSelection);
  }

  const handleDownload = () => {
    if (!data) return;
    let ext = format === 'JSON' || format === 'JSONL' ? '.json' : format === 'XML' ? '.xml' : format === 'MARKDOWN' ? '.md' : '.txt';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.fileName}_context${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStatus(ProcessingStatus.IDLE);
    setData(null);
    setOutput('');
    setSearchQuery('');
    setOptions({
        removeComments: false,
        removeEmptyLines: false,
        removeConsoleLogs: false,
        removeImports: false,
        minifyWhitespace: false,
        skeletonize: false,
        truncateLargeValues: false,
        customPrompt: ''
    });
    setMobileTab('files');
    setActiveTab('preview');
  };

  if (status !== ProcessingStatus.COMPLETE) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light" />
        
        <div className="z-10 w-full max-w-xl space-y-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-6">
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-flex items-center justify-center p-5 bg-surfaceHighlight rounded-3xl mb-4 ring-1 ring-white/10 shadow-2xl shadow-primary/20 backdrop-blur-xl"
            >
                <Zap className="w-10 h-10 text-primary animate-pulse-glow" />
            </motion.div>
            <div>
                <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-slate-500">
                TXT Codebase
                </h1>
                <p className="text-slate-400 text-lg md:text-xl font-light">
                Zero-Latency Context Injection for LLMs.
                </p>
            </div>
          </div>
          <DropZone 
            onFileSelected={handleFileProcess} 
            isProcessing={status === ProcessingStatus.PROCESSING} 
            onGithubUrl={handleGithubUrl}
            onTextPaste={handlePasteText}
          />
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-center backdrop-blur-md">
                <span className="font-bold">Error:</span> {error}
                <button onClick={() => setStatus(ProcessingStatus.IDLE)} className="block w-full mt-2 text-xs uppercase tracking-widest hover:text-white transition-colors">Reset System</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const FilesPanel = () => (
    <div className="flex flex-col h-full bg-surface/50 backdrop-blur-xl border-r border-white/5 w-full">
      <div className="p-4 border-b border-white/5 space-y-4 bg-background/50 sticky top-0 z-10 shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white tracking-tight">
                <Sidebar className="w-5 h-5 text-primary" />
                <span>Explorer</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                    {selectedPaths.size} / {data?.stats.processedFilesCount}
                </div>
                {/* Desktop Close Button */}
                <button 
                  onClick={() => setIsLeftOpen(false)} 
                  className="hidden md:flex p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
            </div>
        </div>
        <div className="relative group">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
                type="text" 
                placeholder="Search files..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
            />
        </div>
        {data && (
            <SmartFilters 
                rootNode={data.root}
                selectedPaths={selectedPaths}
                onSelectionChange={setSelectedPaths}
            />
        )}
        {searchQuery && (
            <div className="flex gap-2">
                <button onClick={() => selectFiltered(true)} className="flex-1 text-[10px] bg-primary/20 text-primary hover:bg-primary/30 py-2 rounded-lg transition-colors font-medium">Select All</button>
                <button onClick={() => selectFiltered(false)} className="flex-1 text-[10px] bg-white/5 text-slate-400 hover:bg-white/10 py-2 rounded-lg transition-colors font-medium">Clear</button>
            </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-24 md:pb-2 min-h-0">
        {filteredTree ? (
             <FileTree 
                node={filteredTree} 
                selectedPaths={selectedPaths} 
                onToggle={handleToggle} 
                searchTerm={searchQuery}
            />
        ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                <Search className="w-8 h-8 opacity-20" />
                <span className="text-sm">No matches found</span>
            </div>
        )}
      </div>
      <div className="p-4 border-t border-white/5 bg-background/50 hidden md:block shrink-0">
        <button onClick={reset} className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors w-full py-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5">
            <RefreshCw className="w-3.5 h-3.5" /> Start New Session
        </button>
      </div>
    </div>
  );

  const PreviewPanel = () => (
    <div className="flex flex-col h-full bg-[#050505] relative">
      {/* Mobile Header */}
      <div className="md:hidden h-28 border-b border-white/5 flex flex-col justify-center px-4 bg-surface/30 backdrop-blur-md sticky top-0 z-20 gap-3 shrink-0">
        <div className="flex items-center justify-between w-full">
            <span className="text-xs font-mono text-slate-400 truncate max-w-[150px]">{data?.fileName}</span>
            <button 
                onClick={handleCopy}
                className={clsx(
                    "p-2 rounded-lg transition-all",
                    copied ? "text-success bg-success/10" : "text-slate-400 hover:text-white bg-white/5"
                )}
            >
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
        <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 w-full">
            <button 
                onClick={() => setActiveTab('preview')}
                className={clsx("flex-1 py-1.5 rounded-md text-xs font-medium transition-all text-center", activeTab === 'preview' ? "bg-surfaceHighlight text-white shadow-sm" : "text-slate-500")}
            >
                Code
            </button>
            <button 
                onClick={() => setActiveTab('stats')}
                className={clsx("flex-1 py-1.5 rounded-md text-xs font-medium transition-all text-center", activeTab === 'stats' ? "bg-surfaceHighlight text-white shadow-sm" : "text-slate-500")}
            >
                Stats
            </button>
            <button 
                onClick={() => setActiveTab('analysis')}
                className={clsx("flex-1 py-1.5 rounded-md text-xs font-medium transition-all text-center flex items-center justify-center gap-1", activeTab === 'analysis' ? "bg-primary/20 text-primary shadow-sm" : "text-slate-500")}
            >
                <Bot className="w-3 h-3" /> AI
            </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex h-16 border-b border-white/5 items-center justify-between px-6 bg-surface/30 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-4">
             {/* Left Toggle (only visible if closed) */}
             {!isLeftOpen && (
              <button 
                onClick={() => setIsLeftOpen(true)}
                className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors"
                title="Open Explorer"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-6">
              <h2 className={clsx(
                "text-sm font-semibold text-white/80 h-6 leading-6",
                !isLeftOpen && "border-l border-white/10 pl-4",
                isLeftOpen && "pl-0"
              )}>
                  {data?.fileName}
              </h2>
              <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                  <button 
                      onClick={() => setActiveTab('preview')}
                      className={clsx("px-4 py-1.5 rounded-md text-xs font-medium transition-all", activeTab === 'preview' ? "bg-surfaceHighlight text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
                  >
                      Preview
                  </button>
                  <button 
                      onClick={() => setActiveTab('stats')}
                      className={clsx("px-4 py-1.5 rounded-md text-xs font-medium transition-all", activeTab === 'stats' ? "bg-surfaceHighlight text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
                  >
                      Analytics
                  </button>
                  <button 
                      onClick={() => setActiveTab('analysis')}
                      className={clsx("px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5", activeTab === 'analysis' ? "bg-primary/20 text-primary shadow-sm" : "text-slate-500 hover:text-slate-300")}
                  >
                      <Bot className="w-3.5 h-3.5" />
                      AI Analyst
                  </button>
              </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopy}
            className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border",
                copied ? "bg-success/10 border-success/50 text-success" : "bg-surface border-white/10 text-slate-300 hover:bg-white/5"
            )}
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden lg:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all bg-primary hover:bg-primaryDim text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Export</span>
          </button>

           {/* Right Toggle (only visible if closed) */}
           {!isRightOpen && (
              <button 
                onClick={() => setIsRightOpen(true)}
                className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors ml-2"
                title="Open Configuration"
              >
                <PanelRightOpen className="w-5 h-5" />
              </button>
            )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        {activeTab === 'preview' ? (
          <>
            <textarea
                readOnly
                value={output.slice(0, 100000)} // Truncate preview for performance if huge
                className="w-full h-full bg-transparent text-slate-300 font-mono text-[13px] p-4 md:p-8 resize-none outline-none custom-scrollbar leading-relaxed selection:bg-primary/30"
                placeholder="Output generated here..."
            />
            {/* Fade Overlay for mobile */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none md:hidden" />
          </>
        ) : activeTab === 'stats' ? (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar h-full max-w-4xl mx-auto w-full pb-32 md:pb-8">
                <h3 className="text-2xl font-bold text-white">Project Analytics</h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Files', value: stats.fileCount, color: 'text-primary' },
                        { label: 'Tokens', value: new Intl.NumberFormat('en-US', { notation: "compact" }).format(stats.tokenCount), color: 'text-white' },
                        { label: 'Chars', value: new Intl.NumberFormat('en-US', { notation: "compact" }).format(stats.charCount), color: 'text-slate-400' },
                        { label: 'Ignored', value: data?.stats.ignoredFiles, color: 'text-red-400' }
                    ].map((stat, i) => (
                        <div key={i} className="p-4 bg-surface/50 rounded-xl border border-white/5 backdrop-blur-sm">
                            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{stat.label}</div>
                            <div className={clsx("text-2xl font-mono font-medium", stat.color)}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                <LanguageBreakdown stats={languageStats} totalFiles={selectedPaths.size} />
                
                {data?.ignoredPaths.length ? (
                    <div>
                         <h4 className="text-slate-400 font-semibold mb-3 text-sm uppercase">Ignored Files ({data.ignoredPaths.length})</h4>
                         <div className="bg-black/30 rounded-xl border border-white/5 p-4 max-h-60 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-500 space-y-1">
                            {data.ignoredPaths.map((p, i) => <div key={i} className="py-1 border-b border-white/5 last:border-0">{p}</div>)}
                         </div>
                    </div>
                ): null}
            </div>
        ) : (
            <AnalysisPanel 
                contextContent={output} 
                fileName={data?.fileName || 'Codebase'} 
                apiKey={apiKey}
            />
        )}
      </div>
    </div>
  );

  const ConfigPanel = () => (
    <div className="flex flex-col h-full bg-surface/30 backdrop-blur-xl border-l border-white/5 w-full">
      {/* Header & API Key - Fixed Top */}
      <div className="shrink-0 p-5 pb-2 relative z-10">
         <div className="flex items-center justify-between mb-4">
             <h3 className="flex items-center gap-2 font-bold text-white text-sm uppercase tracking-wide">
                <div className="p-1.5 bg-primary/20 rounded-md">
                    <Settings className="w-4 h-4 text-primary" />
                </div>
                Configuration
            </h3>
            {/* Desktop Close Button */}
            <button 
              onClick={() => setIsRightOpen(false)} 
              className="hidden md:flex p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
         </div>
        <div className="space-y-2">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-3 h-3" /> API Access
            </label>
            <div className="relative group">
                <input
                    type="password"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="Gemini API Key..."
                    className="w-full bg-black/40 border border-slate-700/50 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-black/60 transition-all"
                />
                <Key className="absolute left-2.5 top-2.5 w-3 h-3 text-slate-500 group-focus-within:text-primary transition-colors" />
            </div>
        </div>
        <div className="w-full h-px bg-white/5 mt-4" />
      </div>

      {/* Main Controls - Flexible Center */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden p-5 pt-2 custom-scrollbar">
        <OutputControls 
            format={format}
            setFormat={setFormat}
            options={options}
            setOptions={setOptions}
            tokenCount={stats.tokenCount}
            rawTokenCount={rawTokenCount}
        />

        {/* Mobile Download - Only shows on mobile via CSS elsewhere or conditional */}
        <div className="mt-8 space-y-3 md:hidden">
             <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-medium">
                <Download className="w-4 h-4" /> Download Export
             </button>
             <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 text-slate-400 rounded-xl font-medium border border-white/5">
                <RefreshCw className="w-4 h-4" /> Reset Session
             </button>
        </div>
      </div>
      
      {/* Footer / Credits - Fixed Bottom */}
      <div className="shrink-0 p-4 border-t border-white/5 bg-black/20 backdrop-blur-md hidden md:block">
        <a 
            href="https://github.com/Zdgsd/CodeBaseTXT" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 rounded-lg border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all"
        >
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/5 rounded-md group-hover:bg-primary/20 transition-colors">
                    <Github className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary" />
                </div>
                <div className="text-left">
                    <div className="text-[11px] font-medium text-slate-300 group-hover:text-white">Tool by Zdig</div>
                    <div className="text-[9px] text-slate-500">View Source</div>
                </div>
            </div>
            <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-primary transition-colors" />
        </a>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden text-slate-200 font-sans fixed inset-0">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 h-full overflow-hidden">
        
        {/* Left Sidebar (Explorer) */}
        <motion.div 
            initial={{ width: 320 }}
            animate={{ width: isLeftOpen ? 320 : 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="shrink-0 h-full z-20 shadow-2xl overflow-hidden border-r border-white/5 bg-background"
        >
             <div className="w-80 h-full"> {/* Inner container fixed width to prevent content squishing */}
                 <FilesPanel />
             </div>
        </motion.div>

        {/* Center Panel */}
        <div className="flex-1 h-full min-w-0 z-10">
          <PreviewPanel />
        </div>

        {/* Right Sidebar (Config) */}
        <motion.div 
             initial={{ width: 320 }}
             animate={{ width: isRightOpen ? 320 : 0 }}
             transition={{ type: "spring", bounce: 0, duration: 0.4 }}
             className="shrink-0 h-full z-20 border-l border-white/5 overflow-hidden bg-background"
        >
            <div className="w-80 h-full">
                <ConfigPanel />
            </div>
        </motion.div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex-1 relative overflow-hidden flex flex-col">
         <div className="flex-1 relative w-full h-full">
            <AnimatePresence mode="wait" initial={false}>
                {mobileTab === 'files' && (
                    <motion.div 
                        key="files"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 z-10 bg-background"
                    >
                        <FilesPanel />
                    </motion.div>
                )}
                {mobileTab === 'preview' && (
                    <motion.div 
                         key="preview"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         transition={{ duration: 0.2 }}
                         className="absolute inset-0 z-10 bg-background"
                    >
                        <PreviewPanel />
                    </motion.div>
                )}
                {mobileTab === 'config' && (
                     <motion.div 
                        key="config"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 z-10 bg-background"
                    >
                        <ConfigPanel />
                    </motion.div>
                )}
            </AnimatePresence>
         </div>

         {/* Mobile Navigation */}
         <div className="h-16 bg-surface/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 z-50 shrink-0 pb-safe">
            <button 
                onClick={() => setMobileTab('files')}
                className={clsx("flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20", mobileTab === 'files' ? "text-primary bg-primary/10" : "text-slate-500")}
            >
                <Sidebar className="w-5 h-5" />
                <span className="text-[10px] font-medium">Files</span>
            </button>
            <button 
                onClick={() => setMobileTab('preview')}
                className={clsx("flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20", mobileTab === 'preview' ? "text-primary bg-primary/10" : "text-slate-500")}
            >
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-medium">Preview</span>
            </button>
            <button 
                onClick={() => setMobileTab('config')}
                className={clsx("flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20", mobileTab === 'config' ? "text-primary bg-primary/10" : "text-slate-500")}
            >
                <Settings className="w-5 h-5" />
                <span className="text-[10px] font-medium">Config</span>
            </button>
         </div>
      </div>
    </div>
  );
};

export default App;