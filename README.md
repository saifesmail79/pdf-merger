# PDF Page Merger

A lightweight, client-side tool for merging specific pages from two PDF files. Upload each document, choose the pages you want to keep, and download a single merged PDF. Everything runs entirely in your browser using plain HTML, CSS, and JavaScript.

## Getting Started

1. Download or clone this repository.
2. Open [`index.html`](index.html) in any modern desktop browser (Chrome, Edge, Firefox, or Safari).
3. Upload two PDF files, select the pages to merge, and click **Merge Selected Pages**.

> **Tip:** Page previews are rendered in the browser, so large PDFs may take a moment to process.

## Technology

- [pdf-lib](https://pdf-lib.js.org/) for assembling the merged PDF.
- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) for generating page previews.
- Vanilla HTML, CSS, and JavaScript—no build tools or frameworks required.

## Browser Support

The app relies on modern browser APIs such as `URL.createObjectURL` and `ArrayBuffer`. Any evergreen desktop browser released in the last few years should work correctly.
