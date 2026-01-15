import React from 'react';
import { Filter, Code2, FileCog, TestTube2, CheckSquare, Square } from 'lucide-react';
import { TreeNode } from '../types';

interface SmartFiltersProps {
    rootNode: TreeNode;
    selectedPaths: Set<string>;
    onSelectionChange: (newSet: Set<string>) => void;
}

const SmartFilters: React.FC<SmartFiltersProps> = ({ rootNode, selectedPaths, onSelectionChange }) => {
    
    const getAllFiles = (node: TreeNode): string[] => {
        if (node.type === 'file') return [node.path];
        return node.children ? node.children.flatMap(getAllFiles) : [];
    };

    const applyFilter = (filterFn: (path: string) => boolean) => {
        const all = getAllFiles(rootNode);
        const newSet = new Set(selectedPaths);
        all.forEach(path => {
            if (filterFn(path)) {
                newSet.delete(path);
            }
        });
        onSelectionChange(newSet);
    };

    const selectSourceOnly = () => {
        const all = getAllFiles(rootNode);
        const newSet = new Set<string>();
        all.forEach(path => {
            const lower = path.toLowerCase();
            const isTest = lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__');
            const isConfig = lower.includes('config') || lower.includes('.rc') || lower.endsWith('.json') || lower.endsWith('.lock');
            
            if (!isTest && !isConfig) {
                newSet.add(path);
            }
        });
        onSelectionChange(newSet);
    }

    return (
        <div className="flex gap-2 mb-4 px-1 overflow-x-auto custom-scrollbar pb-2">
            <button 
                onClick={() => applyFilter(p => p.toLowerCase().includes('.test.') || p.toLowerCase().includes('.spec.') || p.toLowerCase().includes('__tests__'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surfaceHighlight border border-slate-700 text-[10px] font-medium text-slate-300 hover:border-red-400 hover:text-red-400 transition-all shrink-0"
            >
                <TestTube2 className="w-3 h-3" />
                Exclude Tests
            </button>
             <button 
                onClick={() => applyFilter(p => p.toLowerCase().includes('config') || p.endsWith('.json') || p.endsWith('.lock') || p.includes('.rc'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surfaceHighlight border border-slate-700 text-[10px] font-medium text-slate-300 hover:border-amber-400 hover:text-amber-400 transition-all shrink-0"
            >
                <FileCog className="w-3 h-3" />
                Exclude Configs
            </button>
             <button 
                onClick={selectSourceOnly}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-medium text-primary hover:bg-primary/20 transition-all shrink-0"
            >
                <Code2 className="w-3 h-3" />
                Source Only
            </button>
        </div>
    );
};

export default SmartFilters;