import React, { useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`h-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors duration-200 ease-in-out ${
        dragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-indigo-100 rounded-full">
          <span className="material-icons text-indigo-600 text-4xl">receipt_long</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Upload Receipt</h3>
          <p className="text-gray-500 mt-2">Drag & drop your receipt image here, or click to browse</p>
        </div>
        
        <label className={`
          relative cursor-pointer px-6 py-3 rounded-lg font-medium transition-all
          ${isLoading 
            ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30"
          }
        `}>
          <span>{isLoading ? "Analyzing..." : "Choose File"}</span>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleChange} 
            disabled={isLoading}
          />
        </label>
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-indigo-600 animate-pulse mt-4">
            <span className="material-icons text-sm">auto_awesome</span>
            <span className="text-sm font-medium">Gemini is reading your receipt...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
