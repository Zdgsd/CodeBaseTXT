import React from 'react';
import { motion } from 'framer-motion';

interface LanguageBreakdownProps {
    stats: { ext: string, count: number }[];
    totalFiles: number;
}

const LanguageBreakdown: React.FC<LanguageBreakdownProps> = ({ stats, totalFiles }) => {
    const topStats = stats.slice(0, 5);

    const getColor = (ext: string) => {
        switch(ext) {
            case '.ts': case '.tsx': return 'bg-blue-500';
            case '.js': case '.jsx': return 'bg-yellow-400';
            case '.css': case '.scss': return 'bg-pink-400';
            case '.json': return 'bg-slate-400';
            case '.html': return 'bg-orange-500';
            case '.py': return 'bg-green-500';
            case '.rs': return 'bg-orange-700';
            case '.go': return 'bg-cyan-500';
            default: return 'bg-primary';
        }
    }

    return (
        <div className="bg-surface rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">File Type Breakdown</h3>
            <div className="flex h-2 rounded-full overflow-hidden w-full mb-4">
                {topStats.map((s, i) => (
                    <div 
                        key={s.ext} 
                        className={`${getColor(s.ext)}`} 
                        style={{ width: `${(s.count / totalFiles) * 100}%` }}
                        title={`${s.ext} (${s.count})`}
                    />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
                {topStats.map((s) => (
                    <div key={s.ext} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getColor(s.ext)}`} />
                        <div className="text-xs text-slate-300 font-mono">{s.ext || 'misc'}</div>
                        <div className="text-[10px] text-slate-500 ml-auto">{Math.round((s.count / totalFiles) * 100)}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LanguageBreakdown;