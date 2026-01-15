import JSZip from 'jszip';
import { ProcessingResult, FileEntry, OutputFormat, TreeNode, IGNORED_DIRECTORIES, BINARY_EXTENSIONS, GenerationOptions } from '../types';

const isBinaryData = (buffer: Uint8Array): boolean => {
  // Simple check: look for null bytes in the first 1024 bytes
  const checkLimit = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkLimit; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
};

const stripComments = (content: string, extension: string): string => {
  const ext = extension.toLowerCase();
  if (['.js', '.ts', '.jsx', '.tsx', '.c', '.cpp', '.h', '.hpp', '.java', '.css', '.scss', '.go', '.rs', '.dart', '.kt', '.php'].includes(ext)) {
    return content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
  }
  if (['.py', '.sh', '.yaml', '.yml', '.rb', '.dockerfile', '.toml', '.ini', '.pl'].includes(ext)) {
    return content.replace(/#.*$/gm, '');
  }
  if (['.html', '.xml', '.svg', '.vue', '.svelte'].includes(ext)) {
    return content.replace(/<!--[\s\S]*?-->/g, '');
  }
  return content;
};

const stripConsoleLogs = (content: string, extension: string): string => {
  const ext = extension.toLowerCase();
  if (['.js', '.ts', '.jsx', '.tsx', '.dart'].includes(ext)) {
    return content.replace(/^\s*console\.(log|debug|info|warn|error|trace|dir)\s*\(.*?\);?\s*$/gm, '');
  }
  if (['.java'].includes(ext)) {
    return content.replace(/^\s*System\.(out|err)\.print(ln)?\s*\(.*?\);?\s*$/gm, '');
  }
  if (['.py'].includes(ext)) {
    return content.replace(/^\s*print\s*\(.*?\)\s*$/gm, '');
  }
  if (['.go'].includes(ext)) {
    return content.replace(/^\s*fmt\.(Print|Println|Printf)\s*\(.*?\)\s*$/gm, '');
  }
  return content;
};

const stripImports = (content: string, extension: string): string => {
    const ext = extension.toLowerCase();
    if (['.js', '.ts', '.jsx', '.tsx', '.dart'].includes(ext)) {
        return content
            .replace(/^\s*import\s+[\s\S]*?from\s+['"].*['"];?\s*$/gm, '')
            .replace(/^\s*import\s+['"].*['"];?\s*$/gm, '')
            .replace(/^\s*require\(.*?\);?\s*$/gm, '')
            .replace(/^\s*const\s+.*\s*=\s*require\(.*\);?\s*$/gm, '');
    }
    if (['.py'].includes(ext)) {
        return content
            .replace(/^\s*import\s+.*$/gm, '')
            .replace(/^\s*from\s+.*\s+import\s+.*$/gm, '');
    }
    if (['.java'].includes(ext)) {
        return content.replace(/^\s*package\s+.*;\s*$/gm, '').replace(/^\s*import\s+.*;\s*$/gm, '');
    }
    if (['.cs'].includes(ext)) {
        return content.replace(/^\s*using\s+.*;\s*$/gm, '');
    }
    return content;
}

const removeEmptyLines = (content: string): string => {
  return content.replace(/^\s*[\r\n]/gm, '').replace(/\n{3,}/g, '\n\n');
};

const minifyWhitespace = (content: string, extension: string): string => {
    const ext = extension.toLowerCase();
    if (ext === '.json') {
        try {
            return JSON.stringify(JSON.parse(content));
        } catch (e) {
            return content.replace(/\s+/g, '');
        }
    }
    if (ext === '.html' || ext === '.xml' || ext === '.svg') {
        return content.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ');
    }
    // General code minification (very basic)
    return content.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
}

const skeletonizeCode = (content: string, extension: string): string => {
    // A heuristic approach to keep declarations but remove function bodies
    // This is not a full AST parser but works well for LLM context reduction
    const lines = content.split('\n');
    const keptLines: string[] = [];
    const importantKeywords = [
        'class ', 'interface ', 'type ', 'function ', 'export ', 'const ', 'let ', 'var ', 
        'namespace ', 'enum ', 'struct ', 'impl ', 'trait ',
        'public ', 'private ', 'protected ', '@' 
    ];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return;
        
        // Keep closing braces to maintain some structure visual
        if (trimmed === '}' || trimmed === '};' || trimmed === ']' || trimmed === '];' || trimmed === ')') {
            keptLines.push(line);
            return;
        }

        const startsWithKeyword = importantKeywords.some(kw => trimmed.startsWith(kw));
        const endsWithStructure = trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith(':');

        if (startsWithKeyword || endsWithStructure) {
            keptLines.push(line);
        } 
        else if (trimmed.match(/^\w+\s*\(.*\)\s*\{?$/)) { // Function-like pattern
             keptLines.push(line);
        }
    });
    return keptLines.join('\n');
}

const truncateLargeValues = (content: string): string => {
    const threshold = 150;
    // Look for long strings in quotes
    return content.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
        if (match.length > threshold) {
            return match.substring(0, 10) + `...[${match.length} chars truncated]...` + match.substring(match.length - 10);
        }
        return match;
    });
}

const buildTree = (paths: string[], filesMap: Map<string, FileEntry>): TreeNode => {
  const root: TreeNode = { name: 'root', path: '', type: 'folder', children: [] };

  paths.forEach(path => {
    const parts = path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (!current.children) current.children = [];
      
      let existing = current.children.find(child => child.name === part);
      const isFile = index === parts.length - 1;
      const fullPath = parts.slice(0, index + 1).join('/');

      if (!existing) {
        existing = {
          name: part,
          path: fullPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          entry: isFile ? filesMap.get(fullPath) : undefined,
          size: isFile ? filesMap.get(fullPath)?.size : 0
        };
        current.children.push(existing);
      }
      current = existing;
    });
  });

  // Sort: Folders first, then files, alphabetical
  const sortNode = (node: TreeNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
      node.children.forEach(sortNode);
    }
  };
  sortNode(root);

  return root;
};

