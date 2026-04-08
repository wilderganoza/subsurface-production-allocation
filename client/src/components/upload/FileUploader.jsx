import { useState, useRef } from 'react';
import './FileUploader.css';

export default function FileUploader({ onFileParsed, label }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const { parseFile } = await import('../../utils/fileParser.js');
      const result = await parseFile(file);
      onFileParsed(result);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleFileSelect = (e) => {
    handleFile(e.target.files[0]);
  };

  return (
    <div
      className={`file-uploader ${dragging ? 'dragging' : ''} ${fileName ? 'has-file' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={label || 'Upload file'}
    >
      <div className="file-uploader-content">
        <div className="file-uploader-icon">📁</div>
        <div className="file-uploader-title">{label || 'Drop file here'}</div>
        <div className="file-uploader-subtitle">Supports .xlsx, .xls, .csv</div>
        {fileName && <div className="file-uploader-filename">{fileName}</div>}
      </div>
      <div className="file-uploader-actions">
        <button type="button" className="file-uploader-btn primary" onClick={handleClick}>
          {fileName ? 'Replace File' : 'Upload File'}
        </button>
        <button
          type="button"
          className="file-uploader-btn secondary"
          onClick={handleClick}
          aria-label="Browse files from device"
        >
          Browse Files
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
}
