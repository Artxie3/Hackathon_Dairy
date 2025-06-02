import React, { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';
import '../styles/FileUploader.css';

interface FileUploaderProps {
  onFileUpload: (file: File) => Promise<string>;
  onFileDelete: (fileUrl: string) => Promise<void>;
  existingFiles?: string[];
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUpload,
  onFileDelete,
  existingFiles = [],
  maxFiles = 5,
  maxSize = 100,
  acceptedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/markdown',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ],
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    if (!acceptedTypes.includes(file.type)) {
      return 'File type not supported';
    }

    if (existingFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await onFileUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input value to allow uploading the same file again
    e.target.value = '';
  };

  const getFileName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'file';
      // Remove the timestamp prefix if present
      return fileName.replace(/^\d+-\d+\./, '');
    } catch {
      return 'file';
    }
  };

  const getFileIcon = (url: string) => {
    const fileName = getFileName(url).toLowerCase();
    
    if (fileName.includes('.pdf')) return '��';
    if (fileName.includes('.doc') || fileName.includes('.docx')) return '📝';
    if (fileName.includes('.xls') || fileName.includes('.xlsx')) return '📊';
    if (fileName.includes('.zip') || fileName.includes('.rar')) return '🗜️';
    if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png') || fileName.includes('.gif')) return '🖼️';
    if (fileName.includes('.txt') || fileName.includes('.md')) return '📋';
    
    return '📎';
  };

  const handleDelete = async (fileUrl: string) => {
    try {
      setError(null);
      await onFileDelete(fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  return (
    <div className="file-uploader">
      {/* Upload Area */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          accept={acceptedTypes.join(',')}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        
        <div className="upload-content">
          {isUploading ? (
            <>
              <div className="upload-spinner"></div>
              <p>Uploading...</p>
            </>
          ) : (
            <>
              <Upload size={24} />
              <p>
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="upload-hint">
                Max {maxSize}MB • {maxFiles - existingFiles.length} files remaining
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="uploaded-files">
          <h4>Attachments ({existingFiles.length})</h4>
          <div className="files-list">
            {existingFiles.map((fileUrl, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-icon">{getFileIcon(fileUrl)}</span>
                  <span className="file-name">{getFileName(fileUrl)}</span>
                </div>
                <div className="file-actions">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-download"
                    title="Open file"
                  >
                    <File size={14} />
                  </a>
                  {!disabled && (
                    <button
                      onClick={() => handleDelete(fileUrl)}
                      className="file-delete"
                      title="Delete file"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 