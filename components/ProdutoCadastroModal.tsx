import React, { useState } from 'react';
import { X, ChevronDown, Info, Plus } from 'lucide-react';
import CentroCustoSelect from './CentroCustoSelect';

const INTEGRA_ACCENT = '#10b981';
const INTEGRA_TEXT = '#1e293b';
const INTEGRA_SUBTEXT = '#64748b';
const INTEGRA_BORDER = '#e2e8f0';
const INTEGRA_SURFACE = '#f8fafc';

const CATEGORIAS = [
  'ALIMENTAÇÃO+HOSPEDAGEM/DESLOCAMENTO',
  'ALUGUÉIS E CONDOMÍNIOS',
  'ANÁLISE BROMATOLOGICA',
  'ANÁLISE DE SOLO',
  'ARBORIZAÇÃO E REFLORESTAMENTO',
  'ARRENDAMENTOS',
  'ASSISTÊNCIA MÉDICA HOSPITALAR',
  'ASSOCIAÇÕES E ENTIDADES',
  'BOVINOS',
  'CASA SEDE',
  'COMBUSTÍVEIS',
  'COMISSÕES',
  'COMPRA DE BOVINOS',
  'COMPRA E MANTIMENTOS',
  'CONSERTO PARQUE DE MÁQUINAS',
  'CORRETIVO DE SOLO',
  'CORREIO',
  'CURVA DE NÍVEL',
  'DESPESAS COMERCIAIS',
  'DIARISTA',
  'DIVIDENDOS',
  'DOAÇÕES',
  'DOMA',
  'ECTOPARAZITÁRIO',
  'EMPREITADAS E SERVIÇOS TERCEIRIZADOS',
  'ENERGIA ELÉTRICA',
  'EQUÍDEOS',
  'FERRAMENTAS E EQUIPAMENTOS',
  'FERTILIZANTES',
  'FINANCIAMENTOS CRÉDITOS',
  'FINANCIAMENTOS DÉBITOS',
  'FRETES E TRANSPORTES',
  'FUNGICIDAS',
  'HERBICIDAS',
  'HOMEOPÁTICOS',
  'IMPLEMENTOS',
  'INOCULANTES',
  'INSETICIDAS',
  'INTERNET',
  'INVESTIMENTO REDE ELÉTRICA',
  'INVESTIMENTO REDE HIDRÁULICA',
  'JUROS',
  'LUBRIFICANTES',
  'MAT. ELET./HIDR./CONSTRUÇÃO',
  'MATERIAL DE CERCAS',
  'MATERIAL DE CONSTRUÇÃO',
  'MATERIAL DE ESCRITÓRIO',
  'MATERIAL DE IDENTIFICAÇÃO',
  'MATERIAL DE LIMPEZA',
  'MATERIAL DE SELARIA',
  'MATERIAL ELÉTRICO',
  'MATERIAL HIDRÁULICO',
  'MATERIAIS PARA CURRAL',
  'MEDICAMENTOS PARA ANIMAIS',
  'MEDICAMENTOS PARA HUMANOS',
  'MUDAS',
  'MUNÇÃO E ARMAMENTO',
  'MÓVEIS/UTENSÍLIOS/ELETRODOMÉSTICOS',
  'NUTRIÇÃO',
  'NÚCLEOS/IONÓFOROS/NITROGENADOS',
  'OUTROS',
  'OUTROS CRÉDITOS',
  'OUTROS DÉBITOS',
  'PASTAGENS',
  'PECUÁRIA',
  'PEÇAS E MATERIAIS DIVERSOS',
  'PENSÕES',
  'PREPARO DE SOLO',
  'PRÊMIOS/GRATIFICAÇÕES/BENEFÍCIOS',
  'RAÇÕES E GRÃOS CONCENTRADOS',
  'RASTREABILIDADE',
  'REPRODUÇÃO',
  'SALÁRIOS E ENCARGOS',
  'SANIDADE',
  'SEGURO VEÍCULOS E TRATORES',
  'SEGUROS DE SAÚDE E PREVIDÊNCIA',
  'SEMENTES',
  'SERVIÇO DE TREINAMENTO E ENSINO',
  'SERVIÇOS ADMINISTRATIVOS',
  'SERVIÇOS CONTÁBEIS',
  'SERVIÇOS DE INFORMAÇÕES',
  'SERVIÇOS E ASSESSORIA JURÍDICA',
  'SERVIÇOS E ASSESSORIA TÉCNICA',
  'SERVIÇOS MOTORIZADOS',
  'SUPLEMENTAÇÃO DE TERROS',
  'SUPLEMENTAÇÃO MINERAL',
  'SUPLEMENTAÇÃO PROTEICO/ENERGÉTICA',
  'SÊMEN E MATERIAL DE INSEMINAÇÃO',
  'TARIFAS E DESPESAS BANCÁRIAS',
  'TAXAS, IMPOSTOS E CONTRIBUIÇÕES',
  'TELEFONE',
  'TMT',
  'TRATAMENTO DE SEMENTE',
  'TRATORES',
  'TRATORES E IMPLEMENTOS',
  'UNIFORMES E EPI',
  'VACINAS',
  'VEÍCULOS',
  'VERMÍFUGOS',
  'VOLUMOSOS'
];

