'use strict';

function parsePageRanges(input) {
  const values = new Set();
  if (!input) {
    return [];
  }

  const parts = input.split(',').map(part => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [startText, endText] = part.split('-').map(token => token.trim());
      const start = Number.parseInt(startText, 10);
      const end = Number.parseInt(endText, 10);
      if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
        for (let value = start; value <= end; value += 1) {
          values.add(value);
        }
      }
    } else {
      const pageNumber = Number.parseInt(part, 10);
      if (!Number.isNaN(pageNumber)) {
        values.add(pageNumber);
      }
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

async function renderPdfPages(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js failed to load.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const previews = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) {
      throw new Error('Could not create a canvas context.');
    }

    await page.render({ canvasContext: context, viewport }).promise;
    previews.push(canvas.toDataURL('image/png'));
  }

  return previews;
}

async function mergePdfs(fileA, pagesA, fileB, pagesB) {
  if (!window.PDFLib || !window.PDFLib.PDFDocument) {
    throw new Error('pdf-lib failed to load.');
  }

  const { PDFDocument } = window.PDFLib;
  const mergedDocument = await PDFDocument.create();

  const fileABuffer = await fileA.arrayBuffer();
  const documentA = await PDFDocument.load(fileABuffer);
  const copiedPagesA = await mergedDocument.copyPages(documentA, pagesA.map(page => page - 1));
  copiedPagesA.forEach(page => mergedDocument.addPage(page));

  const fileBBuffer = await fileB.arrayBuffer();
  const documentB = await PDFDocument.load(fileBBuffer);
  const copiedPagesB = await mergedDocument.copyPages(documentB, pagesB.map(page => page - 1));
  copiedPagesB.forEach(page => mergedDocument.addPage(page));

  return mergedDocument.save();
}

