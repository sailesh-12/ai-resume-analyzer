/**
 * components/FileUploader.jsx  [Phase 5/6 — upgraded]
 *
 * Improvements:
 *  - Fixed URL.revokeObjectURL memory leak (was created on every render)
 *  - Added keyboard accessibility (Enter/Space to open picker)
 *  - Cleaner visual states using CSS classes
 *  - Clear button removes file properly
 */
import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X } from 'lucide-react';

export default function FileUploader({ onFileSelected }) {
  const [file,       setFile]       = useState(null);
  const [error,      setError]      = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef();

  // Create and revoke object URL safely — fixes the original memory leak
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFiles = (f) => {
    setError('');
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    setFile(f);
    onFileSelected?.(f);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
    onFileSelected?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files?.[0]);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
  };

  return (
    <div className="uploader-root">
      {/* Drop Zone */}
      <div
        className={`dropzone${isDragging ? ' dropzone--dragging' : ''}${file ? ' dropzone--has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={file ? -1 : 0}
        aria-label={file ? `Selected: ${file.name}` : 'Click or drag to upload a PDF resume'}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFiles(e.target.files?.[0])}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {file ? (
          <div className="dropzone__file-info">
            <FileText size={32} className="dropzone__file-icon" aria-hidden="true" />
            <div className="dropzone__file-details">
              <span className="dropzone__file-name">{file.name}</span>
              <span className="dropzone__file-size">
                {(file.size / 1024).toFixed(0)} KB · PDF
              </span>
            </div>
            <button
              className="dropzone__remove"
              onClick={handleRemove}
              aria-label="Remove file"
              title="Remove file"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="dropzone__prompt">
            <div className="dropzone__icon-wrap" aria-hidden="true">
              <Upload size={28} />
            </div>
            <strong className="dropzone__title">Drag &amp; drop your resume</strong>
            <span className="dropzone__subtitle">or <u>click to browse</u> · PDF only</span>
          </div>
        )}
      </div>

      {error && <p className="uploader-error" role="alert">{error}</p>}

      {/* PDF Preview */}
      {previewUrl && (
        <div className="uploader-preview">
          <div className="uploader-preview__header">
            <span>PDF Preview</span>
          </div>
          <iframe
            title="Resume PDF preview"
            src={previewUrl}
            className="uploader-preview__frame"
          />
        </div>
      )}
    </div>
  );
}