const NATUREZAS = [
  '-',
  'Matéria Prima',
  'Outros',
  'Produto Formulado',
  'Sanitário'
];

const UNIDADES_MEDIDA = [
  'ADIMENSIONAL (ADIMENSIONAL)',
  'ANOS (ANOS)',
  'ARROBA (@)',
  'CABEÇA (CAB)',
  'DIAS (D)',
  'DOSE (Dose)',
  'GRAMA (g)',
  'HECTARE (HA)',
  'MESES (M)',
  'METRO (m)',
  'MILILITRO (ML)',
  'MOEDA ($)',
  'NÚMERO (NUM)',
  'PORCENTAGEM (%)',
  'QUILOGRAMA (Kg)',
  'SACA (SC)',
  'SACA 25 KG (Sc)',
  'SACA 30 KG (Sc)',
  'SACA 40 KG (Sc)',
  'SACA 50 KG (Sc)',
  'SACA 60 KG (Sc)',
  'TEXTO (TEXTO)',
  'TONELADA (Ton)',
  'UNIDADE (Unid.)',
  'UNIDADE ANIMAL (UA)'
];

const DEPOSITOS = [
  'Deposito 1',
  'DEposito 2',
  'Deposito 3'
];

const AREAS_NEGOCIOS = [
  'Agricultura',
  'Pecuária',
  'Outros'
];

