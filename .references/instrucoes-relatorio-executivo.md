# Instruções para Geração do Relatório Executivo — Programa de Trabalho

## Objetivo

Gerar um relatório PDF em formato A4 com design executivo e profissional para o **Programa de Trabalho** cadastrado na aplicação. O relatório deve se adaptar dinamicamente a qualquer projeto, independentemente da quantidade de entregas, atividades, stakeholders ou do tamanho dos textos cadastrados. O objetivo é que o cliente que receber este documento tenha uma percepção imediata de **profissionalismo, sofisticação e confiança**.

---

## 1. Identidade Visual

### 1.1 Paleta de Cores

Toda a paleta deve ser aplicada de forma consistente em todas as páginas do relatório. As cores foram escolhidas para transmitir autoridade (azul marinho), sofisticação (dourado) e clareza (tons neutros).

| Token | Hex | Uso |
|-------|-----|-----|
| `--primary` | `#1B2A4A` | Cor principal — cabeçalhos, headers de entrega, ícones de seção, tabelas |
| `--primary-light` | `#2C4470` | Gradiente secundário — usado em combinação com `--primary` |
| `--accent` | `#C8A96E` | Cor de destaque dourada — ícones, bordas de destaque, badges, numerações |
| `--accent-light` | `#E8D5B0` | Variação clara do dourado — uso pontual |
| `--text-dark` | `#1a1a2e` | Texto principal — nomes, títulos internos |
| `--text-medium` | `#4a4a5a` | Texto secundário — descrições, conteúdo de tabelas |
| `--text-light` | `#7a7a8a` | Texto terciário — datas, rodapés, labels |
| `--bg-light` | `#F8F7F4` | Fundo claro — caixas de descrição, linhas alternadas de tabela |
| `--bg-white` | `#FFFFFF` | Fundo padrão das páginas internas |
| `--border` | `#E8E6E1` | Bordas de cards, tabelas, separadores |
| `--success` | `#2D8B55` | Status "Concluído" e barras de progresso 100% |
| `--warning` | `#D4A017` | Status "Em Andamento" e barras de progresso parciais |

### 1.2 Tipografia

A fonte principal é a **Inter** (Google Fonts), uma sans-serif moderna, limpa e altamente legível. Deve ser embarcada no PDF via `@font-face` com os seguintes pesos:

| Peso | Uso |
|------|-----|
| 300 (Light) | Texto descritivo na capa, subtextos |
| 400 (Regular) | Texto corrido, conteúdo de tabelas |
| 600 (Semibold) | Labels, badges, subtítulos |
| 700 (Bold) | Títulos de seção, nomes em tabelas, títulos de entrega |
| 800 (ExtraBold) | Título principal na capa |

O tamanho base do corpo é **8.5pt** com `line-height: 1.5`. Os tamanhos específicos estão detalhados em cada seção abaixo.

### 1.3 Ícones

Utilizar **Font Awesome 6 Free** (Solid e Regular), embarcado via `@font-face` com os arquivos TTF (`fa-solid-900.ttf` e `fa-regular-400.ttf`). Os ícones são referenciados via caracteres Unicode dentro de spans com a classe `.icon` (Solid) ou `.icon-r` (Regular).

Definição CSS:

```css
.icon { font-family: 'FA6Solid'; font-style: normal; font-weight: 900; }
.icon-r { font-family: 'FA6Regular'; font-style: normal; font-weight: 400; }
```

Mapa de ícones utilizados no relatório (referência Unicode):

| Ícone | Unicode | Uso |
|-------|---------|-----|
| Cadeado | `&#xf023;` | Badge "Confidencial" na capa |
| Caixa aberta | `&#xf466;` | Métrica "Entregas" na capa |
| Lista de tarefas | `&#xf0ae;` | Métrica "Atividades" na capa e título de atividades |
| Grupo de pessoas | `&#xf0c0;` | Métrica "Stakeholders" na capa e card Cultural |
| Calendário | `&#xf073;` | Métrica "Meses" na capa |
| Calendário (regular) | `&#xf133;` | Períodos nas entregas e rodapé da capa |
| Documento | `&#xf15c;` | Seção "Descrição do Programa" |
| Gráfico de linha | `&#xf201;` | Seção "Transformações" e card Financeira |
| Troféu | `&#xf091;` | Seção "Evidências de Sucesso" |
| Pessoa de terno | `&#xf508;` | Seção "Matriz de Stakeholders" |
| Clipboard lista | `&#xf46d;` | Seção "Entregas e Atividades" |
| Escudo | `&#xf2f7;` | Rodapé de confidencialidade e aviso final |
| Bússola | `&#xf14e;` | Card Transformação Estratégica |
| Instituição | `&#xf19c;` | Card Governança e Gestão |
| Engrenagens | `&#xf085;` | Card Transformação Operacional |
| Seedling | `&#xf4d8;` | Card Sustentabilidade |
| Info circle | `&#xf05a;` | Mensagem "Nenhuma atividade vinculada" |
| Pessoa | `&#xf007;` | Cabeçalho coluna Nome (stakeholders) |
| Maleta | `&#xf0b1;` | Cabeçalho coluna Papel (stakeholders) |
| Tag | `&#xf02b;` | Cabeçalho coluna Classificação (stakeholders) |

