// ============================================================
// CONFIGURAÇÃO DO CATÁLOGO — edite este arquivo para personalizar
// ============================================================
// Este é o ÚNICO arquivo que muda de um vendedor para outro.
// Para criar o catálogo de outro vendedor, copie a pasta inteira
// e troque só os valores aqui embaixo.
// (a exceção é o arquivo plataforma.js, que NÃO muda entre vendedores)

const CONFIG = {
  // ---- Identificador único deste catálogo (marca + vendedor) ----
  // Usado pra checar na tabela "vendedores" se este catálogo está ativo
  // (assinatura em dia) ou pausado. Cada vendedor de cada marca tem o seu.
  vendedorId: "nadir-leonardo",

  // ---- Marca / catálogo ----
  marca: "Nadir",
  nomeCatalogo: "Loja Nadir",
  sloganMarca: "🍽️ Nadir, o toque especial da sua mesa! 🍽️",

  // ---- Dados do vendedor (aparecem no cabeçalho e no link do WhatsApp) ----
  vendedor: {
    nome: "Leonardo Nantes",
    slogan: "O seu Vendedor!",
    foto: "assets/vendedor-foto.jpg",
    // Número de WhatsApp no formato internacional, só números (DDI 55 + DDD + número)
    whatsapp: "5547997375295",
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
