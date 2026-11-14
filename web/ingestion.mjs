// PDF bytes and OCR pixels are processed only in this browser.
export async function readDocument(file, onStatus = () => {}, signal) {
  if (file.size > 10 * 1024 * 1024) throw new Error('File is larger than 10 MB. Use a smaller document.');
  let text = '';
  let usedOCR = false;
  const aborted = () => { if (signal?.aborted) throw new DOMException('Reading cancelled', 'AbortError'); };
  aborted();
  if (/\.txt$/i.test(file.name)) text = await file.text();
  else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('/vendor/pdfjs/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
    let worker;
    const cancel = () => { task.destroy().catch(() => {}); worker?.terminate().catch(() => {}); };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 30) throw new Error('Use a PDF with 30 pages or fewer.');
      const pages = [];
      let ocrPages = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        aborted();
        onStatus(`Reading page ${i} of ${pdf.numPages} locally…`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let pageText = content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
        if (pageText.trim().length < 30) {
          if (++ocrPages > 5) throw new Error('OCR is limited to 5 scanned pages per document. Split this PDF.');
          usedOCR = true;
          onStatus(`Recognizing scanned page ${i} locally. This may take a moment…`);
          if (!worker) {
            const { default: { createWorker } } = await import('/vendor/tesseract/tesseract.esm.min.js');
            worker = await createWorker('eng', 1, {
              workerPath: '/vendor/tesseract/worker.min.js',
              corePath: '/vendor/tesseract-core',
              langPath: '/vendor/tessdata',
              workerBlobURL: false,
              cacheMethod: 'none',
            });
            aborted();
          }
          const original = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(3, 2400 / Math.max(original.width, original.height)) });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          try { pageText = (await worker.recognize(canvas)).data.text; }
          finally { canvas.width = 0; canvas.height = 0; }
        }
        pages.push(`[Page ${i}]\n${pageText}`);
        if (pages.join('\n').length > 100000) throw new Error('Too much text. Use a shorter document.');
        page.cleanup();
      }
      text = pages.join('\n\n');
    } finally {
      signal?.removeEventListener('abort', cancel);
      await worker?.terminate();
      await task.destroy();
    }
  } else throw new Error('Choose a PDF or .txt file.');
  aborted();
  if (!text.replace(/\[Page \d+\]/g, '').trim()) throw new Error('No readable text found. Enter the amounts manually.');
  if (text.length > 100000) throw new Error('Too much text. Use a shorter document.');
  return { text, usedOCR };
}
