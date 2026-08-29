// ============================================================
// PRODUTOS DE EXEMPLO (MOCK)
// ============================================================
// Só usados se o Supabase não estiver configurado ainda, ou se
// a conexão falhar — assim o catálogo nunca fica em branco.
// Mesma estrutura da tabela real: codigo, descricao, colecao,
// fracao (unidades por caixa fechada), preco_unitario, preco_total, imagem_url.
// fracao = 1 significa item vendido como peça/kit único (sem legenda de caixa).

const MOCK_PRODUCTS = [
  { codigo: "1000661", descricao: "XICARA CAFE ASTRAL SEM PIRES 90ML 400010200 24X1", colecao: "XICARAS", fracao: 24, preco_unitario: 3.25, preco_total: 78.06, imagem_url: "https://placehold.co/400x400/0d2c4a/ffffff?text=1000661" },
  { codigo: "3021909", descricao: "COPO AMAZON 2049 190ML 6X1", colecao: "CONJUNTOS E KITS", fracao: 8, preco_unitario: 10.57, preco_total: 84.56, imagem_url: "https://placehold.co/400x400/155a8a/ffffff?text=3021909" },
  { codigo: "3021602", descricao: "CONJUNTO ASSADEIRA OPALINE OVAL 0,6/1,0/1,4L 3 PEÇAS", colecao: "CONJUNTOS E KITS", fracao: 1, preco_unitario: 62.95, preco_total: 62.95, imagem_url: "https://placehold.co/400x400/8a6d3b/ffffff?text=3021602" },
  { codigo: "3023629", descricao: "ASSADEIRA CANELADA 1,6L 6A061 6X1", colecao: "ASSADEIRA", fracao: 6, preco_unitario: 22.28, preco_total: 133.70, imagem_url: "https://placehold.co/400x400/1c6ea4/ffffff?text=3023629" },
  { codigo: "1004586", descricao: "TAÇA BARONE AGUA 490ML 7056 12X1", colecao: "TAÇAS", fracao: 12, preco_unitario: 8.11, preco_total: 97.33, imagem_url: "https://placehold.co/400x400/2f8fc4/ffffff?text=1004586" },
  { codigo: "3022313", descricao: "POTE AMERICANO VINTAGE 0,5L C/TAMPA PEQUENO 9410 12X1", colecao: "POTES", fracao: 12, preco_unitario: 13.10, preco_total: 157.24, imagem_url: "https://placehold.co/400x400/0d2c4a/ffffff?text=3022313" },
];
