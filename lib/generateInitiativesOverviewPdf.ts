import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface GenerateInitiativesOverviewPdfOptions {
  fileName?: string;
}

export async function generateInitiativesOverviewPdf(
  element: HTMLElement,
  options: GenerateInitiativesOverviewPdfOptions = {}
): Promise<void> {
  const { fileName } = options;

  if (typeof document !== 'undefined' && 'fonts' in document) {
    await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
  });

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const pageSliceHeightPx = Math.floor((canvas.width * printableHeight) / printableWidth);
  let offsetPx = 0;
  let pageIndex = 0;

  while (offsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - offsetPx);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;

    const pageContext = pageCanvas.getContext('2d');
    if (!pageContext) {
      throw new Error('Não foi possível gerar contexto de renderização do PDF.');
    }

    pageContext.drawImage(
      canvas,
      0,
      offsetPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx
    );

    const imageData = pageCanvas.toDataURL('image/png');
    const imageHeightMm = (sliceHeightPx * printableWidth) / canvas.width;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(imageData, 'PNG', margin, margin, printableWidth, imageHeightMm, undefined, 'FAST');

    pageIndex += 1;
    offsetPx += sliceHeightPx;
  }

  const finalFileName = fileName ?? `relatorio-iniciativas-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(finalFileName);
}
