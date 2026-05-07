import DirectoryDisplay from '../directoryDisplay';
import { FolderOpen } from 'lucide-react';
import {
  type DirectoryStructure,
  type DirectoryType,
} from '../../utils/directoryType';

export default function ManagementFiles({
  fileStructure,
  selectedFiles,
  onFileSelect,
  onCompress,
  onUncompress,
  onNavigate,
  handleFileChange,
  handleFileRead,
  handleCreate,
  handleDelete,
  handleRename,
  handleUpload,
  handleDownload,
  showConfirmDialog,
}: {
  fileStructure: DirectoryStructure;
  selectedFiles: string[];
  onFileSelect: (fileName: string) => void;
  onCompress: (path: string, files: string[]) => void;
  onUncompress: (path: string, zipFile: string) => void;
  onNavigate: (path: string[]) => void;
  handleFileChange: (path: string, content: string) => void;
  handleFileRead: (path: string) => Promise<string>;
  handleCreate: (path: string, type: DirectoryType) => void;
  handleDelete: (
    path: string,
    type: DirectoryType,
    recursive: boolean,
  ) => Promise<boolean>;
  handleRename: (oldPath: string, newPath: string) => Promise<void>;
  handleUpload: (path: string, file: File) => Promise<void>;
  handleDownload: (path: string, fileName: string) => Promise<void>;
  showConfirmDialog?: (options: any) => Promise<boolean>;
}) {
  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden p-4'>
      <div className='mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-200'>
        <FolderOpen className='h-4 w-4' />
        <h3 className='text-lg font-semibold'>File Management</h3>
      </div>
      <div className='min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-300 p-2 dark:border-gray-700'>
        <DirectoryDisplay
          fileStructure={fileStructure}
          currentPath={[]}
          selectedFiles={selectedFiles}
          onFileSelect={onFileSelect}
          onCompress={onCompress}
          onUncompress={onUncompress}
          onNavigate={onNavigate}
          handleFileChange={handleFileChange}
          handleFileRead={handleFileRead}
          handleCreate={handleCreate}
          handleDelete={handleDelete}
          handleRename={handleRename}
          handleUpload={handleUpload}
          handleDownload={handleDownload}
          showConfirmDialog={showConfirmDialog}
        />
      </div>
    </div>
  );
}
