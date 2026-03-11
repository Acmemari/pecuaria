import React, { useState } from 'react';
import { X, CreditCard, Landmark, Wallet, Plus, Trash2 } from 'lucide-react';

interface ContaCadastroModalProps {
  open: boolean;
  onClose: () => void;
}

const ContaCadastroModal: React.FC<ContaCadastroModalProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Corrente',
    banco: '',
    agencia: '',
    numero: '',
    saldoInicial: '0,00',
    observacao: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simular salvamento
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getIconForType = (tipo: string) => {
    switch (tipo) {
      case 'Corrente': return <Landmark size={24} className="text-emerald-500" />;
      case 'Caixa': return <Wallet size={24} className="text-blue-500" />;
      default: return <CreditCard size={24} className="text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#1A212E] w-full max-w-2xl rounded-2xl shadow-2xl border border-white/5 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#2A3441] px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Plus size={20} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nova Conta Financeira</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Cadastro Inicial</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome da Conta / Identificação</label>
              <input
                required
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Banco do Brasil - Principal"
                className="w-full bg-[#1A212E] border border-[#37404E] rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo de Conta</label>
              <div className="relative">
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="w-full bg-[#1A212E] border border-[#37404E] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="Corrente">Conta Corrente</option>
                  <option value="Caixa">Caixa / Dinheiro</option>
                  <option value="Poupança">Poupança</option>
                  <option value="Investimento">Investimento</option>
                  <option value="Outros">Outros</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  {getIconForType(formData.tipo)}
                </div>
              </div>
            </div>

            {/* Banco */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Instituição / Banco</label>
              <input
                type="text"
                name="banco"
                value={formData.banco}
                onChange={handleChange}
                placeholder="Ex: Santander, Itaú, Nubank"
                className="w-full bg-[#1A212E] border border-[#37404E] rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              />
            </div>

            {/* Agencia e Numero */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</label>
                <input
                  type="text"
                  name="agencia"
                  value={formData.agencia}
                  onChange={handleChange}
                  placeholder="0000"
                  className="w-full bg-[#1A212E] border border-[#37404E] rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nº Conta</label>
                <input
                  type="text"
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  placeholder="00000-0"
                  className="w-full bg-[#1A212E] border border-[#37404E] rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            {/* Saldo Inicial */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo Inicial (R$)</label>
              <div className="relative">
                <input
                  type="text"
                  name="saldoInicial"
                  value={formData.saldoInicial}
                  onChange={handleChange}
                  className="w-full bg-[#1A212E] border border-[#37404E] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-right pr-12 text-emerald-400 font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-500/50">BRL</span>
              </div>
            </div>

            {/* Observação */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Observações</label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                rows={3}
                placeholder="Detalhes adicionais sobre a conta..."
                className="w-full bg-[#1A212E] border border-[#37404E] rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-[#2A3441] border-t border-white/5 flex items-center justify-between gap-4">
          <p className="text-[10px] text-gray-400 max-w-[200px] leading-tight">
            Este cadastro ficará disponível no módulo Financeiro para futuras movimentações.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-white/10 text-white text-sm font-bold hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              disabled={isLoading}
              onClick={handleSubmit}
              className="px-8 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Salvando...' : 'Salvar Conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContaCadastroModal;