export const filterTree = (node: TreeNode, query: string): TreeNode | null => {
    if (!query) return node;
    const lowerQuery = query.toLowerCase();
    
    const matchesSelf = node.name.toLowerCase().includes(lowerQuery);
    
    if (node.type === 'file') {
        return matchesSelf ? { ...node } : null;
    }
    
    if (node.children) {
        const filteredChildren = node.children
            .map(child => filterTree(child, query))
            .filter((child): child is TreeNode => child !== null);
            
        if (filteredChildren.length > 0) return { ...node, children: filteredChildren };
        if (matchesSelf) return { ...node, children: node.children }; // Keep folders if they match name, even if children don't
    }
    
    return null;
};

export const calculateLanguageStats = (selectedFiles: FileEntry[]) => {
    const stats: Record<string, number> = {};
    selectedFiles.forEach(f => {
        const ext = f.extension || 'other';
        stats[ext] = (stats[ext] || 0) + 1;
    });
    return Object.entries(stats)
        .sort((a, b) => b[1] - a[1])
        .map(([ext, count]) => ({ ext, count }));
}

export const generateOutput = (
  filesMap: Map<string, FileEntry>, 
  selectedPaths: Set<string>, 
  format: OutputFormat,
  options: GenerationOptions
): { 
    content: string, 
    stats: { tokenCount: number, charCount: number, fileCount: number },
    rawStats: { tokenCount: number },
    languageStats: { ext: string, count: number }[]
} => {
  const selectedFiles: FileEntry[] = [];
  let rawCharCount = 0;

  // Deduplication map
  const contentMap = new Map<string, string>(); 

  for (const path of selectedPaths) {
    const entry = filesMap.get(path);
    if (entry) {
        let content = entry.content;
        rawCharCount += content.length;

        // Apply transformations order matters
        if (options.truncateLargeValues) content = truncateLargeValues(content);
        if (options.removeImports) content = stripImports(content, entry.extension);
        if (options.removeConsoleLogs) content = stripConsoleLogs(content, entry.extension);
        if (options.removeComments) content = stripComments(content, entry.extension);
        
        if (options.skeletonize) {
            content = skeletonizeCode(content, entry.extension);
            content = removeEmptyLines(content);
        }

        if (options.minifyWhitespace) {
            content = minifyWhitespace(content, entry.extension);
        }
        
        if (options.removeEmptyLines && !options.minifyWhitespace) {
            content = removeEmptyLines(content);
        }

        selectedFiles.push({ ...entry, content });
    }
  }

  selectedFiles.sort((a, b) => a.path.localeCompare(b.path));

  let outputBody = '';

  if (format === 'JSON') {
    const jsonStructure = selectedFiles.reduce((acc, f) => {
        acc[f.path] = f.content;
        return acc;
    }, {} as Record<string, string>);
    outputBody = JSON.stringify(jsonStructure, null, 2);
  } else if (format === 'JSONL') {
    outputBody = selectedFiles.map(f => JSON.stringify({
        metadata: { path: f.path, extension: f.extension, size: f.size },
        text: f.content
    })).join('\n');
  } else {
    outputBody = selectedFiles.map(f => {
        // Simple dedupe for text formats
        if (f.content.length > 50) {
            const existingPath = contentMap.get(f.content);
            if (existingPath) {
                if (format === 'DENSE') {
                    return `@@ ${f.path} @@\n(Identical to ${existingPath})`;
                } else if (format === 'MARKDOWN') {
                     return `## File: ${f.path}\n> Content identical to [${existingPath}](#${existingPath.replace(/\s/g, '-')})`;
                } else if (format === 'XML') {
                    return `  <file path="${f.path}" ref="${existingPath}" />`;
                } else {
                    return `===== FILE: ${f.path} =====\n(Identical to ${existingPath})`;
                }
            }
            contentMap.set(f.content, f.path);
        }

        switch (format) {
            case 'DENSE':
                return `@@ ${f.path} @@\n${f.content}`;
            case 'MARKDOWN':
                const lang = f.extension.replace('.', '') || 'text';
                return `## File: ${f.path}\n\`\`\`${lang}\n${f.content}\n\`\`\``;
            case 'XML':
                return `  <file path="${f.path}">\n    <![CDATA[\n${f.content}\n    ]]>\n  </file>`;
            case 'TEXT':
            default:
                return `===== FILE: ${f.path} =====\n${f.content}`;
        }
    }).join('\n\n');

    if (format === 'XML') {
        outputBody = `<codebase>\n${outputBody}\n</codebase>`;
    }
  }

  const finalOutput = options.customPrompt 
    ? `${options.customPrompt}\n\n${outputBody}` 
    : outputBody;
  
  // Approximation: 1 token ~= 4 chars
  const finalTokenCount = Math.ceil(finalOutput.length / 4);
  const rawTokenCount = Math.ceil(rawCharCount / 4);

  return {
    content: finalOutput,
    stats: {
        charCount: finalOutput.length,
        tokenCount: finalTokenCount,
        fileCount: selectedFiles.length
    },
    rawStats: {
        tokenCount: rawTokenCount
    },
    languageStats: calculateLanguageStats(selectedFiles)
  };
};

