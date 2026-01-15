export interface ProcessedStats {
  totalFilesFound: number;
  processedFilesCount: number;
  totalSize: number;
  ignoredFiles: number;
  estimatedTokens: number;
}

export type OutputFormat = 'TEXT' | 'MARKDOWN' | 'XML' | 'JSON' | 'JSONL' | 'DENSE';

export interface FileEntry {
  path: string;
  content: string;
  extension: string;
  size: number;
}

export interface GenerationOptions {
  removeComments: boolean;
  removeEmptyLines: boolean;
  removeConsoleLogs: boolean;
  removeImports: boolean;
  minifyWhitespace: boolean;
  skeletonize: boolean;
  truncateLargeValues: boolean;
  customPrompt: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  size?: number;
  isIgnored?: boolean;
  entry?: FileEntry;
}

export interface ProcessingResult {
  rawFiles: Map<string, FileEntry>;
  root: TreeNode;
  stats: ProcessedStats;
  fileName: string;
  ignoredPaths: string[];
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export const IGNORED_DIRECTORIES = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out', 'bin', 'obj',
  '.idea', '.vscode', '.next', 'coverage', 'venv', '__pycache__', '.ds_store'
]);

export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.eot', '.ttf', '.woff', '.woff2'
]);