function createPdfColumn(element) {
  const fileInput = element.querySelector('.upload-input');
  const fileDetails = element.querySelector('.file-details');
  const fileNameText = element.querySelector('.file-name');
  const pageInput = element.querySelector('.page-input');
  const previewContainer = element.querySelector('.page-previews');
  const loader = element.querySelector('.loader');
  const errorMessage = element.querySelector('.error-message');
  const zoomValue = element.querySelector('.zoom-value');
  const zoomOutButton = element.querySelector('.zoom-out');
  const zoomInButton = element.querySelector('.zoom-in');

  let file = null;
  let previews = [];
  let selectedPages = [];
  let zoom = 0.5;
  let renderToken = 0;
  const changeHandlers = new Set();

  function notifyChange() {
    changeHandlers.forEach(handler => handler());
  }

  function setError(message) {
    if (message) {
      errorMessage.textContent = message;
      errorMessage.hidden = false;
    } else {
      errorMessage.textContent = '';
      errorMessage.hidden = true;
    }
  }

  function setLoading(isLoading) {
    loader.classList.toggle('hidden', !isLoading);
  }

  function updateZoomDisplay() {
    zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    previewContainer.style.transform = previews.length ? `scale(${zoom})` : 'scale(1)';
  }

  function updatePageInput() {
    pageInput.value = selectedPages.join(', ');
  }

  function renderPreviews() {
    previewContainer.innerHTML = '';
    previewContainer.classList.toggle('empty', previews.length === 0);

    if (previews.length === 0) {
      updateZoomDisplay();
      return;
    }

    previews.forEach((dataUrl, index) => {
      const pageNumber = index + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'page-preview';
      if (selectedPages.includes(pageNumber)) {
        button.classList.add('selected');
      }

      const badge = document.createElement('span');
      badge.className = 'page-preview__number';
      badge.textContent = String(pageNumber);

      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = `Page ${pageNumber} preview`;

      button.append(badge, image);
      button.addEventListener('click', () => {
        if (selectedPages.includes(pageNumber)) {
          selectedPages = selectedPages.filter(page => page !== pageNumber);
        } else {
          selectedPages = [...selectedPages, pageNumber].sort((a, b) => a - b);
        }
        updatePageInput();
        renderPreviews();
        notifyChange();
      });

      previewContainer.appendChild(button);
    });

    updateZoomDisplay();
  }

  function resetColumn() {
    file = null;
    previews = [];
    selectedPages = [];
    pageInput.value = '';
    pageInput.disabled = true;
    fileInput.value = '';
    fileNameText.textContent = '';
    fileDetails.classList.add('hidden');
    setError(null);
    setLoading(false);
    renderPreviews();
    notifyChange();
  }

  fileInput.addEventListener('change', async event => {
    const selectedFile = event.target.files && event.target.files[0];

    if (!selectedFile) {
      resetColumn();
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      fileInput.value = '';
      return;
    }

    renderToken += 1;
    const currentToken = renderToken;

    file = selectedFile;
    fileDetails.classList.remove('hidden');
    fileNameText.textContent = selectedFile.name;
    pageInput.disabled = false;
    selectedPages = [];
    updatePageInput();
    setError(null);
    previews = [];
    renderPreviews();
    notifyChange();
    setLoading(true);

    try {
      const pages = await renderPdfPages(selectedFile);
      if (currentToken !== renderToken) {
        return;
      }
      previews = pages;
      setError(null);
    } catch (error) {
      console.error(error);
      if (currentToken !== renderToken) {
        return;
      }
      previews = [];
      setError('Could not read or render the PDF file.');
    } finally {
      if (currentToken !== renderToken) {
        return;
      }
      setLoading(false);
      renderPreviews();
      if (pageInput.value.trim()) {
        pageInput.dispatchEvent(new Event('input'));
      }
    }
  });

  pageInput.addEventListener('input', () => {
    if (!file) {
      pageInput.value = '';
      return;
    }

    const parsedPages = parsePageRanges(pageInput.value);
    selectedPages = parsedPages.filter(page => page > 0 && page <= previews.length);
    renderPreviews();
    notifyChange();
  });

  zoomOutButton.addEventListener('click', () => {
    zoom = Math.max(0.2, Math.round((zoom - 0.1) * 100) / 100);
    updateZoomDisplay();
  });

  zoomInButton.addEventListener('click', () => {
    zoom = Math.min(1.5, Math.round((zoom + 0.1) * 100) / 100);
    updateZoomDisplay();
  });

  renderPreviews();
  pageInput.disabled = true;

  return {
    getFile() {
      return file;
    },
    getSelectedPages() {
      return [...selectedPages];
    },
    onChange(handler) {
      changeHandlers.add(handler);
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('.app');
  if (!app) {
    return;
  }

  const columnA = createPdfColumn(document.getElementById('pdf-column-1'));
  const columnB = createPdfColumn(document.getElementById('pdf-column-2'));
  const mergeButton = document.getElementById('merge-button');
  const mergeError = document.getElementById('merge-error');
  const downloadSection = document.getElementById('download-section');
  const downloadLink = document.getElementById('download-link');

  if (!mergeButton || !mergeError || !downloadSection || !downloadLink) {
    return;
  }

  let currentDownloadUrl = null;

  function resetDownload() {
    if (currentDownloadUrl) {
      URL.revokeObjectURL(currentDownloadUrl);
      currentDownloadUrl = null;
    }
    downloadSection.hidden = true;
  }

  function updateMergeButtonState() {
    const hasRequirements = Boolean(
      columnA.getFile() &&
      columnB.getFile() &&
      columnA.getSelectedPages().length > 0 &&
      columnB.getSelectedPages().length > 0
    );
    if (mergeButton.dataset.loading === 'true') {
      mergeButton.disabled = true;
    } else {
      mergeButton.disabled = !hasRequirements;
    }
  }

  function setButtonLoading(isLoading) {
    mergeButton.dataset.loading = isLoading ? 'true' : 'false';
    mergeButton.disabled = true;
    const label = mergeButton.querySelector('.button-label');
    if (label) {
      label.textContent = isLoading ? 'Merging…' : 'Merge Selected Pages';
    }
  }

  const onColumnChange = () => {
    resetDownload();
    mergeError.hidden = true;
    mergeError.textContent = '';
    updateMergeButtonState();
  };

  columnA.onChange(onColumnChange);
  columnB.onChange(onColumnChange);
  mergeButton.dataset.loading = 'false';
  updateMergeButtonState();

  mergeButton.addEventListener('click', async () => {
    if (mergeButton.disabled || mergeButton.dataset.loading === 'true') {
      return;
    }

    const fileA = columnA.getFile();
    const fileB = columnB.getFile();
    const pagesA = columnA.getSelectedPages();
    const pagesB = columnB.getSelectedPages();

    if (!fileA || !fileB || pagesA.length === 0 || pagesB.length === 0) {
      mergeError.textContent = 'Please upload both files and select pages to merge.';
      mergeError.hidden = false;
      return;
    }

    mergeError.hidden = true;
    mergeError.textContent = '';
    resetDownload();
    setButtonLoading(true);

    try {
      const mergedBytes = await mergePdfs(fileA, pagesA, fileB, pagesB);
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      currentDownloadUrl = url;
      downloadLink.href = url;
      downloadLink.download = `merged-document-${Date.now()}.pdf`;
      downloadSection.hidden = false;
    } catch (error) {
      console.error(error);
      mergeError.textContent = 'An error occurred while merging the PDFs. Please try again.';
      mergeError.hidden = false;
    } finally {
      setButtonLoading(false);
      updateMergeButtonState();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (currentDownloadUrl) {
      URL.revokeObjectURL(currentDownloadUrl);
    }
  });

  if (!window.pdfjsLib || !window.PDFLib) {
    mergeError.textContent = 'Required PDF libraries failed to load. Please check your connection and refresh the page.';
    mergeError.hidden = false;
    mergeButton.disabled = true;
  }
});
