
import React, { useState, useCallback } from 'react';
import { PdfColumn } from './components/PdfColumn';
import { Spinner } from './components/Spinner';
import { DownloadIcon, MergeIcon } from './components/icons';
import { mergePdfs } from './services/pdfProcessor';

function App() {
  const [pdfFile1, setPdfFile1] = useState<File | null>(null);
  const [selectedPages1, setSelectedPages1] = useState<number[]>([]);

  const [pdfFile2, setPdfFile2] = useState<File | null>(null);
  const [selectedPages2, setSelectedPages2] = useState<number[]>([]);

  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleMergeClick = useCallback(async () => {
    if (!pdfFile1 || !pdfFile2 || selectedPages1.length === 0 || selectedPages2.length === 0) {
      setError('Please upload both files and select pages to merge.');
      return;
    }

    setIsMerging(true);
    setError(null);
    setMergedPdfUrl(null);

    try {
      const mergedPdfBytes = await mergePdfs(pdfFile1, selectedPages1, pdfFile2, selectedPages2);
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
    } catch (err) {
      console.error(err);
      setError('An error occurred while merging the PDFs. Please try again.');
    } finally {
      setIsMerging(false);
    }
  }, [pdfFile1, pdfFile2, selectedPages1, selectedPages2]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900">PDF Page Merger</h1>
          <p className="text-slate-600 mt-2">
            Upload two PDFs, select the pages in the desired order, and merge them into one file.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <PdfColumn
            title="File 1: Invoice"
            onFileChange={setPdfFile1}
            selectedPages={selectedPages1}
            onSelectedPagesChange={setSelectedPages1}
            accentColor="blue"
          />
          <PdfColumn
            title="File 2: Car List"
            onFileChange={setPdfFile2}
            selectedPages={selectedPages2}
            onSelectedPagesChange={setSelectedPages2}
            accentColor="teal"
          />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center">
          <button
            onClick={handleMergeClick}
            disabled={isMerging || !pdfFile1 || !pdfFile2 || selectedPages1.length === 0 || selectedPages2.length === 0}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            {isMerging ? (
              <>
                <Spinner />
                <span>Merging...</span>
              </>
            ) : (
              <>
                <MergeIcon />
                <span>Merge Selected Pages</span>
              </>
            )}
          </button>
          
          {error && <p className="text-red-600 mt-4 text-center">{error}</p>}

          {mergedPdfUrl && (
            <div className="mt-6 text-center animate-fade-in">
              <p className="text-green-700 font-semibold mb-3">Merge Successful!</p>
              <a
                href={mergedPdfUrl}
                download={`merged-document-${Date.now()}.pdf`}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-xl shadow-md hover:bg-green-700 transition-all duration-300 transform hover:scale-105"
              >
                <DownloadIcon />
                Download Merged PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
