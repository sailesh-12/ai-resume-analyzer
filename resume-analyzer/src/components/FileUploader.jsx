import React, { useState, useRef } from "react";

export default function FileUploader({ onFileSelected }) {
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const fileUrl = file ? URL.createObjectURL(file) : null;
    const inputRef = useRef();

    const handleFiles = (f) => {
        setError("");
        if (!f) return;
        if (!["application/pdf"].includes(f.type)) {
            setError("Only PDF files are supported.");
            setFile(null);
            onFileSelected && onFileSelected(null);
            return;
        }
        setFile(f);
        onFileSelected && onFileSelected(f);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        handleFiles(f);
    };

    const onSelect = (e) => {
        const f = e.target.files?.[0];
        handleFiles(f);
    };

    return (
        <div className="uploader-root">
            <div
                className={`dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={onSelect}
                    style={{ display: "none" }}
                />
                <div className="dropzone-content">
                    <strong>Drag & drop a PDF here</strong>
                    <div>or click to browse</div>
                    {file && <div className="file-name">Selected: {file.name}</div>}
                </div>
            </div>

            {error && <div className="error">{error}</div>}

            {file && (
                <div className="preview">
                    <div className="preview-header">
                        <span>Preview</span>
                        <button onClick={() => { setFile(null); onFileSelected && onFileSelected(null); }}>
                            Remove
                        </button>
                    </div>
                    <div className="pdf-preview">
                        {/* Use embed/iframe to preview the PDF blob */}
                        <iframe
                            title="pdf-preview"
                            src={fileUrl}
                            style={{ width: "100%", height: 480, border: "none" }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}