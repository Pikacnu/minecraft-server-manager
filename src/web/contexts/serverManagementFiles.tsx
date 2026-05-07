import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import {
  DirectoryType,
  type DirectoryStructure,
  type DirectoryType as DirectoryTypeValue,
} from '../utils/directoryType';
import { NotificationType } from '../utils/enums';

type ServerManagementFilesContextType = {
  fileStructure: DirectoryStructure;
  selectedFiles: string[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  fetchFileStructure: () => Promise<void>;
  handleFileChange: (path: string, content: string) => void;
  handleFileRead: (path: string) => Promise<string>;
  handleCreate: (path: string, type: DirectoryTypeValue) => void;
  handleDelete: (
    path: string,
    type: DirectoryTypeValue,
    recursive: boolean,
  ) => Promise<boolean>;
  handleRename: (oldPath: string, newPath: string) => Promise<void>;
  handleUpload: (path: string, file: File) => Promise<void>;
  handleDownload: (path: string, fileName: string) => Promise<void>;
  onCompress: (path: string, files: string[]) => Promise<void>;
  onUncompress: (path: string, zipFile: string) => Promise<void>;
  onFileSelect: (fileName: string) => void;
  showConfirmDialog?: (options: any) => Promise<boolean>;
};

const ServerManagementFilesContext = createContext<
  ServerManagementFilesContextType | undefined
>(undefined);

const emptyStructure: DirectoryStructure = {
  name: '/',
  type: DirectoryType.Directory,
  children: [],
};

export function ServerManagementFilesProvider({
  serverId,
  showConfirmDialog,
  addNotification,
  children,
}: {
  serverId: string;
  showConfirmDialog?: (options: any) => Promise<boolean>;
  addNotification: (message: string, type: NotificationType) => void;
  children: React.ReactNode;
}) {
  const [, startTransition] = useTransition();
  const [currentFileStructure, setCurrentFileStructure] =
    useState<DirectoryStructure>(emptyStructure);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const [optimisticFileStructure, addOptimisticFileStructure] = useOptimistic(
    currentFileStructure,
    (state, action: { type: string; payload: any }) => {
      const updateNode = (
        node: DirectoryStructure,
        pathParts: string[],
        updateFn: (n: DirectoryStructure) => DirectoryStructure,
      ): DirectoryStructure => {
        if (pathParts.length === 0) return updateFn(node);
        const [head, ...tail] = pathParts;
        return {
          ...node,
          children: node.children?.map((child) =>
            child.name === head ? updateNode(child, tail, updateFn) : child,
          ),
        };
      };

      switch (action.type) {
        case 'create': {
          const { path, type } = action.payload;
          const parts = path.split('/').filter(Boolean);
          const name = parts.pop();
          return updateNode(state, parts, (node) => ({
            ...node,
            children: [
              ...(node.children || []),
              {
                name: name!,
                type,
                children: type === DirectoryType.Directory ? [] : undefined,
              },
            ],
          }));
        }
        case 'delete': {
          const { path } = action.payload;
          const parts = path.split('/').filter(Boolean);
          const name = parts.pop();
          return updateNode(state, parts, (node) => ({
            ...node,
            children: node.children?.filter((child) => child.name !== name),
          }));
        }
        case 'rename': {
          const { oldPath, newPath } = action.payload;
          const oldParts = oldPath.split('/').filter(Boolean);
          const oldName = oldParts.pop();
          const newName = newPath.split('/').filter(Boolean).pop();
          return updateNode(state, oldParts, (node) => ({
            ...node,
            children: node.children?.map((child) =>
              child.name === oldName ? { ...child, name: newName! } : child,
            ),
          }));
        }
        default:
          return state;
      }
    },
  );

  const fetchFileStructure = async () => {
    if (!serverId) {
      setCurrentFileStructure(emptyStructure);
      return;
    }

    const response = await fetch(
      `/api/file-system?name=${serverId}&type=structure`,
    );
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setCurrentFileStructure(data.data);
        return;
      }
    }

    setCurrentFileStructure(emptyStructure);
  };

  useEffect(() => {
    setSelectedFiles([]);
    void fetchFileStructure();
  }, [serverId]);

  const handleFileChange = (path: string, content: string) => {
    if (!path || !serverId) return;

    const submitFileChange = async () => {
      await fetch(
        `/api/file-system?name=${serverId}&type=file&path=${encodeURIComponent(path)}`,
        { method: 'PUT', body: content },
      );
      void fetchFileStructure();
    };

    void submitFileChange();
  };

  const handleFileRead = async (path: string): Promise<string> => {
    if (!path || !serverId) return '';

    const fileResponse = await fetch(
      `/api/file-system?name=${serverId}&type=file&path=${encodeURIComponent(path)}`,
    );
    if (fileResponse.ok) {
      const data = await fileResponse.json();
      if (data.success) {
        return data.data as string;
      }
      return '';
    }

    return `Error: ${fileResponse.status} ${fileResponse.statusText}`;
  };

  const handleCreate = (path: string, type: DirectoryTypeValue) => {
    if (!serverId) return;

    startTransition(async () => {
      addOptimisticFileStructure({ type: 'create', payload: { path, type } });
      await fetch('/api/file-system', {
        method: 'POST',
        body: JSON.stringify({
          name: serverId,
          type,
          path,
          ...(type === DirectoryType.File ? { content: '' } : {}),
        }),
      });
      void fetchFileStructure();
    });
  };

  const handleDelete = async (
    path: string,
    type: DirectoryTypeValue,
    recursive: boolean,
  ): Promise<boolean> => {
    if (!serverId) return false;
    if (!path) {
      console.error('Cannot delete root directory');
      return false;
    }

    if (recursive) {
      if (type === DirectoryType.File) {
        throw new Error('Invalid state: recursive delete on file');
      }
      const confirmed = await showConfirmDialog?.({
        title: 'Delete Folder Recursively',
        message: `Are you sure you want to recursively delete the folder at ${path} and all its contents?\n\nThis action cannot be undone.`,
        checkboxLabel: 'I understand this will delete all contents permanently',
        requireCheckbox: true,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      });
      if (!confirmed) return false;
    }

    if (type === DirectoryType.Directory && !recursive) {
      const confirmed = await showConfirmDialog?.({
        title: 'Delete Empty Folder',
        message: `Are you sure you want to delete the folder at ${path} without deleting its contents?\n\nThis may fail if the folder is not empty.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      });
      if (!confirmed) return false;
    }

    startTransition(async () => {
      addOptimisticFileStructure({ type: 'delete', payload: { path } });
      try {
        const response = await fetch(`/api/file-system?name=${serverId}`, {
          method: 'DELETE',
          body: JSON.stringify({
            name: serverId,
            path,
            type,
            recursive,
          }),
        });

        if (response.ok) {
          setSelectedFiles([]);
          void fetchFileStructure();
          return;
        }

        const data = await response.json();
        addNotification(
          data.message || 'Unknown error occurred during deletion.',
          NotificationType.Error,
        );
        void fetchFileStructure();
      } catch (error) {
        console.error('Error during delete request:', error);
        void fetchFileStructure();
      }
    });

    return true;
  };

  const handleRename = async (oldPath: string, newPath: string) => {
    if (!serverId) return;

    startTransition(async () => {
      addOptimisticFileStructure({
        type: 'rename',
        payload: { oldPath, newPath },
      });
      await fetch('/api/file-system', {
        method: 'PATCH',
        body: JSON.stringify({
          name: serverId,
          oldPath,
          newPath,
        }),
      });
      setSelectedFiles([]);
      void fetchFileStructure();
    });
  };

  const handleUpload = async (path: string, file: File) => {
    if (!serverId) return;

    startTransition(async () => {
      addOptimisticFileStructure({
        type: 'create',
        payload: { path, type: DirectoryType.File },
      });
      await fetch(
        `/api/file-system?name=${serverId}&type=file&path=${encodeURIComponent(path)}`,
        { method: 'PUT', body: file },
      );
      void fetchFileStructure();
    });
  };

  const handleDownload = async (path: string, fileName: string) => {
    if (!path || !serverId) return;

    const fileResponse = await fetch(
      `/api/file-system?name=${serverId}&type=file&path=${encodeURIComponent(path)}`,
    );
    if (fileResponse.ok) {
      const data = await fileResponse.json();
      if (data.success) {
        const blob = new Blob([data.data], {
          type: 'application/octet-stream',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    }
  };

  const onCompress = async (path: string, files: string[]) => {
    if (!serverId) return;

    const outputPath = path ? `${path}/compressed.zip` : 'compressed.zip';
    await fetch('/api/file-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'compress',
        name: serverId,
        files: files.map((fileName) =>
          path ? `${path}/${fileName}` : fileName,
        ),
        outputPath,
      }),
    });
    setSelectedFiles([]);
    void fetchFileStructure();
  };

  const onUncompress = async (path: string, zipFile: string) => {
    if (!serverId) return;

    const outputDir = path
      ? `${path}/${zipFile}-uncompressed`
      : `${zipFile}-uncompressed`;
    await fetch('/api/file-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'uncompress',
        name: serverId,
        zipPath: path ? `${path}/${zipFile}` : zipFile,
        outputDir,
      }),
    });
    setSelectedFiles([]);
    void fetchFileStructure();
  };

  const onFileSelect = (fileName: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileName)
        ? prev.filter((current) => current !== fileName)
        : [...prev, fileName],
    );
  };

  const value = useMemo<ServerManagementFilesContextType>(
    () => ({
      fileStructure: optimisticFileStructure,
      selectedFiles,
      setSelectedFiles,
      fetchFileStructure,
      handleFileChange,
      handleFileRead,
      handleCreate,
      handleDelete,
      handleRename,
      handleUpload,
      handleDownload,
      onCompress,
      onUncompress,
      onFileSelect,
      showConfirmDialog,
    }),
    [optimisticFileStructure, selectedFiles, showConfirmDialog, serverId],
  );

  return (
    <ServerManagementFilesContext.Provider value={value}>
      {children}
    </ServerManagementFilesContext.Provider>
  );
}

export function useServerManagementFiles() {
  const context = useContext(ServerManagementFilesContext);
  if (!context) {
    throw new Error(
      'useServerManagementFiles must be used within ServerManagementFilesProvider',
    );
  }

  return context;
}
