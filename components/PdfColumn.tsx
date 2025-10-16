
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PagePreview } from './PagePreview';
import { Spinner } from './Spinner';
import { UploadIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import { renderPdfPages, parsePageRanges } from '../services/pdfProcessor';

interface PdfColumnProps {
  title: string;
  onFileChange: (file: File | null) => void;
  selectedPages: number[];
  onSelectedPagesChange: (pages: number[]) => void;
  accentColor: 'blue' | 'teal';
}

export function PdfColumn({ title, onFileChange, selectedPages, onSelectedPagesChange, accentColor }: PdfColumnProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);
  const [pageInput, setPageInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.5);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a valid PDF file.');
        return;
      }
      setIsLoading(true);
      setError(null);
      setFile(selectedFile);
      onFileChange(selectedFile);
      onSelectedPagesChange([]);

      try {
        const previews = await renderPdfPages(selectedFile);
        setPagePreviews(previews);
      } catch (err) {
        setError('Could not read or render the PDF file.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [onFileChange, onSelectedPagesChange]);

  const togglePageSelection = useCallback((pageNum: number) => {
    const newSelectedPages = selectedPages.includes(pageNum)
      ? selectedPages.filter(p => p !== pageNum)
      : [...selectedPages, pageNum];
    onSelectedPagesChange(newSelectedPages.sort((a, b) => a - b));
  }, [selectedPages, onSelectedPagesChange]);
  
  // Update text input when selected pages change (e.g., from clicking)
  useEffect(() => {
    setPageInput(selectedPages.join(', '));
  }, [selectedPages]);

  // Update selected pages when text input changes
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPageInput = e.target.value;
    setPageInput(newPageInput);
    const parsedPages = parsePageRanges(newPageInput).filter(p => p > 0 && p <= pagePreviews.length);
    onSelectedPagesChange(parsedPages);
  };

  const colorClasses = useMemo(() => ({
    bg: accentColor === 'blue' ? 'bg-blue-50' : 'bg-teal-50',
    border: accentColor === 'blue' ? 'border-blue-300' : 'border-teal-300',
    text: accentColor === 'blue' ? 'text-blue-800' : 'text-teal-800',
    ring: accentColor === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-teal-500',
  }), [accentColor]);

  return (
    <div className={`w-full p-4 sm:p-6 rounded-2xl shadow-lg border ${colorClasses.border} ${colorClasses.bg}`}>
      <h2 className={`text-2xl font-bold mb-4 ${colorClasses.text}`}>{title}</h2>
      
      {!file ? (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
          <UploadIcon />
          <span className="mt-2 text-slate-600">Click to upload a PDF</span>
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
        </label>
      ) : (
        <div>
          <p className="mb-4 text-slate-700 truncate">
            <strong>File:</strong> {file.name}
          </p>

          <div className="mb-4">
            <label htmlFor={`page-input-${title}`} className="block text-sm font-medium text-slate-700 mb-1">
              Select pages (e.g., 1, 3-5)
            </label>
            <input
              type="text"
              id={`page-input-${title}`}
              value={pageInput}
              onChange={handlePageInputChange}
              placeholder="e.g., 1, 3-5, 8"
              className={`w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 ${colorClasses.ring}`}
            />
          </div>
          
          <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Page Previews</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1 rounded-full hover:bg-slate-200 transition"><ZoomOutIcon /></button>
                <span className="text-xs w-8 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1 rounded-full hover:bg-slate-200 transition"><ZoomInIcon /></button>
              </div>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-48"><Spinner /></div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto bg-slate-200/50 rounded-lg p-2 border border-slate-300">
            {pagePreviews.length > 0 && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                    {pagePreviews.map((dataUrl, index) => {
                        const pageNum = index + 1;
                        return (
                        <PagePreview
                            key={`${file?.name}-${pageNum}`}
                            dataUrl={dataUrl}
                            pageNum={pageNum}
                            isSelected={selectedPages.includes(pageNum)}
                            onClick={togglePageSelection}
                            accentColor={accentColor}
                        />
                        );
                    })}
                </div>
            )}
        </div>
      )}
    </div>
  );
}
