import { useRef, useState } from 'react';
import './FileUploader.css';

export default function FileUploader({ onFileParsed, label, accept }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');

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

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div
      className={`file-uploader ${dragging ? 'dragging' : ''} ${fileName ? 'has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept || '.xlsx,.xls,.csv'}
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="file-uploader-content">
        <div className="file-uploader-icon">
          {fileName ? '\u{2705}' : '\u{1F4C2}'}
        </div>
        <p className="file-uploader-title">
          {fileName ? 'File loaded successfully' : (label || 'Drop file here or click to browse')}
        </p>
        <p className="file-uploader-formats">.xlsx, .xls, .csv</p>
        {fileName && <p className="file-uploader-filename">{fileName}</p>}
        <button type="button" className="file-uploader-btn" onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}>
          {fileName ? 'Change File' : 'Select File'}
        </button>
      </div>
    </div>
  );
}