interface ProdutoCadastroModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProdutoCadastroModal({ open, onClose }: ProdutoCadastroModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    natureza: '-',
    materiaSeca: '0,00',
    consumoPrevisto: '0,00',
    formaEstoque: 'Não',
    codigoBarras: '',
    codigoFabricante: '',
    tipo: {
      grao: false,
      insumo: false,
      volumoso: false,
      outros: false
    },
    unidadeMedida: '',
    tipoCompra: '',
    quantidadeMinima: '0,000',
    deposito: '',
    estoqueNegativo: false,
    limiteNegativo: '',
    centroCusto: '',
    percentualCentroCusto: '100,00',
    novoRateioCentroCusto: false,
    areaNegocios: '',
    percentualAreaNegocios: '100,00',
    novoRateioAreaNegocios: false
  });

  if (!open) return null;

  const toggleTipo = (key: keyof typeof formData.tipo) => {
    setFormData({
      ...formData,
      tipo: { ...formData.tipo, [key]: !formData.tipo[key] }
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] bg-white rounded-md shadow-2xl flex flex-col h-[95vh]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#334155]">Produto/Serviço</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </header>

        {/* Steps/Breadcrumbs */}
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 text-[12px] text-ai-subtext">
            <span className="text-ai-accent font-semibold border-b-2 border-ai-accent pb-1">Produto/Serviço</span>
            <ChevronDown size={14} className="-rotate-90 opacity-40 ml-1" />
            <span className="opacity-40">Seleção de Matéria Prima</span>
            <ChevronDown size={14} className="-rotate-90 opacity-40 ml-1" />
            <span className="opacity-40">Dados Fiscais</span>
          </div>
          <div className="border-b mt-2" style={{ borderColor: INTEGRA_BORDER }}></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
          {/* Nome do Produto */}
          <div>
            <label className="block text-[12px] text-ai-subtext mb-1 italic">
              Nome do Produto/Serviço <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              placeholder="Nome do Produto/Serviço"
              className="w-full h-10 px-3 border rounded-md text-[13px] outline-none transition-focus focus:border-ai-accent"
              style={{ borderColor: INTEGRA_BORDER }}
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
            />
          </div>

          {/* Categoria e Natureza */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">
                Categoria <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] appearance-none outline-none focus:border-ai-accent"
                  style={{ borderColor: INTEGRA_BORDER, color: formData.categoria ? INTEGRA_TEXT : '#94a3b8' }}
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                >
                  <option value="" disabled>Categoria</option>
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown size={18} className="text-ai-subtext" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">
                Natureza do Produto <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] appearance-none outline-none focus:border-ai-accent"
                  style={{ borderColor: INTEGRA_BORDER }}
                  value={formData.natureza}
                  onChange={(e) => setFormData({...formData, natureza: e.target.value})}
                >
                  {NATUREZAS.map(nat => (
                    <option key={nat} value={nat}>{nat}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown size={18} className="text-ai-subtext" />
                </div>
              </div>
            </div>
          </div>

          {/* Matéria Seca e Consumo */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">
                % de Matéria Seca <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  className="w-full h-10 px-3 border rounded-md text-[13px] outline-none bg-white"
                  style={{ borderColor: INTEGRA_BORDER }}
                  value={formData.materiaSeca}
                  onChange={(e) => setFormData({...formData, materiaSeca: e.target.value})}
                />
                <span className="absolute right-3 text-[13px] text-ai-accent font-bold">%</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-[12px] text-ai-subtext italic">Consumo Previsto %PV</label>
                <Info size={14} className="text-ai-subtext cursor-help" />
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  className="w-full h-10 px-3 border rounded-md text-[13px] outline-none bg-[#f8fafc]"
                  style={{ borderColor: INTEGRA_BORDER }}
                  value={formData.consumoPrevisto}
                  onChange={(e) => setFormData({...formData, consumoPrevisto: e.target.value})}
                />
                <span className="absolute right-3 text-[13px] text-ai-accent font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Forma Estoque, Código Barras, Código Fabricante */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">
                Forma Estoque <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] appearance-none outline-none focus:border-ai-accent bg-[#f1f5f9]/50"
                  style={{ borderColor: INTEGRA_BORDER }}
                  value={formData.formaEstoque}
                  onChange={(e) => setFormData({...formData, formaEstoque: e.target.value})}
                >
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown size={18} className="text-ai-subtext" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">Código de Barras</label>
              <input
                type="text"
                placeholder="Código de Barras"
                className="w-full h-10 px-3 border rounded-md text-[13px] outline-none"
                style={{ borderColor: INTEGRA_BORDER }}
                value={formData.codigoBarras}
                onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">Código do Fabricante</label>
              <input
                type="text"
                placeholder="Código do Fabricante"
                className="w-full h-10 px-3 border rounded-md text-[13px] outline-none"
                style={{ borderColor: INTEGRA_BORDER }}
                value={formData.codigoFabricante}
                onChange={(e) => setFormData({...formData, codigoFabricante: e.target.value})}
              />
            </div>
          </div>

          {/* Tipo (Checkboxes) */}
          <div>
            <label className="block text-[12px] text-ai-subtext mb-2 italic">
              Tipo <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="flex items-center gap-6">
              {[
                { label: 'Grão', key: 'grao' },
                { label: 'Insumo', key: 'insumo' },
                { label: 'Volumoso', key: 'volumoso' },
                { label: 'Outros', key: 'outros' }
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <div 
                    onClick={() => toggleTipo(item.key as keyof typeof formData.tipo)}
                    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${formData.tipo[item.key as keyof typeof formData.tipo] ? 'bg-ai-accent border-ai-accent' : 'border-gray-300'}`}
                  >
                    {formData.tipo[item.key as keyof typeof formData.tipo] && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                  </div>
                  <span className="text-[13px] text-ai-text">{item.label}</span>
                  <Info size={14} className="text-ai-subtext cursor-help opacity-70" />
                </div>
              ))}
            </div>
          </div>

          {/* Unidade, Tipo Compra, Quantidade Mínima */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">
                Unid de Medida <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] appearance-none outline-none focus:border-ai-accent"
                  style={{ borderColor: INTEGRA_BORDER, color: formData.unidadeMedida ? INTEGRA_TEXT : '#94a3b8' }}
                  value={formData.unidadeMedida}
                  onChange={(e) => setFormData({...formData, unidadeMedida: e.target.value})}
                >
                  <option value="" disabled>Selecione um item</option>
                  {UNIDADES_MEDIDA.map(unid => (
                    <option key={unid} value={unid}>{unid}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown size={18} className="text-ai-subtext" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">Tipo de Compra</label>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] appearance-none outline-none focus:border-ai-accent"
                  style={{ borderColor: INTEGRA_BORDER, color: formData.tipoCompra ? INTEGRA_TEXT : '#94a3b8' }}
                  value={formData.tipoCompra}
                  onChange={(e) => setFormData({...formData, tipoCompra: e.target.value})}
                >
                  <option value="" disabled>Tipo de Compra</option>
                  <option value="Padrão">Padrão</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown size={18} className="text-ai-subtext" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-ai-subtext mb-1 italic">Quantidade Mínima</label>
              <input
                type="text"
                className="w-full h-10 px-3 border rounded-md text-[13px] outline-none"
                style={{ borderColor: INTEGRA_BORDER }}
                value={formData.quantidadeMinima}
                onChange={(e) => setFormData({...formData, quantidadeMinima: e.target.value})}
              />
            </div>
          </div>

          {/* Depósito */}
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-[316px]">
              <label className="block text-[12px] text-ai-subtext mb-1 italic">
                Depósito <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] appearance-none outline-none focus:border-ai-accent"
                  style={{ borderColor: INTEGRA_BORDER, color: formData.deposito ? INTEGRA_TEXT : '#94a3b8' }}
                  value={formData.deposito}
                  onChange={(e) => setFormData({...formData, deposito: e.target.value})}
                >
                  <option value="" disabled>Depósito</option>
                  {DEPOSITOS.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown size={18} className="text-ai-subtext" />
                </div>
              </div>
            </div>
            <button className="flex items-center gap-1 px-4 h-10 rounded-md text-white text-[13px] font-bold" style={{ backgroundColor: '#1a9a5c' }}>
              <Plus size={18} />
              Depósito
            </button>
          </div>

          {/* Estoque Negativo */}
          <div className="flex items-end gap-6 pt-2">
            <div className="flex items-center gap-3 pb-3">
              <div 
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${formData.estoqueNegativo ? 'bg-ai-accent' : 'bg-gray-300'}`}
                onClick={() => setFormData({...formData, estoqueNegativo: !formData.estoqueNegativo})}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.estoqueNegativo ? 'left-5.5' : 'left-0.5'}`}></div>
              </div>
              <span className="text-[13px] text-ai-text font-semibold">Estoque Negativo</span>
            </div>
            <div className="flex-1">
              <label className="block text-[12px] text-[#94a3b8] mb-1 italic">Limite Negativo</label>
              <input
                type="text"
                placeholder="Insira a quantidade"
                className="w-full h-10 px-3 border rounded-md text-[13px] outline-none bg-[#f8fafc]/50"
                style={{ borderColor: INTEGRA_BORDER }}
                value={formData.limiteNegativo}
                onChange={(e) => setFormData({...formData, limiteNegativo: e.target.value})}
              />
            </div>
          </div>

          {/* Rateio Section - Centro de Custo */}
          <div className="border rounded-lg px-6 py-6" style={{ borderColor: INTEGRA_BORDER }}>
            <div className="grid grid-cols-[1fr,150px,auto] items-end gap-4">
              <div>
                <label className="block text-[12px] text-ai-subtext mb-1 italic">Centro de Custo <span className="text-red-500 font-bold">*</span></label>
                <CentroCustoSelect 
                  value={formData.centroCusto}
                  onChange={(val) => setFormData({...formData, centroCusto: val})}
                />
              </div>
              <div>
                <label className="block text-[12px] text-ai-subtext mb-1 italic">Percentual</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    className="w-full h-10 px-3 border rounded-md text-[13px] outline-none bg-[#f8fafc] text-right"
                    style={{ borderColor: INTEGRA_BORDER }}
                    value={formData.percentualCentroCusto}
                    onChange={(e) => setFormData({...formData, percentualCentroCusto: e.target.value})}
                  />
                  <span className="absolute right-3 text-[13px] text-ai-accent font-bold">%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <div 
                  className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${formData.novoRateioCentroCusto ? 'bg-ai-accent' : 'bg-gray-300'}`}
                  onClick={() => setFormData({...formData, novoRateioCentroCusto: !formData.novoRateioCentroCusto})}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.novoRateioCentroCusto ? 'left-5.5' : 'left-0.5'}`}></div>
                </div>
                <span className="text-[12px] text-ai-text font-semibold">Novo rateio</span>
              </div>
            </div>
          </div>

          {/* Rateio Section - Área de Negócios */}
          <div className="border rounded-lg px-6 py-6" style={{ borderColor: INTEGRA_BORDER }}>
            <div className="grid grid-cols-[1fr,150px,auto] items-end gap-4">
              <div>
                <label className="block text-[12px] text-ai-subtext mb-1 italic">Área de Negócios</label>
                <div className="relative">
                  <select
                    className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] appearance-none outline-none focus:border-ai-accent"
                    style={{ borderColor: INTEGRA_BORDER, color: formData.areaNegocios ? INTEGRA_TEXT : '#94a3b8' }}
                    value={formData.areaNegocios}
                    onChange={(e) => setFormData({...formData, areaNegocios: e.target.value})}
                  >
                    <option value="" disabled>Selecione um grupo de projeto</option>
                    {AREAS_NEGOCIOS.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown size={18} className="text-ai-subtext" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-ai-subtext mb-1 italic">Percentual</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    className="w-full h-10 px-3 border rounded-md text-[13px] outline-none bg-[#f8fafc] text-right"
                    style={{ borderColor: INTEGRA_BORDER }}
                    value={formData.percentualAreaNegocios}
                    onChange={(e) => setFormData({...formData, percentualAreaNegocios: e.target.value})}
                  />
                  <span className="absolute right-3 text-[13px] text-ai-accent font-bold">%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <div 
                  className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${formData.novoRateioAreaNegocios ? 'bg-ai-accent' : 'bg-gray-300'}`}
                  onClick={() => setFormData({...formData, novoRateioAreaNegocios: !formData.novoRateioAreaNegocios})}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.novoRateioAreaNegocios ? 'left-5.5' : 'left-0.5'}`}></div>
                </div>
                <span className="text-[12px] text-ai-text font-semibold">Novo rateio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: INTEGRA_BORDER }}>
          <button 
            onClick={onClose}
            className="px-8 h-10 rounded-lg border text-[13px] font-semibold text-[#64748b] hover:bg-gray-50 bg-white"
            style={{ borderColor: INTEGRA_BORDER }}
          >
            Cancelar
          </button>
          <button 
            className="px-10 h-10 rounded-lg text-[13px] font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#1a9a5c' }}
          >
            Avançar
          </button>
          <button 
            className="px-8 h-10 rounded-lg text-[13px] font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#1a9a5c' }}
          >
            Salvar e Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