---

## 2. Formato do Documento

O documento é gerado em **HTML** e convertido para **PDF** via WeasyPrint (ou equivalente). O formato é **A4** (210mm x 297mm) com margem zero no `@page` — todo o espaçamento é controlado via CSS interno.

```css
@page { size: A4; margin: 0; }
```

Cada página é um `<div class="page">` com `width: 210mm`, `min-height: 297mm` e `page-break-after: always` (exceto a última).

---

## 3. Estrutura das Páginas

O relatório é composto por páginas dinâmicas organizadas na seguinte ordem:

### PÁGINA 1 — Capa Executiva (sempre fixa, 1 página)

A capa ocupa uma página inteira com fundo escuro e é a primeira impressão do documento. Deve transmitir autoridade e exclusividade.

**Fundo:** Gradiente diagonal de `--primary` para `#0F1B33` e `#0a1225`:
```css
background: linear-gradient(160deg, #1B2A4A 0%, #0F1B33 60%, #0a1225 100%);
```

**Elemento decorativo:** Um pseudo-elemento `::before` com círculo radial dourado semitransparente posicionado no canto superior direito, criando um efeito sutil de luz:
```css
.cover::before {
  content: '';
  position: absolute;
  top: -20%; right: -15%;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200,169,110,0.12) 0%, transparent 70%);
}
```

**Estrutura da capa (de cima para baixo):**

1. **Header da capa** — Flexbox com `justify-content: space-between`. À esquerda: nome da empresa "GESTTOR INTTEGRA" em dourado (`--accent`), 13pt, bold, uppercase, letter-spacing 2px, seguido de "| Advisory" em branco 50% opacidade, 8.5pt, light. À direita: badge "CONFIDENCIAL" com ícone de cadeado, fundo `rgba(200,169,110,0.15)`, borda `rgba(200,169,110,0.3)`, border-radius 20px, 7pt, uppercase.

2. **Conteúdo central** — Centralizado verticalmente via `flex: 1` e `justify-content: center`. Contém:
   - Barra dourada decorativa: 55px largura, 3px altura, cor `--accent`
   - Subtítulo "PROGRAMA DE TRABALHO": 8.5pt, semibold, letter-spacing 3px, uppercase, cor `--accent`
   - **Título do programa** (campo dinâmico `{programa.nome}`): 34pt, extrabold, line-height 1.1, cor branca. Se o nome tiver duas palavras ou mais, a primeira palavra fica em branco e as demais em dourado (`--accent`). Se for uma palavra só, fica toda em branco.
   - Descrição resumida do programa (campo dinâmico `{programa.descricao}`, truncada em ~2 linhas): 10pt, light, cor branca 60% opacidade, max-width 400px

3. **Métricas** — Barra horizontal com 4 métricas, separadas por bordas verticais sutis (`rgba(255,255,255,0.08)`). Cada métrica tem:
   - Ícone Font Awesome em dourado, 10pt
   - Valor numérico: 20pt, bold, branco
   - Label: 7pt, regular, uppercase, letter-spacing 1.5px, branco 40% opacidade
   - As 4 métricas são: **Entregas** (contagem de entregas), **Atividades** (contagem total de atividades), **Stakeholders** (contagem de stakeholders), **Meses** (duração em meses do programa)

4. **Rodapé da capa** — Flexbox com `justify-content: space-between`. À esquerda: "Gesttor Inttegra — Programa de Trabalho" e "Documento confidencial e de uso interno" em 7pt, branco 30%. À direita: período formatado como "Janeiro 2026 — Dezembro 2031" com ícone de calendário, e a data de geração abaixo.

---

### PÁGINA 2 — Visão Geral do Programa (sempre fixa, 1 página)

**Header padrão** (repetido em todas as páginas internas):
- Flexbox com borda inferior de 2px sólida `--primary`
- Esquerda: "GESTTOR INTTEGRA" (9pt, bold, uppercase) | separador vertical 1px | "Programa de Trabalho — {programa.nome}" (7.5pt, cinza)
- Direita: data de geração no formato DD/MM/AAAA (7pt, cinza)

