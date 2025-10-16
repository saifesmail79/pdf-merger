
// --- Type declarations for CDN libraries ---
// @ts-ignore
const { PDFDocument } = PDFLib;

declare const pdfjsLib: {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<any> };
};

/**
 * Parses a page range string (e.g., "1, 3-5, 8") into an array of numbers.
 * @param input The string to parse.
 * @returns An array of page numbers.
 */
export const parsePageRanges = (input: string): number[] => {
  const pageNumbers = new Set<number>();
  if (!input) return [];

  const parts = input.split(',').map(part => part.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(num => parseInt(num.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          pageNumbers.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        pageNumbers.add(num);
      }
    }
  }

  return Array.from(pageNumbers).sort((a, b) => a - b);
};

/**
 * Renders each page of a PDF file into a data URL for preview.
 * @param file The PDF file.
 * @returns A promise that resolves to an array of data URLs, one for each page.
 */
export const renderPdfPages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pageDataUrls: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
      pageDataUrls.push(canvas.toDataURL('image/png'));
    }
  }

  return pageDataUrls;
};

/**
 * Merges selected pages from two PDF files into a new PDF.
 * @param file1 The first PDF file.
 * @param pages1 An array of page numbers to take from the first file.
 * @param file2 The second PDF file.
 * @param pages2 An array of page numbers to take from the second file.
 * @returns A promise that resolves to a Uint8Array of the merged PDF.
 */
export const mergePdfs = async (
  file1: File,
  pages1: number[],
  file2: File,
  pages2: number[]
): Promise<Uint8Array> => {
  const newPdfDoc = await PDFDocument.create();

  const file1Buffer = await file1.arrayBuffer();
  const pdf1Doc = await PDFDocument.load(file1Buffer);
  const pages1Indices = pages1.map(p => p - 1); // pdf-lib is 0-indexed
  const copiedPages1 = await newPdfDoc.copyPages(pdf1Doc, pages1Indices);
  copiedPages1.forEach(page => newPdfDoc.addPage(page));

  const file2Buffer = await file2.arrayBuffer();
  const pdf2Doc = await PDFDocument.load(file2Buffer);
  const pages2Indices = pages2.map(p => p - 1);
  const copiedPages2 = await newPdfDoc.copyPages(pdf2Doc, pages2Indices);
  copiedPages2.forEach(page => newPdfDoc.addPage(page));

  return newPdfDoc.save();
};
