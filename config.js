// ============================================================
// CONFIGURAÇÃO DO CATÁLOGO — site COMPARTILHADO do Nadir
// ============================================================
// Esta versão é diferente da versão "1 vendedor = 1 pasta" de antes:
// aqui NÃO existe mais vendedorId nem nome/whatsapp fixos. Cada acesso
// descobre sozinho quem é o vendedor (por ?v=slug na URL, ou pelo
// domínio antigo) e busca nome/foto/whatsapp dele no Supabase, na hora.
// Ver supabase-client.js (resolverVendedorId / buscarStatusVendedor).

const CONFIG = {
  // ---- Marca / catálogo (igual pra todo mundo) ----
  marca: "Nadir",
  nomeCatalogo: "Loja Nadir",
  sloganMarca: "🍽️ Nadir, o toque especial da sua mesa! 🍽️",

  // ---- Vendedor: valores usados só nos primeiros instantes, antes de
  // carregar os dados reais do vendedor identificado pelo link ----
  vendedorPadrao: {
    slogan: "O seu Vendedor!",
    foto: "assets/vendedor-foto.jpg",
  },

  // ---- Cores da marca (usadas no cabeçalho e nos botões) ----
  corPrimaria: "#0d2c4a", // fundo do cabeçalho — azul-marinho (linha Marinex/vidro)
  corDestaque: "#d99a3a", // botão de enviar pedido, destaques — âmbar/dourado
  corDourada: "#d4af37", // borda discreta da foto do vendedor

  // Paleta dos cards de coleção — tons de azul-petróleo/marinho, com um
  // tom âmbar de vez em quando pra dar variedade sem fugir do tema.
  paletaCards: ["#0d2c4a", "#155a8a", "#1c6ea4", "#2f8fc4", "#8a6d3b"],

  // ---- Supabase ----
  // Mesmo projeto Supabase usado no Impala — só muda a tabela e o bucket.
  supabase: {
    url: "https://eubbzefshftafjjcirna.supabase.co",
    anonKey: "sb_publishable_GZ-duizLJSQSVcdYejzWGQ_wdNUu8vA",
    tabela: "nadir", // nome da tabela de produtos do Nadir no Supabase
    bucketImagens: "produtos-nadir", // bucket público com as fotos, nomeadas pelo código
  },
};