**Seção "Descrição do Programa":**
- Título de seção: ícone de documento em caixa 28x28px azul marinho com border-radius 6px + texto "Descrição do Programa" em 12pt bold `--primary` + linha decorativa gradiente
- Caixa de descrição: fundo `--bg-light`, borda esquerda 3px sólida `--accent`, border-radius 0 6px 6px 0, padding 12px 16px, texto 8.5pt `--text-medium`, line-height 1.6
- Conteúdo: campo dinâmico `{programa.descricao}` completo

**Seção "Transformações e Conquistas Esperadas":**
- Título de seção com ícone de gráfico
- Grid 2 colunas (`grid-template-columns: 1fr 1fr`, gap 8px)
- Cada card de transformação tem:
  - Barra dourada no topo (2.5px, `--accent`, via `::before`)
  - Header: ícone em caixa 26x26px com gradiente `--primary` → `--primary-light` + label "FRENTE 0N" (6.5pt, dourado, uppercase) + título (8pt, bold, `--primary`)
  - Lista de itens: bullets dourados circulares (4x4px), texto 7pt `--text-medium`
- **Regra dinâmica:** Se o programa tiver campo `transformacoes_esperadas`, renderizar cada transformação como um card. Se não tiver, omitir esta seção inteira. Se tiver mais de 6, continuar na página seguinte.

**Rodapé padrão** (repetido em todas as páginas internas):
- Posição absoluta, bottom 15px, borda superior 1px `--border`
- Três elementos: "Documento confidencial e de uso interno" com ícone de escudo dourado | "Gesttor Inttegra — Programa de Trabalho" | "Página N de N"

---

### PÁGINA 3 — Evidências + Stakeholders + Início das Entregas

**Seção "Evidências de Sucesso"** (condicional — só renderizar se o programa tiver este campo):
- Título de seção com ícone de troféu
- Grid 3 colunas (`grid-template-columns: 1fr 1fr 1fr`, gap 7px)
- Cada item: caixa com fundo `--bg-light`, borda `--border`, border-radius 6px, padding 9px 10px
  - Número em círculo 20x20px, fundo `--primary`, cor `--accent`, 7pt bold
  - Texto: 7pt, `--text-medium`, font-weight 500

**Seção "Matriz de Stakeholders":**
- Título de seção com ícone de pessoa de terno
- Tabela com border-radius 8px, borda `--border`:
  - Cabeçalho: fundo `--primary`, texto branco, 6.5pt, uppercase, letter-spacing 1px. Colunas: Nome (com ícone pessoa), Papel (com ícone maleta), Classificação (com ícone tag)
  - Linhas: 7.5pt, `--text-medium`, linhas alternadas com fundo `--bg-light`
  - Coluna Nome: font-weight 600, cor `--text-dark`
  - Coluna Classificação: badge colorido com border-radius 10px, 6.5pt, font-weight 600
- **Regra de cores dos badges de papel:**

| Papel contém | Classe | Background | Cor do texto |
|-------------|--------|------------|-------------|
| "Mentor" | `role-mentor` | `rgba(200,169,110,0.15)` | `#8B7340` |
| "Líder Interno" ou "Interno" | `role-lint` | `rgba(41,128,185,0.12)` | `#2471A3` |
| "Conselho" | `role-cons` | `rgba(142,68,173,0.12)` | `#7D3C98` |
| "Líder Externo" ou "Externo" | `role-lext` | `rgba(45,139,85,0.12)` | `#1E8449` |
| Qualquer outro | `role-default` | `rgba(122,122,138,0.1)` | `#7a7a8a` |

**Seção "Entregas e Atividades":**
- Título de seção com ícone de clipboard
- A partir daqui, renderizar cada entrega como um **card de entrega** (descrito abaixo)
- As entregas devem fluir naturalmente entre as páginas, sem forçar quebras

---

### PÁGINAS SEGUINTES — Entregas (dinâmico, N páginas)

Cada entrega é renderizada como um **card de entrega** (`ecard`). Os cards fluem sequencialmente e o WeasyPrint faz a quebra de página automaticamente.

**Estrutura do card de entrega:**

1. **Header do card** — Gradiente `--primary` → `--primary-light`, padding 10px 16px, flexbox:
   - Esquerda: badge "E{NN}" (numeração sequencial com zero à esquerda, ex: E01, E02...) em fundo `rgba(200,169,110,0.2)`, cor `--accent`, 7pt bold, border-radius 4px + título da entrega em 9.5pt bold branco
   - Direita: ícone de calendário (regular) + período formatado como "DD/MM/AAAA — DD/MM/AAAA | {duração}" em 6.5pt, branco 55%

