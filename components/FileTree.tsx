import React, { useState } from 'react';
import { TreeNode } from '../types';
import { ChevronRight, Folder, FileCode, Check, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface FileTreeProps {
  node: TreeNode;
  selectedPaths: Set<string>;
  onToggle: (path: string, isFolder: boolean, node: TreeNode) => void;
  level?: number;
  searchTerm?: string;
}

const FileTree: React.FC<FileTreeProps> = ({ node, selectedPaths, onToggle, level = 0, searchTerm }) => {
  const [isOpen, setIsOpen] = useState(searchTerm ? true : level < 1); // Expand root by default

  const getFolderStatus = (n: TreeNode): 'checked' | 'unchecked' | 'indeterminate' => {
    if (n.type === 'file') {
      return selectedPaths.has(n.path) ? 'checked' : 'unchecked';
    }
    
    // For folders, check descendants
    if (!n.children) return 'unchecked';
    
    const getAllFiles = (child: TreeNode): string[] => {
      if (child.type === 'file') return [child.path];
      return child.children ? child.children.flatMap(getAllFiles) : [];
    };

    const allFiles = getAllFiles(n);
    if (allFiles.length === 0) return 'unchecked';

    const selectedCount = allFiles.filter(p => selectedPaths.has(p)).length;
    
    if (selectedCount === allFiles.length) return 'checked';
    if (selectedCount === 0) return 'unchecked';
    return 'indeterminate';
  };

  const status = getFolderStatus(node);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.path, node.type === 'folder', node);
  };

  const handleExpand = (e: React.MouseEvent) => {
    if (node.type === 'folder') setIsOpen(!isOpen);
    else handleToggle(e);
  };

  const renderName = () => {
    if (!searchTerm || node.type === 'folder') return node.name;
    const parts = node.name.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() 
        ? <span key={i} className="bg-primary/30 text-white rounded-[2px] px-0.5">{part}</span> 
        : part
    );
  };

  return (
    <div className="select-none text-sm font-sans">
      <div 
        className={clsx(
          "flex items-center gap-2 pr-2 rounded-lg cursor-pointer transition-all group relative min-h-[40px] md:min-h-[32px] my-0.5",
          status === 'checked' ? 'bg-primary/5' : 'hover:bg-white/5',
          searchTerm && "ml-0"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleExpand}
      >
        {/* Toggle Box */}
        <div className="flex items-center justify-center w-6 h-6 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
            {node.type === 'folder' && (
            <motion.div
                initial={false}
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.15 }}
            >
                <ChevronRight className="w-4 h-4 text-slate-400" />
            </motion.div>
            )}
        </div>

        {/* Checkbox */}
        <div 
            onClick={handleToggle}
            className={clsx(
            "w-5 h-5 md:w-4 md:h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all mr-2 z-10",
            status === 'checked' ? 'bg-primary border-primary shadow-[0_0_8px_rgba(139,92,246,0.4)]' : 
            status === 'indeterminate' ? 'bg-primary/40 border-primary/40' : 
            'border-slate-600 bg-slate-900/50 hover:border-slate-400'
            )}
        >
            {status === 'checked' && <Check className="w-3.5 h-3.5 md:w-3 md:h-3 text-white stroke-[3]" />}
            {status === 'indeterminate' && <Minus className="w-3.5 h-3.5 md:w-3 md:h-3 text-white" />}
        </div>

        {/* Name */}
        <div className="flex items-center gap-2 truncate flex-1 py-1">
          {node.type === 'folder' ? (
            <Folder className={clsx("w-4 h-4", status !== 'unchecked' ? "text-primary" : "text-slate-500")} />
          ) : (
            <FileCode className={clsx("w-4 h-4", status !== 'unchecked' ? "text-accent" : "text-slate-500")} />
          )}
          <span className={clsx("truncate font-mono text-[14px] md:text-[13px] tracking-tight", status === 'unchecked' ? "text-slate-400" : "text-slate-200")}>
            {renderName()}
          </span>
        </div>

        {/* Meta */}
        {node.type === 'file' && node.size !== undefined && (
          <span className="ml-auto text-[10px] text-slate-600 group-hover:text-slate-400 font-mono transition-colors">
            {Math.round(node.size / 1024)}k
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <FileTree 
                key={child.path} 
                node={child} 
                selectedPaths={selectedPaths} 
                onToggle={onToggle} 
                level={level + 1}
                searchTerm={searchTerm}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileTree;