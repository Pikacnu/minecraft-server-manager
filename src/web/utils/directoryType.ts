import {
  type DirectoryType as ZodDirectoryType,
  type DirectoryStructure as ZodDirectoryStructure,
} from '@/utils/schemas';

export const DirectoryType = {
  File: 'file',
  Directory: 'directory',
} as const;

export type DirectoryType = ZodDirectoryType;
export type DirectoryFileType = 'compressed' | 'textFile';

export type DirectoryFile = {
  name: string;
  format: 'file';
  size: number;
  content?: string;
  fileType: DirectoryFileType;
};

export type DirectoryStructure = ZodDirectoryStructure;
