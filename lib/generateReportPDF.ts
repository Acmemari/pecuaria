import { jsPDF } from 'jspdf';
import { CattleCalculatorInputs, CalculationResults } from '../types';

interface PDFReportData {
  inputs: CattleCalculatorInputs;
  results: CalculationResults;
  scenarioName: string;
  createdAt?: string;
  userName?: string;
}

export function generateReportPDF(data: PDFReportData): void {
  const { inputs, results, scenarioName, createdAt, userName } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper function to add text with automatic wrapping
  const addText = (text: string, x: number, y: number, fontSize: number = 10, isBold: boolean = false, maxWidth?: number) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.4);
    } else {
      doc.text(text, x, y);
      return fontSize * 0.4;
    }
  };

  // Helper function to add a section header
  const addSectionHeader = (title: string, y: number): number => {
    yPos = y;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
    const lineHeight = addText(title, margin + 2, yPos, 12, true);
    yPos += lineHeight + 2;
    return yPos;
  };

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to format percentage
  const formatPercent = (value: number): string => {
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  // Title
  addText('Calculadora de Resultado Pecuário', margin, yPos, 16, true);
  yPos += 8;
  if (scenarioName) {
    addText(scenarioName, margin, yPos, 12, true);
    yPos += 6;
    if (userName) {
      addText(`Gerado por: ${userName}`, margin, yPos, 10);
      yPos += 5;
    }
  }
  if (createdAt) {
    addText(`Data: ${new Date(createdAt).toLocaleDateString('pt-BR')}`, margin, yPos, 8);
    yPos += 6;
  }
  yPos += 5;

  // PREMISSAS Section - Two columns
  yPos = addSectionHeader('PREMISSAS', yPos);
  
  const premissasData = [
    ['Peso de Compra:', `${inputs.pesoCompra} kg`],
    ['Valor de Compra:', `R$ ${inputs.valorCompra.toFixed(2)}/kg`],
    ['Peso Vivo Abate:', `${inputs.pesoAbate} kg`],
    ['Rend. Carcaça:', `${inputs.rendimentoCarcaca}%`],
    ['Valor Venda:', `R$ ${inputs.valorVenda}/@`],
    ['GMD (Ganho Médio Diário):', `${inputs.gmd} kg/dia`],
    ['Desembolso/cab/mês:', `R$ ${inputs.custoMensal}/mês`],
    ['Lotação:', `${inputs.lotacao} UA/HA`]
  ];

  // Split into two columns
  const midPoint = Math.ceil(premissasData.length / 2);
  const leftColumn = premissasData.slice(0, midPoint);
  const rightColumn = premissasData.slice(midPoint);
  const columnWidth = (contentWidth - 10) / 2;
  const lineHeight = 5;
  
  let startY = yPos;
  const maxRows = Math.max(leftColumn.length, rightColumn.length);
  
  for (let i = 0; i < maxRows; i++) {
    // Left column
    if (i < leftColumn.length) {
      const [label, value] = leftColumn[i];
      addText(label, margin + 5, startY + (i * lineHeight), 9);
      addText(value, margin + 45, startY + (i * lineHeight), 9, true);
    }
    
    // Right column
    if (i < rightColumn.length) {
      const [label, value] = rightColumn[i];
      addText(label, margin + columnWidth + 5, startY + (i * lineHeight), 9);
      addText(value, margin + columnWidth + 45, startY + (i * lineHeight), 9, true);
    }
  }
  
  yPos = startY + (maxRows * lineHeight) + 3;

  // INDICADORES CHAVE Section (4 cards in a single row)
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }
  yPos = addSectionHeader('INDICADORES CHAVE', yPos);

  const keyIndicators = [
    { label: 'RESULTADO POR BOI', value: formatCurrency(results.resultadoPorBoi), color: results.resultadoPorBoi >= 0 ? [34, 139, 34] : [220, 20, 60] },
    { label: 'TIR MENSAL', value: `${formatPercent(results.resultadoMensal)} a.m.`, color: results.resultadoMensal >= 0 ? [34, 139, 34] : [220, 20, 60] },
    { label: 'MARGEM %', value: formatPercent(results.margemVenda), color: results.margemVenda >= 0 ? [34, 139, 34] : [220, 20, 60] },
    { label: 'RESULTADO POR HECTARE', value: formatCurrency(results.resultadoPorHectareAno), color: results.resultadoPorHectareAno >= 0 ? [34, 139, 34] : [220, 20, 60] }
  ];

  // 4 blocks in a single row
  const cardWidth = (contentWidth - 15) / 4; // 4 cards with spacing
  const cardHeight = 25;
  const cardSpacing = 5;

  keyIndicators.forEach((indicator, index) => {
    const x = margin + (index * (cardWidth + cardSpacing));
    const y = yPos;

    // Card background
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, cardWidth, cardHeight);

    // Label
    addText(indicator.label, x + 3, y + 6, 7, false, cardWidth - 6);
    
    // Value
    doc.setTextColor(indicator.color[0], indicator.color[1], indicator.color[2]);
    addText(indicator.value, x + 3, y + 14, 10, true, cardWidth - 6);
    doc.setTextColor(0, 0, 0);
  });
  
  yPos += cardHeight + 5;

  // ANÁLISE DETALHADA Section
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }
  yPos += 3; // Same spacing as other sections
  yPos = addSectionHeader('ANÁLISE DETALHADA', yPos);

  const detalhadaData = [
    ['Valor de Venda:', formatCurrency(results.valorBoi)],
    ['Desemb. Total:', formatCurrency(results.custoTotal)],
    ['Desemb./@ Produzida:', formatCurrency(results.custoPorArrobaProduzida)],
    ['Desemb./@ Final:', formatCurrency(results.custoPorArrobaFinal)],
    ['Peso Final Arrobas:', `${results.pesoFinalArrobas.toFixed(2)} @`],
    ['Arrobas Produzidas:', `${results.arrobasProduzidas.toFixed(2)} @`],
    ['Permanência:', `${results.diasPermanencia.toFixed(0)} dias / ${results.mesesPermanencia.toFixed(1)} m`],
    ['Giro de Estoque:', formatPercent(results.giroEstoque)],
    ['Produção @/ha:', `${results.producaoArrobaPorHa.toFixed(2)} @/ha`],
    ['Resultado por @ Final:', formatCurrency(results.resultadoPorArrobaFinal)],
    ['Resultado/Ano:', `${formatPercent(results.resultadoAnual)} a.a.`]
  ];

  detalhadaData.forEach(([label, value]) => {
    addText(label, margin + 5, yPos, 9);
    addText(value, margin + 70, yPos, 9, true);
    yPos += 5;
  });
  yPos += 5;

  // MATRIZ DE SENSIBILIDADE Section
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }
  yPos = addSectionHeader('MATRIZ DE SENSIBILIDADE (Resultado/Boi R$)', yPos);

  // Generate sensitivity matrix data (using same logic as calculator)
  const variations = [-0.10, -0.05, 0, 0.05, 0.10];
  
  const matrixCols = variations.map(v => ({
    label: v === 0 ? 'Base' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`,
    valorVenda: inputs.valorVenda * (1 + v),
    variation: v
  }));

  const matrixRows = variations.map(v => ({
    label: v === 0 ? 'Base' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`,
    valorCompra: inputs.valorCompra * (1 + v),
    variation: v
  }));

  // Calculate matrix cells using the same logic as the calculator
  const matrixCells: number[][] = [];
  matrixRows.forEach(row => {
    const rowCells: number[] = [];
    matrixCols.forEach(col => {
      // Recalculate with variations (same logic as CattleProfitCalculator)
      const custoCompraVar = inputs.pesoCompra * row.valorCompra;
      const valorBoiVar = results.pesoFinalArrobas * col.valorVenda;
      const resultadoVar = valorBoiVar - custoCompraVar - results.custoOperacional;
      rowCells.push(resultadoVar);
    });
    matrixCells.push(rowCells);
  });

  // Find min and max for color coding
  const allValues = matrixCells.flat();
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  // Draw table
  const tableStartY = yPos;
  const cellWidth = (contentWidth - 30) / 6; // 1 for row header + 5 for columns
  const cellHeight = 8;
  const headerHeight = 15;

  // Header row
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, cellWidth, headerHeight, 'F');
  addText('Vl. Venda →', margin + 2, tableStartY + 5, 7);
  addText('Vl. Compra ↓', margin + 2, tableStartY + 10, 7);

  matrixCols.forEach((col, colIndex) => {
      const x = margin + cellWidth + (colIndex * cellWidth);
      const isBase = colIndex === 2;
      if (isBase) {
        doc.setFillColor(230, 240, 255);
      } else {
        doc.setFillColor(240, 240, 240);
      }
      doc.rect(x, tableStartY, cellWidth, headerHeight, 'F');
    addText(col.label, x + 2, tableStartY + 5, 7);
    addText(`R$ ${col.valorVenda.toFixed(0)}`, x + 2, tableStartY + 10, 7, true);
  });

  // Data rows
  matrixRows.forEach((row, rowIndex) => {
    const y = tableStartY + headerHeight + (rowIndex * cellHeight);
    const isBase = rowIndex === 2;

    // Row header
    if (isBase) {
      doc.setFillColor(230, 240, 255);
    } else {
      doc.setFillColor(240, 240, 240);
    }
    doc.rect(margin, y, cellWidth, cellHeight, 'F');
    addText(row.label, margin + 2, y + 5, 7);
    addText(`R$ ${row.valorCompra.toFixed(1)}/kg`, margin + 2, y + 8, 6);

    // Matrix cells
    matrixCells[rowIndex].forEach((cell, colIndex) => {
      const x = margin + cellWidth + (colIndex * cellWidth);
      const isBaseCell = rowIndex === 2 && colIndex === 2;
      
      // Color coding
      if (isBaseCell) {
        doc.setFillColor(230, 240, 255);
        doc.setDrawColor(70, 130, 180);
        doc.setLineWidth(1);
      } else {
        const intensity = (cell - minValue) / (maxValue - minValue);
        if (cell >= 0) {
          // Green gradient
          const green = Math.floor(200 + (55 * intensity));
          doc.setFillColor(240, green, 240);
        } else {
          // Red gradient
          const red = Math.floor(255 - (55 * Math.abs(intensity)));
          doc.setFillColor(red + 15, 200, 200);
        }
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
      }
      doc.rect(x, y, cellWidth, cellHeight, 'FD');

      // Cell value
      const color = cell >= 0 ? [34, 139, 34] : [220, 20, 60];
      doc.setTextColor(color[0], color[1], color[2]);
      addText(cell.toFixed(0), x + 2, y + 6, 8, true);
      doc.setTextColor(0, 0, 0);
    });
  });

  // Footer
  const footerY = pageHeight - margin - 5;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Gerado por PecuarIA - Calculadora de Resultado Pecuário', pageWidth / 2, footerY, { align: 'center' });

  // Save PDF
  const fileName = scenarioName 
    ? `relatorio-${scenarioName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
    : `relatorio-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

