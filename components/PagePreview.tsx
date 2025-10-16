
import React from 'react';

interface PagePreviewProps {
  dataUrl: string;
  pageNum: number;
  isSelected: boolean;
  onClick: (pageNum: number) => void;
  accentColor: 'blue' | 'teal';
}

export const PagePreview: React.FC<PagePreviewProps> = ({ dataUrl, pageNum, isSelected, onClick, accentColor }) => {
  const selectionClasses = isSelected 
    ? (accentColor === 'blue' ? 'ring-4 ring-blue-500 ring-offset-2' : 'ring-4 ring-teal-500 ring-offset-2')
    : 'ring-1 ring-slate-300 hover:ring-2 hover:ring-slate-400';

  return (
    <div 
      className="relative cursor-pointer group"
      onClick={() => onClick(pageNum)}
    >
      <img 
        src={dataUrl} 
        alt={`Page ${pageNum}`} 
        className={`w-full rounded-md shadow-md transition-all duration-200 ${selectionClasses}`}
      />
      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
        {pageNum}
      </div>
      {isSelected && (
        <div className="absolute inset-0 bg-white/20 rounded-md pointer-events-none"></div>
      )}
    </div>
  );
};