2. **Corpo do card** — Padding 12px 16px:
   - Descrição da entrega: 7.5pt, `--text-medium`, line-height 1.55
   - Se a entrega tiver atividades:
     - Título "ATIVIDADES ({N})": 7.5pt, bold, `--primary`, uppercase, letter-spacing 0.8px, com ícone de lista dourado
     - Tabela de atividades com border-radius 6px, borda `--border`:
       - Cabeçalho: fundo `--bg-light`, 6pt, uppercase, letter-spacing 1px, `--text-light`. Colunas: Atividade (36%), Status (13%), Progresso (13%), Período (22%), Líder (10%)
       - Linhas: 7pt, `--text-medium`, padding 5px 8px
   - Se a entrega NÃO tiver atividades:
     - Mensagem centralizada: ícone info-circle dourado + "Nenhuma atividade vinculada a esta entrega." em 7pt, itálico, `--text-light`

3. **Status das atividades** — Badge inline com border-radius 8px, 6pt, font-weight 600:

| Status | Classe | Background | Cor | Texto exibido |
|--------|--------|------------|-----|---------------|
| Concluído (100%) | `st-ok` | `rgba(45,139,85,0.12)` | `--success` | "&#10003; Concluído" |
| Em Andamento (1-99%) | `st-prog` | `rgba(212,160,23,0.12)` | `--warning` | "&#8635; Em Andamento" |
| Não Iniciado (0%) | `st-no` | `rgba(122,122,138,0.1)` | `--text-light` | "— Não Iniciado" |

4. **Barra de progresso** — Container de 55px largura, 5px altura, fundo `#E8E6E1`, border-radius 3px. Fill interno com largura proporcional ao percentual:

