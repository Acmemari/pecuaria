import { jsPDF } from 'jspdf';
import { CattleCalculatorInputs, CalculationResults } from '../types';

interface PDFReportData {
  inputs: CattleCalculatorInputs;
  results: CalculationResults;
  scenarioName: string;
  createdAt?: string;
  userName?: string;
}

export interface ComparatorScenario {
  id: 'A' | 'B' | 'C';
  name: string;
  inputs: CattleCalculatorInputs;
  results: CalculationResults;
}

export interface ComparatorPDFData {
  scenarios: ComparatorScenario[];
  userName?: string;
  createdAt?: string;
}

export function generateReportPDF(data: PDFReportData): void {
  const { inputs, results, scenarioName, createdAt, userName } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper function to add text with automatic wrapping
  const addText = (
    text: string,
    x: number,
    y: number,
    fontSize: number = 10,
    isBold: boolean = false,
    maxWidth?: number,
  ) => {
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
    ['Lotação:', `${inputs.lotacao} UA/HA`],
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
      addText(label, margin + 5, startY + i * lineHeight, 9);
      addText(value, margin + 45, startY + i * lineHeight, 9, true);
    }

    // Right column
    if (i < rightColumn.length) {
      const [label, value] = rightColumn[i];
      addText(label, margin + columnWidth + 5, startY + i * lineHeight, 9);
      addText(value, margin + columnWidth + 45, startY + i * lineHeight, 9, true);
    }
  }

  yPos = startY + maxRows * lineHeight + 3;

  // INDICADORES CHAVE Section (4 cards in a single row)
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }
  yPos = addSectionHeader('INDICADORES CHAVE', yPos);

  const keyIndicators = [
    {
      label: 'Resultado por cabeça',
      value: formatCurrency(results.resultadoPorBoi),
      color: results.resultadoPorBoi >= 0 ? [34, 139, 34] : [220, 20, 60],
    },
    {
      label: 'TIR MENSAL',
      value: `${formatPercent(results.resultadoMensal)} a.m.`,
      color: results.resultadoMensal >= 0 ? [34, 139, 34] : [220, 20, 60],
    },
    {
      label: 'MARGEM %',
      value: formatPercent(results.margemVenda),
      color: results.margemVenda >= 0 ? [34, 139, 34] : [220, 20, 60],
    },
    {
      label: 'RESULTADO POR HECTARE',
      value: formatCurrency(results.resultadoPorHectareAno),
      color: results.resultadoPorHectareAno >= 0 ? [34, 139, 34] : [220, 20, 60],
    },
  ];

  // 4 blocks in a single row
  const cardWidth = (contentWidth - 15) / 4; // 4 cards with spacing
  const cardHeight = 25;
  const cardSpacing = 5;

  keyIndicators.forEach((indicator, index) => {
    const x = margin + index * (cardWidth + cardSpacing);
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
    ['Resultado/Ano:', `${formatPercent(results.resultadoAnual)} a.a.`],
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
  const variations = [-0.1, -0.05, 0, 0.05, 0.1];

  const matrixCols = variations.map(v => ({
    label: v === 0 ? 'Base' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`,
    valorVenda: inputs.valorVenda * (1 + v),
    variation: v,
  }));

  const matrixRows = variations.map(v => ({
    label: v === 0 ? 'Base' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`,
    valorCompra: inputs.valorCompra * (1 + v),
    variation: v,
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
    const x = margin + cellWidth + colIndex * cellWidth;
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
    const y = tableStartY + headerHeight + rowIndex * cellHeight;
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
      const x = margin + cellWidth + colIndex * cellWidth;
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
          const green = Math.floor(200 + 55 * intensity);
          doc.setFillColor(240, green, 240);
        } else {
          // Red gradient
          const red = Math.floor(255 - 55 * Math.abs(intensity));
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

/**
 * Generate PDF report for Comparator (3 scenarios comparison)
 */
export function generateComparatorPDF(data: ComparatorPDFData): void {
  const { scenarios, userName, createdAt } = data;

  if (scenarios.length !== 3) {
    throw new Error('É necessário ter exatamente 3 cenários para gerar o relatório comparativo');
  }

  const scenarioA = scenarios.find(s => s.id === 'A');
  const scenarioB = scenarios.find(s => s.id === 'B');
  const scenarioC = scenarios.find(s => s.id === 'C');

  if (!scenarioA || !scenarioB || !scenarioC) {
    throw new Error('Cenários A, B e C são obrigatórios');
  }

  // Determine winning scenario (based on resultadoPorHectareAno)
  const winningScenario = [scenarioA, scenarioB, scenarioC].reduce((prev, curr) =>
    curr.results.resultadoPorHectareAno > prev.results.resultadoPorHectareAno ? curr : prev,
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper functions
  const addText = (
    text: string,
    x: number,
    y: number,
    fontSize: number = 10,
    isBold: boolean = false,
    maxWidth?: number,
    align: 'left' | 'center' | 'right' = 'left',
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y, { align });
      return lines.length * (fontSize * 0.4);
    } else {
      doc.text(text, x, y, { align });
      return fontSize * 0.4;
    }
  };

  const formatCurrency = (value: number): string => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number): string => {
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  // 1. Header
  addText(
    'Calculadora de Resultado Pecuário - Análise de Cenários',
    pageWidth / 2,
    yPos,
    14,
    true,
    contentWidth,
    'center',
  );
  yPos += 8;

  if (userName) {
    addText(`Gerado por: ${userName}`, margin, yPos, 10);
    yPos += 5;
  }

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  addText(`Data: ${dateStr}`, margin, yPos, 10);
  yPos += 8;

  // 2. Winning Scenario Cards (4 cards)
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  addText('CENÁRIO VENCEDOR', pageWidth / 2, yPos, 12, true, contentWidth, 'center');
  yPos += 6;
  addText(winningScenario.name, pageWidth / 2, yPos, 11, true, contentWidth, 'center');
  yPos += 7;

  const cardWidth = (contentWidth - 15) / 4;
  const cardHeight = 28;
  const cardSpacing = 5;

  // Calculate percentage increase compared to base scenario (A)
  const baseValue = scenarioA.results.resultadoPorHectareAno;
  const winningValue = winningScenario.results.resultadoPorHectareAno;
  const percentIncrease = baseValue > 0 ? ((winningValue / baseValue - 1) * 100).toFixed(0) : '0';

  const winningCards = [
    {
      label: 'LUCRO/HA',
      value: formatCurrency(winningScenario.results.resultadoPorHectareAno),
      subValue: `+${percentIncrease}%`,
    },
    {
      label: 'MARGEM LÍQUIDA',
      value: formatPercent(winningScenario.results.margemVenda),
    },
    {
      label: 'ROI MENSAL',
      value: formatPercent(winningScenario.results.resultadoMensal),
    },
    {
      label: 'GMD (GANHO)',
      value: `${winningScenario.inputs.gmd.toFixed(2)} kg/dia`,
    },
  ];

  winningCards.forEach((card, index) => {
    const x = margin + index * (cardWidth + cardSpacing);
    const y = yPos;

    // Card background
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, cardWidth, cardHeight);

    // Label - centered
    addText(card.label, x + cardWidth / 2, y + 7, 8, false, cardWidth - 6, 'center');

    // Value - centered and larger
    doc.setTextColor(34, 139, 34);
    addText(card.value, x + cardWidth / 2, y + 16, 11, true, cardWidth - 6, 'center');

    // Sub value (if exists) - centered
    if (card.subValue) {
      doc.setTextColor(0, 100, 0);
      addText(card.subValue, x + cardWidth / 2, y + 23, 8, false, cardWidth - 6, 'center');
    }

    doc.setTextColor(0, 0, 0);
  });

  yPos += cardHeight + 10;

  // 3. Premises Table
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = margin;
  }

  addText('MATRIZ DE PREMISSAS E RESULTADOS COMPARATIVOS', pageWidth / 2, yPos, 11, true, contentWidth, 'center');
  yPos += 7;

  const tableStartY = yPos;
  const colWidth = (contentWidth - 20) / 4;
  const rowHeight = 6;
  const headerHeight = 10;

  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText('ITEM', margin + colWidth / 2, tableStartY + 7, 8, true, colWidth - 4, 'center');

  doc.setFillColor(240, 240, 240);
  doc.rect(margin + colWidth, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin + colWidth, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText(scenarioA.name, margin + colWidth + colWidth / 2, tableStartY + 7, 7, true, colWidth - 4, 'center');

  doc.setFillColor(240, 240, 240);
  doc.rect(margin + colWidth * 2, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin + colWidth * 2, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText(scenarioB.name, margin + colWidth * 2 + colWidth / 2, tableStartY + 7, 7, true, colWidth - 4, 'center');

  doc.setFillColor(240, 240, 240);
  doc.rect(margin + colWidth * 3, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin + colWidth * 3, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText(scenarioC.name, margin + colWidth * 3 + colWidth / 2, tableStartY + 7, 7, true, colWidth - 4, 'center');

  yPos = tableStartY + headerHeight;

  // Premises rows
  const premissasItems = [
    { label: 'Peso Compra (kg)', getValue: (s: ComparatorScenario) => `${s.inputs.pesoCompra}` },
    { label: 'Valor Compra (R$/kg)', getValue: (s: ComparatorScenario) => s.inputs.valorCompra.toFixed(2) },
    { label: 'Peso Vivo Abate (kg)', getValue: (s: ComparatorScenario) => `${s.inputs.pesoAbate}` },
    { label: 'Rend. Carcaça (%)', getValue: (s: ComparatorScenario) => s.inputs.rendimentoCarcaca.toFixed(2) },
    { label: 'Valor Venda (R$/@)', getValue: (s: ComparatorScenario) => `${s.inputs.valorVenda}` },
    { label: 'GMD (kg/dia)', getValue: (s: ComparatorScenario) => s.inputs.gmd.toFixed(2) },
    { label: 'Desembolso/Mês (R$)', getValue: (s: ComparatorScenario) => `${s.inputs.custoMensal}` },
    { label: 'Lotação (UA/ha)', getValue: (s: ComparatorScenario) => s.inputs.lotacao.toFixed(2) },
  ];

  // Results rows
  const resultadosItems = [
    { label: 'Lucro/Boi (R$)', getValue: (s: ComparatorScenario) => formatCurrency(s.results.resultadoPorBoi) },
    { label: 'Retorno Mensal (%)', getValue: (s: ComparatorScenario) => formatPercent(s.results.resultadoMensal) },
    { label: 'Margem Líquida (%)', getValue: (s: ComparatorScenario) => formatPercent(s.results.margemVenda) },
    {
      label: 'Resultado/Ha (R$)',
      getValue: (s: ComparatorScenario) => formatCurrency(s.results.resultadoPorHectareAno),
    },
  ];

  // Draw premises table
  [...premissasItems, ...resultadosItems].forEach((item, index) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
    }

    const rowY = yPos;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);

    // Item column - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(item.label, margin + colWidth / 2, rowY + 4.5, 7, false, colWidth - 4, 'center');

    // Scenario A - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(item.getValue(scenarioA), margin + colWidth + colWidth / 2, rowY + 4.5, 7, true, colWidth - 4, 'center');

    // Scenario B - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth * 2, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth * 2, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(
      item.getValue(scenarioB),
      margin + colWidth * 2 + colWidth / 2,
      rowY + 4.5,
      7,
      true,
      colWidth - 4,
      'center',
    );

    // Scenario C - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth * 3, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth * 3, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(
      item.getValue(scenarioC),
      margin + colWidth * 3 + colWidth / 2,
      rowY + 4.5,
      7,
      true,
      colWidth - 4,
      'center',
    );

    yPos += rowHeight;
  });

  yPos += 5;

  // 4. Charts (4 bar charts comparing results) - Increased height by 30%
  const chartWidth = (contentWidth - 20) / 2;
  const chartHeight = 45.5; // 35 * 1.3 = 45.5
  const chartSpacing = 8;

  const charts = [
    {
      title: 'MARGEM LÍQUIDA (%)',
      getValue: (s: ComparatorScenario) => s.results.margemVenda,
      format: (v: number) => formatPercent(v),
      maxValue:
        Math.max(scenarioA.results.margemVenda, scenarioB.results.margemVenda, scenarioC.results.margemVenda) * 1.1,
    },
    {
      title: 'RESULTADO POR HECTARE (R$)',
      getValue: (s: ComparatorScenario) => s.results.resultadoPorHectareAno,
      format: (v: number) => formatCurrency(v),
      maxValue:
        Math.max(
          scenarioA.results.resultadoPorHectareAno,
          scenarioB.results.resultadoPorHectareAno,
          scenarioC.results.resultadoPorHectareAno,
        ) * 1.1,
    },
    {
      title: 'LUCRO POR BOI (R$)',
      getValue: (s: ComparatorScenario) => s.results.resultadoPorBoi,
      format: (v: number) => formatCurrency(v),
      maxValue:
        Math.max(
          scenarioA.results.resultadoPorBoi,
          scenarioB.results.resultadoPorBoi,
          scenarioC.results.resultadoPorBoi,
        ) * 1.1,
    },
    {
      title: 'RETORNO MENSAL (%)',
      getValue: (s: ComparatorScenario) => s.results.resultadoMensal,
      format: (v: number) => formatPercent(v),
      maxValue:
        Math.max(
          scenarioA.results.resultadoMensal,
          scenarioB.results.resultadoMensal,
          scenarioC.results.resultadoMensal,
        ) * 1.1,
    },
  ];

  // Draw charts in 2x2 grid
  let firstRowY = yPos;
  let secondRowY = firstRowY + chartHeight + chartSpacing;

  // Check if we need a new page for charts (with margin for footer)
  if (secondRowY + chartHeight > pageHeight - 15) {
    doc.addPage();
    firstRowY = margin;
    secondRowY = firstRowY + chartHeight + chartSpacing;
  }

  charts.forEach((chart, chartIndex) => {
    const isSecondRow = chartIndex >= 2;
    const chartY = isSecondRow ? secondRowY : firstRowY;
    const chartX = margin + (chartIndex % 2) * (chartWidth + chartSpacing);

    // Chart title
    addText(chart.title, chartX + chartWidth / 2, chartY, 8, true, chartWidth, 'center');
    const titleY = chartY + 5;

    // Chart area - reduced to fit margins
    const yAxisWidth = 18; // Reduced width
    const barWidth = (chartWidth - yAxisWidth - 10) / 3;
    const barSpacing = 4;
    const chartAreaHeight = chartHeight - 25; // More space for labels
    const chartAreaY = titleY + 5;
    const chartAreaX = chartX + yAxisWidth;

    // Y-axis with intermediate values - closer to the chart
    const yAxisX = chartAreaX - 2; // Very close to the chart
    const numYLabels = 5; // 0, 25%, 50%, 75%, 100%

    for (let i = 0; i <= numYLabels; i++) {
      const ratio = i / numYLabels;
      const value = chart.maxValue * ratio;
      const labelY = chartAreaY + chartAreaHeight - ratio * chartAreaHeight;
      const valueStr = i === 0 ? '0' : chart.format(value);
      addText(valueStr, yAxisX, labelY + 1.5, 5, false, 12, 'right');
    }

    // Y-axis line - right next to the chart
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(chartAreaX, chartAreaY, chartAreaX, chartAreaY + chartAreaHeight);

    // Bars
    const chartScenarios = [scenarioA, scenarioB, scenarioC];
    const colors = [
      [59, 130, 246],
      [34, 197, 94],
      [249, 115, 22],
    ]; // Blue, Green, Orange

    chartScenarios.forEach((scenario, barIndex) => {
      const value = chart.getValue(scenario);
      const barHeight = (value / chart.maxValue) * chartAreaHeight;
      const barX = chartAreaX + 2 + barIndex * (barWidth + barSpacing);
      const barY = chartAreaY + chartAreaHeight - barHeight;

      // Draw bar
      doc.setFillColor(colors[barIndex][0], colors[barIndex][1], colors[barIndex][2]);
      doc.rect(barX, barY, barWidth, barHeight, 'F');

      // Bar value label - always show above the bar
      doc.setTextColor(0, 0, 0);
      const valueStr = chart.format(value);
      addText(valueStr, barX + barWidth / 2, barY - 2, 6, true, barWidth, 'center');
    });

    // X-axis line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    const xAxisStartX = chartAreaX + 2;
    const xAxisEndX = xAxisStartX + 3 * (barWidth + barSpacing) - barSpacing;
    doc.line(xAxisStartX, chartAreaY + chartAreaHeight, xAxisEndX, chartAreaY + chartAreaHeight);

    // X-axis labels - scenario names only (values are shown above bars)
    chartScenarios.forEach((scenario, barIndex) => {
      const barX = chartAreaX + 2 + barIndex * (barWidth + barSpacing);

      const scenarioLabel = scenario.name.includes('(')
        ? scenario.name.split('(')[1]?.replace(')', '') || scenario.id
        : scenario.name.split(' ')[1] || scenario.id;

      // Show scenario name below x-axis line
      const labelY = chartAreaY + chartAreaHeight + 5;
      addText(scenarioLabel, barX + barWidth / 2, labelY, 5, false, barWidth, 'center');
    });
  });

  // Footer
  const footerY = pageHeight - margin - 5;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Gerado por PecuarIA - Calculadora de Resultado Pecuário', pageWidth / 2, footerY, { align: 'center' });

  // Save PDF
  const fileName = `comparativo-cenarios-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Generate PDF report for Comparator and return as base64 string
 * This is used for saving the PDF to the database
 */
export function generateComparatorPDFAsBase64(data: ComparatorPDFData): string {
  const { scenarios, userName, createdAt } = data;

  if (scenarios.length !== 3) {
    throw new Error('É necessário ter exatamente 3 cenários para gerar o relatório comparativo');
  }

  const scenarioA = scenarios.find(s => s.id === 'A');
  const scenarioB = scenarios.find(s => s.id === 'B');
  const scenarioC = scenarios.find(s => s.id === 'C');

  if (!scenarioA || !scenarioB || !scenarioC) {
    throw new Error('Cenários A, B e C são obrigatórios');
  }

  // Determine winning scenario (based on resultadoPorHectareAno)
  const winningScenario = [scenarioA, scenarioB, scenarioC].reduce((prev, curr) =>
    curr.results.resultadoPorHectareAno > prev.results.resultadoPorHectareAno ? curr : prev,
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper functions
  const addText = (
    text: string,
    x: number,
    y: number,
    fontSize: number = 10,
    isBold: boolean = false,
    maxWidth?: number,
    align: 'left' | 'center' | 'right' = 'left',
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y, { align });
      return lines.length * (fontSize * 0.4);
    } else {
      doc.text(text, x, y, { align });
      return fontSize * 0.4;
    }
  };

  const formatCurrency = (value: number): string => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number): string => {
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  // 1. Header
  addText(
    'Calculadora de Resultado Pecuário - Análise de Cenários',
    pageWidth / 2,
    yPos,
    14,
    true,
    contentWidth,
    'center',
  );
  yPos += 8;

  if (userName) {
    addText(`Gerado por: ${userName}`, margin, yPos, 10);
    yPos += 5;
  }

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  addText(`Data: ${dateStr}`, margin, yPos, 10);
  yPos += 8;

  // 2. Winning Scenario Cards (4 cards)
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  addText('CENÁRIO VENCEDOR', pageWidth / 2, yPos, 12, true, contentWidth, 'center');
  yPos += 6;
  addText(winningScenario.name, pageWidth / 2, yPos, 11, true, contentWidth, 'center');
  yPos += 7;

  const cardWidth = (contentWidth - 15) / 4;
  const cardHeight = 28;
  const cardSpacing = 5;

  // Calculate percentage increase compared to base scenario (A)
  const baseValue = scenarioA.results.resultadoPorHectareAno;
  const winningValue = winningScenario.results.resultadoPorHectareAno;
  const percentIncrease = baseValue > 0 ? ((winningValue / baseValue - 1) * 100).toFixed(0) : '0';

  const winningCards = [
    {
      label: 'LUCRO/HA',
      value: formatCurrency(winningScenario.results.resultadoPorHectareAno),
      subValue: `+${percentIncrease}%`,
    },
    {
      label: 'MARGEM LÍQUIDA',
      value: formatPercent(winningScenario.results.margemVenda),
    },
    {
      label: 'ROI MENSAL',
      value: formatPercent(winningScenario.results.resultadoMensal),
    },
    {
      label: 'GMD (GANHO)',
      value: `${winningScenario.inputs.gmd.toFixed(2)} kg/dia`,
    },
  ];

  winningCards.forEach((card, index) => {
    const x = margin + index * (cardWidth + cardSpacing);
    const y = yPos;

    // Card background
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, cardWidth, cardHeight);

    // Label - centered
    addText(card.label, x + cardWidth / 2, y + 7, 8, false, cardWidth - 6, 'center');

    // Value - centered and larger
    doc.setTextColor(34, 139, 34);
    addText(card.value, x + cardWidth / 2, y + 16, 11, true, cardWidth - 6, 'center');

    // Sub value (if exists) - centered
    if (card.subValue) {
      doc.setTextColor(0, 100, 0);
      addText(card.subValue, x + cardWidth / 2, y + 23, 8, false, cardWidth - 6, 'center');
    }

    doc.setTextColor(0, 0, 0);
  });

  yPos += cardHeight + 10;

  // 3. Premises Table
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = margin;
  }

  addText('MATRIZ DE PREMISSAS E RESULTADOS COMPARATIVOS', pageWidth / 2, yPos, 11, true, contentWidth, 'center');
  yPos += 7;

  const tableStartY = yPos;
  const colWidth = (contentWidth - 20) / 4;
  const rowHeight = 6;
  const headerHeight = 10;

  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText('ITEM', margin + colWidth / 2, tableStartY + 7, 8, true, colWidth - 4, 'center');

  doc.setFillColor(240, 240, 240);
  doc.rect(margin + colWidth, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin + colWidth, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText(scenarioA.name, margin + colWidth + colWidth / 2, tableStartY + 7, 7, true, colWidth - 4, 'center');

  doc.setFillColor(240, 240, 240);
  doc.rect(margin + colWidth * 2, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin + colWidth * 2, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText(scenarioB.name, margin + colWidth * 2 + colWidth / 2, tableStartY + 7, 7, true, colWidth - 4, 'center');

  doc.setFillColor(240, 240, 240);
  doc.rect(margin + colWidth * 3, tableStartY, colWidth, headerHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin + colWidth * 3, tableStartY, colWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  addText(scenarioC.name, margin + colWidth * 3 + colWidth / 2, tableStartY + 7, 7, true, colWidth - 4, 'center');

  yPos = tableStartY + headerHeight;

  // Premises rows
  const premissasItems = [
    { label: 'Peso Compra (kg)', getValue: (s: ComparatorScenario) => `${s.inputs.pesoCompra}` },
    { label: 'Valor Compra (R$/kg)', getValue: (s: ComparatorScenario) => s.inputs.valorCompra.toFixed(2) },
    { label: 'Peso Vivo Abate (kg)', getValue: (s: ComparatorScenario) => `${s.inputs.pesoAbate}` },
    { label: 'Rend. Carcaça (%)', getValue: (s: ComparatorScenario) => s.inputs.rendimentoCarcaca.toFixed(2) },
    { label: 'Valor Venda (R$/@)', getValue: (s: ComparatorScenario) => `${s.inputs.valorVenda}` },
    { label: 'GMD (kg/dia)', getValue: (s: ComparatorScenario) => s.inputs.gmd.toFixed(2) },
    { label: 'Desembolso/Mês (R$)', getValue: (s: ComparatorScenario) => `${s.inputs.custoMensal}` },
    { label: 'Lotação (UA/ha)', getValue: (s: ComparatorScenario) => s.inputs.lotacao.toFixed(2) },
  ];

  // Results rows
  const resultadosItems = [
    { label: 'Lucro/Boi (R$)', getValue: (s: ComparatorScenario) => formatCurrency(s.results.resultadoPorBoi) },
    { label: 'Retorno Mensal (%)', getValue: (s: ComparatorScenario) => formatPercent(s.results.resultadoMensal) },
    { label: 'Margem Líquida (%)', getValue: (s: ComparatorScenario) => formatPercent(s.results.margemVenda) },
    {
      label: 'Resultado/Ha (R$)',
      getValue: (s: ComparatorScenario) => formatCurrency(s.results.resultadoPorHectareAno),
    },
  ];

  // Draw premises table
  [...premissasItems, ...resultadosItems].forEach((item, index) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
    }

    const rowY = yPos;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);

    // Item column - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(item.label, margin + colWidth / 2, rowY + 4.5, 7, false, colWidth - 4, 'center');

    // Scenario A - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(item.getValue(scenarioA), margin + colWidth + colWidth / 2, rowY + 4.5, 7, true, colWidth - 4, 'center');

    // Scenario B - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth * 2, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth * 2, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(
      item.getValue(scenarioB),
      margin + colWidth * 2 + colWidth / 2,
      rowY + 4.5,
      7,
      true,
      colWidth - 4,
      'center',
    );

    // Scenario C - with background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + colWidth * 3, rowY, colWidth, rowHeight, 'F');
    doc.rect(margin + colWidth * 3, rowY, colWidth, rowHeight);
    doc.setTextColor(0, 0, 0);
    addText(
      item.getValue(scenarioC),
      margin + colWidth * 3 + colWidth / 2,
      rowY + 4.5,
      7,
      true,
      colWidth - 4,
      'center',
    );

    yPos += rowHeight;
  });

  yPos += 5;

  // 4. Charts (4 bar charts comparing results) - Increased height by 30%
  const chartWidth = (contentWidth - 20) / 2;
  const chartHeight = 45.5; // 35 * 1.3 = 45.5
  const chartSpacing = 8;

  const charts = [
    {
      title: 'MARGEM LÍQUIDA (%)',
      getValue: (s: ComparatorScenario) => s.results.margemVenda,
      format: (v: number) => formatPercent(v),
      maxValue:
        Math.max(scenarioA.results.margemVenda, scenarioB.results.margemVenda, scenarioC.results.margemVenda) * 1.1,
    },
    {
      title: 'RESULTADO POR HECTARE (R$)',
      getValue: (s: ComparatorScenario) => s.results.resultadoPorHectareAno,
      format: (v: number) => formatCurrency(v),
      maxValue:
        Math.max(
          scenarioA.results.resultadoPorHectareAno,
          scenarioB.results.resultadoPorHectareAno,
          scenarioC.results.resultadoPorHectareAno,
        ) * 1.1,
    },
    {
      title: 'LUCRO POR BOI (R$)',
      getValue: (s: ComparatorScenario) => s.results.resultadoPorBoi,
      format: (v: number) => formatCurrency(v),
      maxValue:
        Math.max(
          scenarioA.results.resultadoPorBoi,
          scenarioB.results.resultadoPorBoi,
          scenarioC.results.resultadoPorBoi,
        ) * 1.1,
    },
    {
      title: 'RETORNO MENSAL (%)',
      getValue: (s: ComparatorScenario) => s.results.resultadoMensal,
      format: (v: number) => formatPercent(v),
      maxValue:
        Math.max(
          scenarioA.results.resultadoMensal,
          scenarioB.results.resultadoMensal,
          scenarioC.results.resultadoMensal,
        ) * 1.1,
    },
  ];

  // Draw charts in 2x2 grid
  let firstRowY = yPos;
  let secondRowY = firstRowY + chartHeight + chartSpacing;

  // Check if we need a new page for charts (with margin for footer)
  if (secondRowY + chartHeight > pageHeight - 15) {
    doc.addPage();
    firstRowY = margin;
    secondRowY = firstRowY + chartHeight + chartSpacing;
  }

  charts.forEach((chart, chartIndex) => {
    const isSecondRow = chartIndex >= 2;
    const chartY = isSecondRow ? secondRowY : firstRowY;
    const chartX = margin + (chartIndex % 2) * (chartWidth + chartSpacing);

    // Chart title
    addText(chart.title, chartX + chartWidth / 2, chartY, 8, true, chartWidth, 'center');
    const titleY = chartY + 5;

    // Chart area - reduced to fit margins
    const yAxisWidth = 18; // Reduced width
    const barWidth = (chartWidth - yAxisWidth - 10) / 3;
    const barSpacing = 4;
    const chartAreaHeight = chartHeight - 25; // More space for labels
    const chartAreaY = titleY + 5;
    const chartAreaX = chartX + yAxisWidth;

    // Y-axis with intermediate values - closer to the chart
    const yAxisX = chartAreaX - 2; // Very close to the chart
    const numYLabels = 5; // 0, 25%, 50%, 75%, 100%

    for (let i = 0; i <= numYLabels; i++) {
      const ratio = i / numYLabels;
      const value = chart.maxValue * ratio;
      const labelY = chartAreaY + chartAreaHeight - ratio * chartAreaHeight;
      const valueStr = i === 0 ? '0' : chart.format(value);
      addText(valueStr, yAxisX, labelY + 1.5, 5, false, 12, 'right');
    }

    // Y-axis line - right next to the chart
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(chartAreaX, chartAreaY, chartAreaX, chartAreaY + chartAreaHeight);

    // Bars
    const chartScenarios = [scenarioA, scenarioB, scenarioC];
    const colors = [
      [59, 130, 246],
      [34, 197, 94],
      [249, 115, 22],
    ]; // Blue, Green, Orange

    chartScenarios.forEach((scenario, barIndex) => {
      const value = chart.getValue(scenario);
      const barHeight = (value / chart.maxValue) * chartAreaHeight;
      const barX = chartAreaX + 2 + barIndex * (barWidth + barSpacing);
      const barY = chartAreaY + chartAreaHeight - barHeight;

      // Draw bar
      doc.setFillColor(colors[barIndex][0], colors[barIndex][1], colors[barIndex][2]);
      doc.rect(barX, barY, barWidth, barHeight, 'F');

      // Bar value label - always show above the bar
      doc.setTextColor(0, 0, 0);
      const valueStr = chart.format(value);
      addText(valueStr, barX + barWidth / 2, barY - 2, 6, true, barWidth, 'center');
    });

    // X-axis line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    const xAxisStartX = chartAreaX + 2;
    const xAxisEndX = xAxisStartX + 3 * (barWidth + barSpacing) - barSpacing;
    doc.line(xAxisStartX, chartAreaY + chartAreaHeight, xAxisEndX, chartAreaY + chartAreaHeight);

    // X-axis labels - scenario names only (values are shown above bars)
    chartScenarios.forEach((scenario, barIndex) => {
      const barX = chartAreaX + 2 + barIndex * (barWidth + barSpacing);

      const scenarioLabel = scenario.name.includes('(')
        ? scenario.name.split('(')[1]?.replace(')', '') || scenario.id
        : scenario.name.split(' ')[1] || scenario.id;

      // Show scenario name below x-axis line
      const labelY = chartAreaY + chartAreaHeight + 5;
      addText(scenarioLabel, barX + barWidth / 2, labelY, 5, false, barWidth, 'center');
    });
  });

  // Footer
  const footerY = pageHeight - margin - 5;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Gerado por PecuarIA - Calculadora de Resultado Pecuário', pageWidth / 2, footerY, { align: 'center' });

  // Return PDF as base64 string
  return doc.output('datauristring').split(',')[1]; // Remove data:application/pdf;base64, prefix
}