export const processZipFile = async (file: File): Promise<ProcessingResult> => {
  const zip = new JSZip();
  try {
    await zip.loadAsync(file);
  } catch (error) {
    throw new Error("Invalid ZIP file");
  }

  const filesMap = new Map<string, FileEntry>();
  const ignoredPaths: string[] = [];
  const validPaths: string[] = [];
  const entries = Object.keys(zip.files);

  for (const path of entries) {
    const entry = zip.files[path];
    if (entry.dir) continue;

    const parts = path.split('/');
    const fileName = parts[parts.length - 1];

    // Filter ignored directories
    if (parts.some(p => IGNORED_DIRECTORIES.has(p))) {
      ignoredPaths.push(path);
      continue;
    }

    // Filter dotfiles (except .gitignore, .env which might be useful)
    if (fileName.startsWith('.') && fileName !== '.gitignore' && fileName !== '.env') {
        ignoredPaths.push(path);
        continue;
    }

    const lowerName = fileName.toLowerCase();
    const suffix = lowerName.includes('.') ? `.${lowerName.split('.').pop()}` : '';
    
    if (BINARY_EXTENSIONS.has(suffix)) {
      ignoredPaths.push(path);
      continue;
    }

    try {
      const rawData = await entry.async('uint8array');
      if (isBinaryData(rawData)) {
        ignoredPaths.push(path);
        continue;
      }
      const content = new TextDecoder("utf-8").decode(rawData);
      filesMap.set(path, { path, content, extension: suffix, size: rawData.length });
      validPaths.push(path);
    } catch (e) {
      ignoredPaths.push(path);
    }
  }

  return {
    rawFiles: filesMap,
    root: buildTree(validPaths, filesMap),
    ignoredPaths,
    fileName: file.name.replace(/\.zip$/i, ''),
    stats: {
      totalFilesFound: entries.length,
      processedFilesCount: validPaths.length,
      ignoredFiles: ignoredPaths.length,
      totalSize: 0, 
      estimatedTokens: 0
    }
  };
};