import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileArchive, Loader2, Cpu, Scan, Github, FileText, Link } from 'lucide-react';
import { clsx } from 'clsx';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  onGithubUrl?: (url: string) => void;
  onTextPaste?: () => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelected, isProcessing, onGithubUrl, onTextPaste }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/zip" || file.name.endsWith(".zip")) {
        onFileSelected(file);
      } else {
        alert("System Error: Invalid File Format. Expected .zip archive.");
      }
    }
  }, [onFileSelected, isProcessing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && onGithubUrl) {
      onGithubUrl(url);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
    <div
      onClick={() => !isProcessing && !showUrlInput && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "relative group cursor-pointer w-full h-72 rounded-3xl border border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden backdrop-blur-sm",
        isDragging 
          ? "border-primary bg-primary/10 scale-[1.02] shadow-[0_0_50px_rgba(139,92,246,0.2)]" 
          : "border-slate-700 hover:border-primary/50 bg-surface/30 hover:bg-surface/50",
        isProcessing && "opacity-80 pointer-events-none"
      )}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept=".zip,application/zip"
        className="hidden"
        disabled={isProcessing}
      />
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Processing Animation */}
      {isProcessing && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_20px_#8b5cf6]" />
      )}

      {showUrlInput ? (
        <form onSubmit={handleUrlSubmit} className="relative z-10 w-full px-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 text-center">Enter GitHub Repo URL</h3>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    autoFocus
                />
                <button type="submit" className="bg-primary hover:bg-primaryDim text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Load
                </button>
            </div>
            <button 
                type="button" 
                onClick={() => setShowUrlInput(false)}
                className="text-xs text-slate-500 hover:text-slate-300 mt-4 mx-auto block"
            >
                Cancel
            </button>
        </form>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-6 text-center p-8">
            <div className={clsx(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 relative",
            isDragging ? "bg-primary/20" : "bg-surfaceHighlight"
            )}>
            {isProcessing ? (
                <Cpu className="w-10 h-10 text-primary animate-pulse" />
            ) : (
                <UploadCloud className={clsx("w-10 h-10 transition-colors duration-300", isDragging ? "text-primary" : "text-slate-400")} />
            )}
            </div>
            
            <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">
                {isProcessing ? 'Analyzing...' : 'Drop Repository Zip'}
            </h3>
            <p className="text-slate-400 text-xs">or click to browse</p>
            </div>
        </div>
      )}
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-2 gap-4">
        <button 
            onClick={() => setShowUrlInput(true)}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-700 bg-surface/30 hover:bg-surface/50 hover:border-slate-500 transition-all text-sm font-medium text-slate-300 group"
        >
            <Github className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            <span>GitHub Repo</span>
        </button>
        <button 
            onClick={onTextPaste}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-700 bg-surface/30 hover:bg-surface/50 hover:border-slate-500 transition-all text-sm font-medium text-slate-300 group"
        >
            <FileText className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            <span>Paste Text</span>
        </button>
    </div>
    </div>
  );
};

export default DropZone;