| Faixa | Classe | Cor |
|-------|--------|-----|
| 100% | `pbar-100` | `--success` (#2D8B55) |
| 1-99% | `pbar-50` | `--warning` (#D4A017) |
| 0% | `pbar-0` | `#D5D5D5` |

Ao lado da barra: percentual em 6pt, font-weight 600.

---

### ÚLTIMA PÁGINA — Confidencialidade e Assinaturas (sempre fixa, 1 página)

Esta página deve ser sempre a última do relatório, independentemente de quantas páginas de entregas existam.

**Bloco de Confidencialidade:**
- Caixa com fundo `--bg-light`, border-radius 10px, borda `--border`, padding 20px
- Header: ícone de escudo em caixa 26x26px `--primary` + "Aviso de Confidencialidade" em 10pt bold `--primary`
- Texto: 7.5pt, `--text-medium`, line-height 1.6. Conteúdo fixo:

> "Este documento é de propriedade da **Gesttor Inttegra** e contém informações confidenciais e privilegiadas. A reprodução, distribuição ou divulgação total ou parcial deste material sem autorização prévia por escrito é estritamente proibida. O uso deste documento é restrito aos stakeholders identificados neste programa de trabalho."

**Área de Assinaturas:**
- Título centralizado: "TERMOS DE ACEITE E ASSINATURAS" em 9pt, bold, `--primary`, uppercase, letter-spacing 1px
- Margin-top 50px do bloco de confidencialidade
- Grid de assinaturas em linhas de 2 colunas, gap 40px entre colunas, 25px entre linhas
- Cada assinatura: linha horizontal (`border-bottom: 1px solid --text-dark`) com padding-bottom 45px para espaço de assinatura, seguida do nome (8.5pt, semibold, `--text-dark`) e papel (7pt, `--text-light`), ambos centralizados
- **Regra dinâmica:** Renderizar uma assinatura para cada stakeholder cadastrado no programa. Se houver número ímpar, a última fica sozinha centralizada. Se houver mais de 6, organizar em múltiplas linhas de 2.

---

## 4. Regras Dinâmicas de Conteúdo

### 4.1 Campos obrigatórios vs. opcionais

| Campo | Obrigatório | Comportamento se ausente |
|-------|-------------|--------------------------|
| `programa.nome` | Sim | — |
| `programa.descricao` | Sim | — |
| `programa.data_inicio` | Sim | — |
| `programa.data_fim` | Sim | — |
| `programa.transformacoes` | Não | Omitir seção "Transformações e Conquistas Esperadas" inteira |
| `programa.evidencias` | Não | Omitir seção "Evidências de Sucesso" inteira |
| `programa.stakeholders` | Sim | — |
| `programa.entregas` | Não | Se não houver entregas, exibir mensagem "Nenhuma entrega cadastrada neste programa" |

### 4.2 Cálculos automáticos

A duração do programa deve ser calculada automaticamente a partir das datas de início e fim:
- Se a diferença for menor que 60 dias, exibir em **dias** (ex: "28 dias")
- Se for 60 dias ou mais, exibir em **meses** com 1 casa decimal (ex: "8.1 meses")
- A contagem de entregas, atividades e stakeholders é calculada dinamicamente

### 4.3 Formatação de datas

- Na capa: mês por extenso + ano (ex: "Janeiro 2026 — Dezembro 2031")
- Nos headers de entrega: DD/MM/AAAA (ex: "01/02/2026 — 28/02/2026")
- Nas tabelas de atividades: mês abreviado/ano (ex: "jan/2026 — mar/2026")
- No header das páginas internas: DD/MM/AAAA (ex: "08/03/2026")

### 4.4 Título da capa — regra de quebra

O título do programa na capa deve ser dividido em duas linhas para impacto visual. A regra é:
- Se o nome tiver 2 ou mais palavras, a primeira palavra fica em **branco** e as demais em **dourado** (`--accent`), cada uma em sua linha
- Se o nome tiver apenas 1 palavra, fica toda em branco
- Exemplo: "Growth Partnership" → "Growth" (branco, linha 1) + "Partnership" (dourado, linha 2)
- Exemplo: "Transformação Digital Agro" → "Transformação" (branco, linha 1) + "Digital Agro" (dourado, linha 2)

### 4.5 Paginação

- A numeração de páginas deve ser calculada automaticamente
- A capa é a página 1 mas **não exibe** número de página
- As páginas internas exibem "Página N de N" no rodapé
- O total de páginas deve considerar: 1 (capa) + 1 (visão geral) + N (evidências/stakeholders/entregas) + 1 (confidencialidade/assinaturas)

---

## 5. Estrutura HTML Completa de Referência

### 5.1 Declaração e fontes

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>{programa.nome} — Programa de Trabalho</title>
<style>
  @font-face {
    font-family: 'FA6Solid';
    src: url('fa-solid-900.ttf') format('truetype');
    font-weight: 900;
    font-style: normal;
  }
  @font-face {
    font-family: 'FA6Regular';
    src: url('fa-regular-400.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Inter';
    src: url('inter-light.woff2') format('woff2');
    font-weight: 300;
  }
  @font-face {
    font-family: 'Inter';
    src: url('inter-regular.woff2') format('woff2');
    font-weight: 400;
  }
  @font-face {
    font-family: 'Inter';
    src: url('inter-semibold.woff2') format('woff2');
    font-weight: 600;
  }
  @font-face {
    font-family: 'Inter';
    src: url('inter-bold.woff2') format('woff2');
    font-weight: 700;
  }
  @font-face {
    font-family: 'Inter';
    src: url('inter-extrabold.woff2') format('woff2');
    font-weight: 800;
  }
  /* ... todo o CSS descrito nas seções anteriores ... */
</style>
</head>
```

### 5.2 Template da Capa

```html
<div class="page">
  <div class="cover">
    <div class="cover-header">
      <div class="cover-logo">
        Gesttor Inttegra <span>| Advisory</span>
      </div>
      <div class="cover-badge">
        <span class="icon" style="font-size:6.5pt; margin-right:3px;">&#xf023;</span> Confidencial
      </div>
    </div>
    <div class="cover-content">
      <div class="cover-divider"></div>
      <div class="cover-subtitle">Programa de Trabalho</div>
      <div class="cover-title">
        {primeira_palavra}<br>
        <span class="cover-title-accent">{restante_do_nome}</span>
      </div>
      <div class="cover-desc">{programa.descricao_resumida}</div>
      <div class="cover-metrics">
        <div class="cover-metric">
          <div class="cover-metric-icon"><span class="icon">&#xf466;</span></div>
          <div class="cover-metric-value">{total_entregas}</div>
          <div class="cover-metric-label">Entregas</div>
        </div>
        <div class="cover-metric">
          <div class="cover-metric-icon"><span class="icon">&#xf0ae;</span></div>
          <div class="cover-metric-value">{total_atividades}</div>
          <div class="cover-metric-label">Atividades</div>
        </div>
        <div class="cover-metric">
          <div class="cover-metric-icon"><span class="icon">&#xf0c0;</span></div>
          <div class="cover-metric-value">{total_stakeholders}</div>
          <div class="cover-metric-label">Stakeholders</div>
        </div>
        <div class="cover-metric">
          <div class="cover-metric-icon"><span class="icon">&#xf073;</span></div>
          <div class="cover-metric-value">{duracao_numero}</div>
          <div class="cover-metric-label">Meses</div>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      <div class="cover-footer-left">
        Gesttor Inttegra — Programa de Trabalho<br>
        Documento confidencial e de uso interno
      </div>
      <div class="cover-footer-right">
        <div class="cover-period">
          <span class="icon-r" style="font-size:7pt; margin-right:3px;">&#xf133;</span>
          {mes_inicio_extenso} {ano_inicio} — {mes_fim_extenso} {ano_fim}
        </div>
        <div class="cover-period-dates">{data_geracao_extenso}</div>
      </div>
    </div>
  </div>
</div>
```

### 5.3 Template do Header Padrão (páginas internas)

```html
<div class="page-header">
  <div class="page-header-left">
    <div class="page-header-logo">Gesttor Inttegra</div>
    <div class="page-header-sep"></div>
    <div class="page-header-doc">Programa de Trabalho — {programa.nome}</div>
  </div>
  <div class="page-header-right">{data_geracao_curta}</div>
</div>
```

### 5.4 Template de Título de Seção

```html
<div class="section-title">
  <div class="section-icon"><span class="icon">{unicode_icone}</span></div>
  <h2>{titulo_da_secao}</h2>
  <div class="section-line"></div>
</div>
```

### 5.5 Template de Card de Entrega

```html
<div class="ecard">
  <div class="ecard-head">
    <div class="ecard-head-left">
      <div class="ecard-num">E{NN}</div>
      <div class="ecard-title">{entrega.nome}</div>
    </div>
    <div class="ecard-period">
      <span class="icon-r">&#xf133;</span>
      {entrega.data_inicio} — {entrega.data_fim} | {entrega.duracao}
    </div>
  </div>
  <div class="ecard-body">
    <div class="ecard-desc">{entrega.descricao}</div>

    <!-- Se tiver atividades: -->
    <div class="ecard-act-title">
      <span class="icon">&#xf0ae;</span> Atividades ({total_atividades_entrega})
    </div>
    <table class="act-table">
      <thead>
        <tr>
          <th style="width:36%">Atividade</th>
          <th style="width:13%">Status</th>
          <th style="width:13%">Progresso</th>
          <th style="width:22%">Período</th>
          <th style="width:10%">Líder</th>
        </tr>
      </thead>
      <tbody>
        <!-- Para cada atividade: -->
        <tr>
          <td>{atividade.nome}</td>
          <td><span class="status {classe_status}">{texto_status}</span></td>
          <td>
            <span class="pbar">
              <span class="pbar-fill {classe_progresso}" style="width:{progresso}%"></span>
            </span>
            <span style="font-size:6pt; font-weight:600;">{progresso}%</span>
          </td>
          <td style="font-size:6.5pt;">{atividade.periodo}</td>
          <td>{atividade.lider}</td>
        </tr>
      </tbody>
    </table>

    <!-- Se NÃO tiver atividades: -->
    <div class="no-act">
      <span class="icon" style="color:var(--accent); font-size:7pt;">&#xf05a;</span>
      Nenhuma atividade vinculada a esta entrega.
    </div>
  </div>
</div>
```

### 5.6 Template do Rodapé Padrão

```html
<div class="page-footer">
  <div class="page-footer-conf">
    <span class="icon" style="color:var(--accent); font-size:6.5pt;">&#xf2f7;</span>
    Documento confidencial e de uso interno
  </div>
  <div>Gesttor Inttegra — Programa de Trabalho</div>
  <div>Página {N} de {total}</div>
</div>
```

---

## 6. CSS Completo de Referência

Abaixo está o CSS completo que deve ser incluído no `<style>` do documento HTML. Todas as classes, tamanhos, cores e espaçamentos estão definidos aqui e devem ser seguidos rigorosamente.

```css
:root {
  --primary: #1B2A4A;
  --primary-light: #2C4470;
  --accent: #C8A96E;
  --accent-light: #E8D5B0;
  --text-dark: #1a1a2e;
  --text-medium: #4a4a5a;
  --text-light: #7a7a8a;
  --bg-light: #F8F7F4;
  --bg-white: #FFFFFF;
  --border: #E8E6E1;
  --success: #2D8B55;
  --warning: #D4A017;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 0; }

body {
  font-family: 'Inter', sans-serif;
  color: var(--text-dark);
  background: var(--bg-white);
  font-size: 8.5pt;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.icon { font-family: 'FA6Solid'; font-style: normal; font-weight: 900; }
.icon-r { font-family: 'FA6Regular'; font-style: normal; font-weight: 400; }

.page {
  width: 210mm;
  min-height: 297mm;
  padding: 0;
  margin: 0 auto;
  background: var(--bg-white);
  position: relative;
  page-break-after: always;
  overflow: hidden;
}
.page:last-child { page-break-after: auto; }

/* COVER */
.cover {
  display: flex;
  flex-direction: column;
  min-height: 297mm;
  background: linear-gradient(160deg, var(--primary) 0%, #0F1B33 60%, #0a1225 100%);
  color: white;
  position: relative;
  overflow: hidden;
}
.cover::before {
  content: '';
  position: absolute;
  top: -20%; right: -15%;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200,169,110,0.12) 0%, transparent 70%);
}
.cover-header { padding: 30px 45px; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
.cover-logo { font-size: 13pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); }
.cover-logo span { color: rgba(255,255,255,0.5); font-weight: 300; margin-left: 8px; font-size: 8.5pt; letter-spacing: 1px; }
.cover-badge { background: rgba(200,169,110,0.15); border: 1px solid rgba(200,169,110,0.3); padding: 5px 14px; border-radius: 20px; font-size: 7pt; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--accent); }
.cover-content { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 45px; position: relative; z-index: 2; }
.cover-divider { width: 55px; height: 3px; background: var(--accent); margin-bottom: 22px; }
.cover-subtitle { font-size: 8.5pt; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
.cover-title { font-size: 34pt; font-weight: 800; line-height: 1.1; letter-spacing: -0.5px; }
.cover-title-accent { color: var(--accent); }
.cover-desc { font-size: 10pt; font-weight: 300; color: rgba(255,255,255,0.6); max-width: 400px; line-height: 1.6; margin-top: 14px; }
.cover-metrics { display: flex; gap: 0; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 25px; }
.cover-metric { flex: 1; text-align: left; padding-right: 20px; border-right: 1px solid rgba(255,255,255,0.08); }
.cover-metric:last-child { border-right: none; padding-left: 20px; }
.cover-metric:not(:first-child) { padding-left: 20px; }
.cover-metric-icon { font-size: 10pt; color: var(--accent); margin-bottom: 6px; opacity: 0.8; }
.cover-metric-value { font-size: 20pt; font-weight: 700; line-height: 1; margin-bottom: 3px; }
.cover-metric-label { font-size: 7pt; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.4); }
.cover-footer { padding: 25px 45px; display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 2; border-top: 1px solid rgba(255,255,255,0.06); }
.cover-footer-left { font-size: 7pt; color: rgba(255,255,255,0.3); line-height: 1.7; }
.cover-footer-right { text-align: right; }
.cover-period { font-size: 8pt; font-weight: 600; color: rgba(255,255,255,0.55); }
.cover-period-dates { font-size: 7pt; color: rgba(255,255,255,0.3); margin-top: 2px; }

/* INNER PAGES */
.inner-page { padding: 25px 38px 40px 38px; position: relative; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid var(--primary); margin-bottom: 18px; }
.page-header-left { display: flex; align-items: center; gap: 10px; }
.page-header-logo { font-size: 9pt; font-weight: 700; color: var(--primary); letter-spacing: 1px; text-transform: uppercase; }
.page-header-sep { width: 1px; height: 16px; background: var(--border); }
.page-header-doc { font-size: 7.5pt; color: var(--text-light); }
.page-header-right { font-size: 7pt; color: var(--text-light); }
.page-footer { position: absolute; bottom: 15px; left: 38px; right: 38px; display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border); font-size: 6.5pt; color: var(--text-light); }
.page-footer-conf { display: flex; align-items: center; gap: 4px; }

/* SECTION TITLES */
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; margin-top: 2px; }
.section-icon { width: 28px; height: 28px; background: var(--primary); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: 11pt; flex-shrink: 0; }
.section-title h2 { font-size: 12pt; font-weight: 700; color: var(--primary); }
.section-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

/* DESCRIPTION BOX */
.desc-box { background: var(--bg-light); border-left: 3px solid var(--accent); padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 16px; font-size: 8.5pt; color: var(--text-medium); line-height: 1.6; }

/* TRANSFORM GRID */
.tgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.tcard { background: var(--bg-white); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; position: relative; overflow: hidden; }
.tcard::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2.5px; background: var(--accent); }
.tcard-head { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.tcard-icon { width: 26px; height: 26px; background: linear-gradient(135deg, var(--primary), var(--primary-light)); border-radius: 5px; display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: 10pt; flex-shrink: 0; }
.tcard-num { font-size: 6.5pt; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; }
.tcard-title { font-size: 8pt; font-weight: 700; color: var(--primary); }
.tcard-items { list-style: none; padding: 0; }
.tcard-items li { font-size: 7pt; color: var(--text-medium); padding: 2px 0 2px 12px; position: relative; line-height: 1.4; }
.tcard-items li::before { content: ''; position: absolute; left: 0; top: 7px; width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }

/* EVIDENCE GRID */
.ev-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin-bottom: 16px; }
.ev-item { display: flex; align-items: flex-start; gap: 8px; padding: 9px 10px; background: var(--bg-light); border-radius: 6px; border: 1px solid var(--border); }
.ev-num { width: 20px; height: 20px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: 7pt; font-weight: 700; flex-shrink: 0; }
.ev-text { font-size: 7pt; color: var(--text-medium); line-height: 1.4; font-weight: 500; }

