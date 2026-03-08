# Skill: DOCX — Criação, edição e análise de documentos Word

## Overview

Um arquivo `.docx` é um arquivo ZIP contendo XMLs internos. Esta skill permite criar, ler, editar e manipular documentos Word.

## Referência Rápida

| Tarefa | Abordagem |
|--------|-----------|
| Ler/analisar conteúdo | `pandoc` ou unpack para XML bruto |
| Criar novo documento | Usar `docx-js` (ver seção Criando Novos Documentos) |
| Editar documento existente | Unpack → editar XML → repack |

---

## Convertendo .doc para .docx

```bash
python scripts/office/soffice.py --headless --convert-to docx document.doc
```

## Lendo Conteúdo

```bash
# Extração de texto com tracked changes
pandoc --track-changes=all document.docx -o output.md

# Acesso ao XML bruto
python scripts/office/unpack.py document.docx unpacked/
```

## Convertendo para Imagens

```bash
python scripts/office/soffice.py --headless --convert-to pdf document.docx
pdftoppm -jpeg -r 150 document.pdf page
```

## Aceitando Tracked Changes

```bash
python scripts/accept_changes.py input.docx output.docx
```

---

## Criando Novos Documentos

Gera arquivos `.docx` com JavaScript via `docx-js`. Instalar: `npm install -g docx`

### Setup

```javascript
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, PageOrientation, LevelFormat, ExternalHyperlink,
        InternalHyperlink, Bookmark, FootnoteReferenceRun, PositionalTab,
        PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
        TabStopType, TabStopPosition, Column, SectionType,
        TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageNumber, PageBreak } = require('docx');

const doc = new Document({ sections: [{ children: [/* conteúdo */] }] });
Packer.toBuffer(doc).then(buffer => fs.writeFileSync("doc.docx", buffer));
```

### Validação

```bash
python scripts/office/validate.py doc.docx
```

### Tamanho da Página

```javascript
// docx-js usa A4 por padrão — sempre definir explicitamente
sections: [{
  properties: {
    page: {
      size: {
        width: 12240,   // 8.5 polegadas em DXA
        height: 15840   // 11 polegadas em DXA
      },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // margens de 1 polegada
    }
  },
  children: [/* conteúdo */]
}]
```

**Tamanhos comuns (DXA, 1440 DXA = 1 polegada):**

