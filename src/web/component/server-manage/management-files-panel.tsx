import ManagementFiles from './management-files';
import { useServerManagementFiles } from '../../contexts/serverManagementFiles';

export default function ManagementFilesPanel() {
  const {
    fileStructure,
    selectedFiles,
    onFileSelect,
    onCompress,
    onUncompress,
    handleFileChange,
    handleFileRead,
    handleCreate,
    handleDelete,
    handleRename,
    handleUpload,
    handleDownload,
    showConfirmDialog,
  } = useServerManagementFiles();

  return (
    <ManagementFiles
      fileStructure={fileStructure}
      selectedFiles={selectedFiles}
      onFileSelect={onFileSelect}
      onCompress={onCompress}
      onUncompress={onUncompress}
      onNavigate={() => {}}
      handleFileChange={handleFileChange}
      handleFileRead={handleFileRead}
      handleCreate={handleCreate}
      handleDelete={handleDelete}
      handleRename={handleRename}
      handleUpload={handleUpload}
      handleDownload={handleDownload}
      showConfirmDialog={showConfirmDialog}
    />
  );
}