/* STAKEHOLDER TABLE */
.stk-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 16px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
.stk-table thead th { background: var(--primary); color: white; font-size: 6.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; padding: 8px 14px; text-align: left; }
.stk-table tbody td { padding: 7px 14px; font-size: 7.5pt; border-bottom: 1px solid var(--border); color: var(--text-medium); }
.stk-table tbody td:first-child { font-weight: 600; color: var(--text-dark); }
.stk-table tbody tr:last-child td { border-bottom: none; }
.stk-table tbody tr:nth-child(even) { background: var(--bg-light); }
.role-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 6.5pt; font-weight: 600; }
.role-mentor { background: rgba(200,169,110,0.15); color: #8B7340; }
.role-lint { background: rgba(41,128,185,0.12); color: #2471A3; }
.role-cons { background: rgba(142,68,173,0.12); color: #7D3C98; }
.role-lext { background: rgba(45,139,85,0.12); color: #1E8449; }

/* ENTREGA CARD */
.ecard { background: var(--bg-white); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
.ecard-head { background: linear-gradient(135deg, var(--primary), var(--primary-light)); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }
.ecard-head-left { display: flex; align-items: center; gap: 10px; }
.ecard-num { background: rgba(200,169,110,0.2); color: var(--accent); font-size: 7pt; font-weight: 700; padding: 3px 8px; border-radius: 4px; }
.ecard-title { font-size: 9.5pt; font-weight: 700; color: white; }
.ecard-period { color: rgba(255,255,255,0.55); font-size: 6.5pt; }
.ecard-period .icon { color: var(--accent); font-size: 7pt; margin-right: 3px; }
.ecard-body { padding: 12px 16px; }
.ecard-desc { font-size: 7.5pt; color: var(--text-medium); line-height: 1.55; margin-bottom: 10px; }
.ecard-act-title { display: flex; align-items: center; gap: 6px; font-size: 7.5pt; font-weight: 700; color: var(--primary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.8px; }
.ecard-act-title .icon { color: var(--accent); font-size: 8pt; }

/* ACTIVITY TABLE */
.act-table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); }
.act-table thead th { background: var(--bg-light); font-size: 6pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; padding: 6px 8px; text-align: left; color: var(--text-light); border-bottom: 1px solid var(--border); }
.act-table tbody td { padding: 5px 8px; font-size: 7pt; border-bottom: 1px solid var(--border); color: var(--text-medium); vertical-align: middle; }
.act-table tbody tr:last-child td { border-bottom: none; }

/* STATUS BADGES */
.status { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 6pt; font-weight: 600; white-space: nowrap; }
.st-ok { background: rgba(45,139,85,0.12); color: var(--success); }
.st-prog { background: rgba(212,160,23,0.12); color: var(--warning); }
.st-no { background: rgba(122,122,138,0.1); color: var(--text-light); }

/* PROGRESS BAR */
.pbar { width: 55px; height: 5px; background: #E8E6E1; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 3px; }
.pbar-fill { height: 100%; border-radius: 3px; }
.pbar-100 { background: var(--success); }
.pbar-50 { background: var(--warning); }
.pbar-0 { background: #D5D5D5; }

/* NO ACTIVITIES */
.no-act { padding: 10px 16px; text-align: center; color: var(--text-light); font-size: 7pt; font-style: italic; }

@media print {
  body { background: white; }
  .page { box-shadow: none; margin: 0; }
}
```

---

## 7. Checklist de Qualidade

Antes de gerar o PDF final, verificar:

1. Todos os ícones Font Awesome estão renderizando corretamente (não aparecem como quadrados ou caracteres estranhos)
2. As fontes Inter estão embarcadas e renderizando nos pesos corretos
3. A capa ocupa exatamente 1 página A4 sem overflow
4. O rodapé de cada página não sobrepõe o conteúdo acima
5. As barras de progresso estão proporcionais ao percentual real
6. Os badges de status estão com as cores corretas
7. A numeração de páginas está correta (N de N)
8. A numeração das entregas está sequencial (E01, E02, E03...)
9. Nenhum texto está cortado ou transbordando das caixas
10. A última página sempre contém o aviso de confidencialidade e as assinaturas