| Papel | Largura | Altura | Largura útil (margens 1") |
|-------|---------|--------|--------------------------|
| US Letter | 12.240 | 15.840 | 9.360 |
| A4 (padrão) | 11.906 | 16.838 | 9.026 |

**Orientação paisagem:**

```javascript
size: {
  width: 12240,   // Passar borda CURTA como width
  height: 15840,  // Passar borda LONGA como height
  orientation: PageOrientation.LANDSCAPE  // docx-js inverte no XML
},
```

### Estilos (Sobrescrever Headings)

```javascript
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } }, // 12pt padrão
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Título")] }),
    ]
  }]
});
```

### Listas

```javascript
// CORRETO — usar numbering config com LevelFormat.BULLET
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Item com bullet")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Item numerado")] }),
    ]
  }]
});
```

### Tabelas

```javascript
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4680, 4680],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 4680, type: WidthType.DXA },
          shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun("Célula")] })]
        })
      ]
    })
  ]
})
```

**Regras de largura:**
- Sempre usar `WidthType.DXA` (nunca `PERCENTAGE` — quebra no Google Docs)
- Largura da tabela = soma de `columnWidths`
- `width` da célula deve corresponder ao `columnWidth`
- `margins` são padding interno

### Imagens

```javascript
new Paragraph({
  children: [new ImageRun({
    type: "png", // Obrigatório: png, jpg, jpeg, gif, bmp, svg
    data: fs.readFileSync("image.png"),
    transformation: { width: 200, height: 150 },
    altText: { title: "Título", description: "Desc", name: "Nome" }
  })]
})
```

### Quebras de Página

```javascript
new Paragraph({ children: [new PageBreak()] })
// ou
new Paragraph({ pageBreakBefore: true, children: [new TextRun("Nova página")] })
```

### Hyperlinks

```javascript
// Link externo
new Paragraph({
  children: [new ExternalHyperlink({
    children: [new TextRun({ text: "Clique aqui", style: "Hyperlink" })],
    link: "https://example.com",
  })]
})

// Link interno (bookmark + referência)
new Paragraph({ heading: HeadingLevel.HEADING_1, children: [
  new Bookmark({ id: "cap1", children: [new TextRun("Capítulo 1")] }),
]})
new Paragraph({ children: [new InternalHyperlink({
  children: [new TextRun({ text: "Ver Capítulo 1", style: "Hyperlink" })],
  anchor: "cap1",
})]})
```

### Notas de Rodapé

```javascript
const doc = new Document({
  footnotes: {
    1: { children: [new Paragraph("Fonte: Relatório Anual 2024")] },
    2: { children: [new Paragraph("Ver apêndice para metodologia")] },
  },
  sections: [{
    children: [new Paragraph({
      children: [
        new TextRun("Receita cresceu 15%"),
        new FootnoteReferenceRun(1),
        new TextRun(" usando métricas ajustadas"),
        new FootnoteReferenceRun(2),
      ],
    })]
  }]
});
```

### Tab Stops

```javascript
new Paragraph({
  children: [
    new TextRun("Nome da Empresa"),
    new TextRun("\tJaneiro 2025"),
  ],
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
})
```

### Layout Multi-Colunas

```javascript
sections: [{
  properties: {
    column: {
      count: 2,
      space: 720,
      equalWidth: true,
      separate: true,
    },
  },
  children: [/* conteúdo flui entre colunas */]
}]
```

### Sumário (Table of Contents)

```javascript
new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-3" })
```

### Cabeçalhos e Rodapés

```javascript
sections: [{
  properties: {
    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
  },
  headers: {
    default: new Header({ children: [new Paragraph({ children: [new TextRun("Cabeçalho")] })] })
  },
  footers: {
    default: new Footer({ children: [new Paragraph({
      children: [new TextRun("Página "), new TextRun({ children: [PageNumber.CURRENT] })]
    })] })
  },
  children: [/* conteúdo */]
}]
```

---

## Regras Críticas do docx-js

- Definir tamanho da página explicitamente (padrão é A4)
- Paisagem: passar dimensões de retrato e usar `PageOrientation.LANDSCAPE`
- Nunca usar `\n` — usar elementos `Paragraph` separados
- Nunca usar bullets unicode — usar `LevelFormat.BULLET`
- `PageBreak` deve estar dentro de `Paragraph`
- `ImageRun` exige `type`
- Tabelas: sempre usar `WidthType.DXA`, nunca `PERCENTAGE`
- Tabelas precisam de larguras duplas: `columnWidths` + `width` por célula
- Usar `ShadingType.CLEAR` (nunca `SOLID`)
- Nunca usar tabelas como divisores/linhas
- TOC exige `HeadingLevel` apenas
- Sobrescrever estilos com IDs exatos: "Heading1", "Heading2", etc.
- Incluir `outlineLevel` (obrigatório para TOC)

---

## Editando Documentos Existentes

### Passo 1: Desempacotar

```bash
python scripts/office/unpack.py document.docx unpacked/
```

### Passo 2: Editar XML

Editar arquivos em `unpacked/word/`. Usar aspas inteligentes com entidades XML:

| Entidade | Caractere |
|----------|-----------|
| `&#x2018;` | ' (aspa simples esquerda) |
| `&#x2019;` | ' (aspa simples direita / apóstrofo) |
| `&#x201C;` | " (aspa dupla esquerda) |
| `&#x201D;` | " (aspa dupla direita) |

**Comentários:**

```bash
python scripts/comment.py unpacked/ 0 "Texto do comentário"
python scripts/comment.py unpacked/ 1 "Resposta" --parent 0
```

### Passo 3: Reempacotar

```bash
python scripts/office/pack.py unpacked/ output.docx --original document.docx
```

---

## Tracked Changes (XML)

**Inserção:**
```xml
<w:ins w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:t>texto inserido</w:t></w:r>
</w:ins>
```

**Deleção:**
```xml
<w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>texto deletado</w:delText></w:r>
</w:del>
```

**Edição mínima:**
```xml
<w:r><w:t>O prazo é </w:t></w:r>
<w:del w:id="1" w:author="Claude" w:date="...">
  <w:r><w:delText>30</w:delText></w:r>
</w:del>
<w:ins w:id="2" w:author="Claude" w:date="...">
  <w:r><w:t>60</w:t></w:r>
</w:ins>
<w:r><w:t> dias.</w:t></w:r>
```

---

## Dependências

- **pandoc**: Extração de texto
- **docx**: `npm install -g docx` (documentos novos)
- **LibreOffice**: Conversão para PDF
- **Poppler**: `pdftoppm` para imagens
