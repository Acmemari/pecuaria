export interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  paiId?: string;
  children?: CentroCusto[];
}

export const CENTROS_DE_CUSTO: CentroCusto[] = [
  {
    id: "2",
    codigo: "2",
    nome: "Agricultura e Silvicultura",
    children: [
      {
        id: "2.1",
        codigo: "2.1",
        nome: "Cana",
        paiId: "2",
        children: [
          { id: "2.1.1", codigo: "2.1.1", nome: "Arrendamento", paiId: "2.1" },
          { id: "2.1.2", codigo: "2.1.2", nome: "Colheita e Transporte", paiId: "2.1" },
          { id: "2.1.3", codigo: "2.1.3", nome: "Corretivos e Fertilizantes", paiId: "2.1", children: [
            { id: "2.1.3.1", codigo: "2.1.3.1", nome: "Corretivos", paiId: "2.1.3" },
            { id: "2.1.3.2", codigo: "2.1.3.2", nome: "Fertilizantes Naturais", paiId: "2.1.3" },
            { id: "2.1.3.3", codigo: "2.1.3.3", nome: "Fertilizantes Químicos", paiId: "2.1.3" }
          ]},
          { id: "2.1.4", codigo: "2.1.4", nome: "Defensivos", paiId: "2.1", children: [
            { id: "2.1.4.1", codigo: "2.1.4.1", nome: "Defensivos Biológicos", paiId: "2.1.4" },
            { id: "2.1.4.2", codigo: "2.1.4.2", nome: "Defensivos Químicos", paiId: "2.1.4" }
          ]},
          { id: "2.1.5", codigo: "2.1.5", nome: "Mão de Obra Terceirizada (Funcionários Diaristas)", paiId: "2.1" }
        ]
      },
      { id: "2.2", codigo: "2.2", nome: "Eucalipto", paiId: "2" },
      { id: "2.3", codigo: "2.3", nome: "Feijão", paiId: "2" },
      { id: "2.4", codigo: "2.4", nome: "Mandioca", paiId: "2" },
      { id: "2.5", codigo: "2.5", nome: "Milho Safrinha", paiId: "2" },
      { id: "2.6", codigo: "2.6", nome: "Milho Verão", paiId: "2" }
    ]
  },
  {
    id: "3",
    codigo: "3",
    nome: "Investimentos",
    children: [
      { id: "3.1", codigo: "3.1", nome: "Investimentos em Bovinos", paiId: "3" },
      { id: "3.2", codigo: "3.2", nome: "Investimentos em Infraestrutura", paiId: "3" }
    ]
  },
  {
    id: "4",
    codigo: "4",
    nome: "Mão de Obra Permanente",
    children: [
      { id: "4.1", codigo: "4.1", nome: "Mão de Obra Permanente", paiId: "4" }
    ]
  },
  {
    id: "5",
    codigo: "5",
    nome: "Pecuária",
    children: [
      { id: "5.1", codigo: "5.1", nome: "Forrageiras, Culturas Anuais e Outros: Pastejo", paiId: "5" },
      { id: "5.2", codigo: "5.2", nome: "Forrageiras, Silagens e Outros: Cocho", paiId: "5" }
    ]
  },
  {
    id: "6",
    codigo: "6",
    nome: "Suporte Produção",
    children: [
      { id: "6.1", codigo: "6.1", nome: "Administração", paiId: "6" },
      { id: "6.2", codigo: "6.2", nome: "Manutenção de Infraestrutura", paiId: "6" }
    ]
  },
  {
    id: "8",
    codigo: "8",
    nome: "Outros Débitos",
    children: [
      { id: "8.1", codigo: "8.1", nome: "Outros Débitos", paiId: "8" }
    ]
  }
];
