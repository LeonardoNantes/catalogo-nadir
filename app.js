// ============================================================
// LÓGICA DO CATÁLOGO HAVAIANAS — 4 telas, segmentos, coleções,
// produtos agrupados por cor (com várias numerações por card),
// carrinho e WhatsApp
// ============================================================

// codigo -> { produto, quantidade }
// "quantidade" é sempre número de PARES. Cada clique no +/- soma ou tira
// "produto.fracao" pares de uma vez (1 = unitário, ou 2 / 6 quando a
// coleção só é vendida em múltiplos, ex: Top Adulto, Tradicional).
const carrinho = new Map();
let TODOS_PRODUTOS = [];
let PRODUTOS_POR_SEGMENTO = new Map(); // segmento -> [produtos]
let SEGMENTO_ATUAL = null;
let COLECAO_ATUAL = null;

// ---------- Formatação ----------
function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Rótulo de preço de uma coleção: usa a linha de qualquer produto dela
// (preco/negociacao são os mesmos pra todo mundo na mesma coleção).
function rotuloPrecoColecao(produtosDaColecao) {
  const exemplo = produtosDaColecao[0];
  if (exemplo.negociacao) return "Negociação";
  return formatarPreco(exemplo.preco);
}

// ---------- Navegação entre telas ----------
function mostrarTela(idTela, direcao = "frente") {
  document.querySelectorAll(".tela").forEach((tela) => {
    const éAlvo = tela.id === idTela;
    tela.hidden = !éAlvo;
    tela.classList.remove("tela-anim-frente", "tela-anim-voltar");
    if (éAlvo) {
      void tela.offsetWidth; // força reflow pra reiniciar a animação
      tela.classList.add(direcao === "voltar" ? "tela-anim-voltar" : "tela-anim-frente");
    }
  });
  // O botão flutuante do carrinho não aparece na tela do próprio carrinho nem na de pausado
  const btnCarrinho = document.getElementById("btn-carrinho");
  btnCarrinho.hidden = idTela === "tela-carrinho" || idTela === "tela-pausado";
  window.scrollTo(0, 0);
}

// ---------- Cabeçalho e blocos fixos da tela inicial ----------
function iniciarCabecalho() {
  document.getElementById("nome-catalogo").textContent = CONFIG.nomeCatalogo;
  document.getElementById("vendedor-nome").textContent = CONFIG.vendedor.nome;
  document.getElementById("vendedor-slogan").textContent = CONFIG.vendedor.slogan;
  document.getElementById("vendedor-foto").src = CONFIG.vendedor.foto;
  document.getElementById("slogan-marca").textContent = CONFIG.sloganMarca;
  document.documentElement.style.setProperty("--cor-primaria", CONFIG.corPrimaria);
  document.documentElement.style.setProperty("--cor-destaque", CONFIG.corDestaque);
  document.title = CONFIG.nomeCatalogo;

  const btnSolicitar = document.getElementById("btn-solicitar-catalogo");
  const texto = encodeURIComponent(PLATAFORMA.mensagemPadrao);
  btnSolicitar.href = `https://wa.me/${PLATAFORMA.whatsapp}?text=${texto}`;
}

// ---------- Agrupamento ----------
function agruparPor(produtos, chave) {
  const mapa = new Map();
  produtos.forEach((p) => {
    if (!mapa.has(p[chave])) mapa.set(p[chave], []);
    mapa.get(p[chave]).push(p);
  });
  return mapa;
}

// Pega a paleta de tons daquele segmento (cada segmento tem a sua, definida
// em config.js). Se algum segmento novo aparecer sem paleta cadastrada, cai
// de volta na paleta do Masculino (azul) só por segurança.
function paletaDoSegmento(segmento) {
  return CONFIG.paletasPorSegmento[segmento] || CONFIG.paletasPorSegmento.Masculino;
}

// ---------- Tela 1: cards de SEGMENTO ----------
function renderizarCardsSegmento() {
  const grade = document.getElementById("grade-segmentos");
  grade.innerHTML = "";

  for (const [segmento, produtos] of PRODUTOS_POR_SEGMENTO) {
    // O card do segmento usa o primeiro tom (o mais forte) da paleta dele.
    const cor = paletaDoSegmento(segmento)[0];

    const card = document.createElement("button");
    card.className = "segmento-card";
    card.style.setProperty("--cor-card", cor);
    card.innerHTML = `<span class="segmento-card-nome">${segmento}</span>`;
    card.addEventListener("click", () => abrirSegmento(segmento));
    grade.appendChild(card);
  }
}

// ---------- Tela 2: cards de COLEÇÃO (com preço ou "Negociação") ----------
function abrirSegmento(segmento) {
  SEGMENTO_ATUAL = segmento;
  document.getElementById("titulo-segmento").textContent = segmento;
  renderizarCardsColecao(PRODUTOS_POR_SEGMENTO.get(segmento) || []);
  mostrarTela("tela-segmento");
}

function renderizarCardsColecao(produtosDoSegmento) {
  const grade = document.getElementById("grade-colecoes");
  grade.innerHTML = "";
  const porColecao = agruparPor(produtosDoSegmento, "colecao");
  const paleta = paletaDoSegmento(SEGMENTO_ATUAL);
  let i = 0;

  for (const [colecao, produtos] of porColecao) {
    const cor = paleta[i % paleta.length];
    i++;

    const card = document.createElement("button");
    card.className = "colecao-card";
    card.style.setProperty("--cor-card", cor);
    card.innerHTML = `
      <span class="colecao-card-nome">${colecao}</span>
      <span class="colecao-card-preco">${rotuloPrecoColecao(produtos)}</span>
    `;
    card.addEventListener("click", () => abrirColecao(colecao));
    grade.appendChild(card);
  }
}

// ---------- Tela 3: cards de PRODUTO (um por cor, com todas as numerações) ----------
function abrirColecao(colecao) {
  COLECAO_ATUAL = colecao;
  document.getElementById("titulo-colecao").textContent = colecao;

  const produtosDaColecao = (PRODUTOS_POR_SEGMENTO.get(SEGMENTO_ATUAL) || []).filter(
    (p) => p.colecao === colecao
  );

  renderizarGradeProdutos(produtosDaColecao);
  mostrarTela("tela-colecao");
}

function criarCardProduto(cor, numeracoes) {
  const card = document.createElement("article");
  card.className = "produto-card-grupo";

  const primeiro = numeracoes[0];
  card.innerHTML = `
    <div class="produto-imagem-wrap-grupo">
      <img class="produto-imagem-grupo" src="${primeiro.imagem_url}" alt="${cor}" loading="lazy" />
    </div>
    <div class="produto-info-grupo">
      <h3 class="produto-cor-nome">${cor}</h3>
      <div class="grade-numeracoes"></div>
    </div>
  `;

  const gradeNumeracoes = card.querySelector(".grade-numeracoes");
  numeracoes.forEach((produto) => {
    const quantidadeAtual = carrinho.get(produto.codigo)?.quantidade || 0;

    const item = document.createElement("div");
    item.className = "numeracao-item";
    item.innerHTML = `
      <span class="numeracao-item-tam">${produto.numeracao}</span>
      <div class="qtd-seletor qtd-seletor-compacto">
        <button class="qtd-btn qtd-menos" aria-label="Diminuir quantidade">−</button>
        <span class="qtd-valor">${quantidadeAtual}</span>
        <button class="qtd-btn qtd-mais" aria-label="Aumentar quantidade">+</button>
      </div>
    `;

    const qtdValorEl = item.querySelector(".qtd-valor");
    item.querySelector(".qtd-mais").addEventListener("click", () => {
      alterarQuantidade(produto, produto.fracao, qtdValorEl);
    });
    item.querySelector(".qtd-menos").addEventListener("click", () => {
      alterarQuantidade(produto, -produto.fracao, qtdValorEl);
    });

    gradeNumeracoes.appendChild(item);
  });

  return card;
}

function renderizarGradeProdutos(produtosDaColecao) {
  const grade = document.getElementById("grade-produtos");
  grade.innerHTML = "";
  const porCor = agruparPor(produtosDaColecao, "cor");
  const fragmento = document.createDocumentFragment();
  for (const [cor, numeracoes] of porCor) {
    fragmento.appendChild(criarCardProduto(cor, numeracoes));
  }
  grade.appendChild(fragmento);
}

// ---------- Carrinho ----------
function alterarQuantidade(produto, delta, qtdValorEl) {
  const atual = carrinho.get(produto.codigo)?.quantidade || 0;
  const nova = Math.max(0, atual + delta);

  if (nova === 0) {
    carrinho.delete(produto.codigo);
  } else {
    carrinho.set(produto.codigo, { produto, quantidade: nova });
  }

  if (qtdValorEl) qtdValorEl.textContent = nova;
  atualizarContadorCarrinho();
}

function atualizarContadorCarrinho() {
  let total = 0;
  carrinho.forEach((item) => (total += item.quantidade));
  document.getElementById("carrinho-contagem").textContent = total;

  const btnCarrinho = document.getElementById("btn-carrinho");
  btnCarrinho.classList.remove("pulso");
  void btnCarrinho.offsetWidth;
  btnCarrinho.classList.add("pulso");
}

// Soma só os itens de coleções COM preço definido — coleções em negociação
// entram no carrinho e no pedido com as quantidades, mas não somam valor.
function calcularTotalCarrinho() {
  let total = 0;
  carrinho.forEach((item) => {
    if (!item.produto.negociacao) {
      total += item.quantidade * Number(item.produto.preco);
    }
  });
  return total;
}

function temItemEmNegociacao() {
  for (const item of carrinho.values()) {
    if (item.produto.negociacao) return true;
  }
  return false;
}

// Comparador alfabético (ignora maiúsc./minúsc. e acentos) usado pra
// ordenar coleções e cores no carrinho e no texto do pedido.
function compararTexto(a, b) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

// Numeração tipo "37/38" -> 37, pra ordenar da menor pra maior.
function numeracaoParaOrdenacao(numeracao) {
  const primeiro = parseInt(numeracao, 10);
  return Number.isNaN(primeiro) ? 0 : primeiro;
}

// Agrupa os itens do carrinho por coleção, em ordem alfabética — mesma
// estrutura usada no painel do carrinho e no texto do pedido, pra ficar
// igual no app e no WhatsApp.
function agruparCarrinhoPorColecao() {
  const porColecao = new Map(); // colecao -> { produtoExemplo, itens: [{produto,quantidade}] }
  carrinho.forEach((item) => {
    const colecao = item.produto.colecao;
    if (!porColecao.has(colecao)) {
      porColecao.set(colecao, { exemplo: item.produto, itens: [] });
    }
    porColecao.get(colecao).itens.push(item);
  });

  const colecoesOrdenadas = [...porColecao.keys()].sort(compararTexto);
  const porColecaoOrdenada = new Map();
  colecoesOrdenadas.forEach((colecao) => porColecaoOrdenada.set(colecao, porColecao.get(colecao)));
  return porColecaoOrdenada;
}

// Agrupa os itens de uma coleção por cor, em ordem alfabética, e dentro de
// cada cor ordena as numerações da menor pra maior.
function agruparItensPorCor(itens) {
  const porCor = new Map();
  itens.forEach((item) => {
    const cor = item.produto.cor;
    if (!porCor.has(cor)) porCor.set(cor, []);
    porCor.get(cor).push(item);
  });

  const coresOrdenadas = [...porCor.keys()].sort(compararTexto);
  const porCorOrdenada = new Map();
  coresOrdenadas.forEach((cor) => {
    const itensDaCor = porCor
      .get(cor)
      .sort((a, b) => numeracaoParaOrdenacao(a.produto.numeracao) - numeracaoParaOrdenacao(b.produto.numeracao));
    porCorOrdenada.set(cor, itensDaCor);
  });
  return porCorOrdenada;
}

function renderizarPainelCarrinho() {
  const lista = document.getElementById("lista-carrinho");
  lista.innerHTML = "";

  if (carrinho.size === 0) {
    lista.innerHTML = `
      <div class="carrinho-vazio">
        <span class="carrinho-vazio-icone">👡</span>
        <p>Seu carrinho está vazio.<br>Escolha um segmento e adicione seus produtos!</p>
      </div>
    `;
  } else {
    const porColecao = agruparCarrinhoPorColecao();
    porColecao.forEach(({ exemplo, itens }, colecao) => {
      const grupoColecao = document.createElement("div");
      grupoColecao.className = "carrinho-grupo-colecao";
      grupoColecao.innerHTML = `
        <p class="carrinho-colecao-titulo">${colecao} <span class="carrinho-colecao-preco">${
        exemplo.negociacao ? "Negociação" : formatarPreco(exemplo.preco)
      }</span></p>
      `;

      const porCor = agruparItensPorCor(itens);
      porCor.forEach((itensDaCor) => {
        itensDaCor.forEach(({ produto, quantidade }) => {
          const linha = document.createElement("div");
          linha.className = "carrinho-item";
          linha.innerHTML = `
            <div class="carrinho-item-info">
              <p class="carrinho-item-nome">${produto.cor} · ${produto.numeracao}</p>
              <p class="carrinho-item-codigo">Cód. ${produto.codigo}</p>
            </div>
            <div class="qtd-seletor">
              <button class="qtd-btn qtd-menos" aria-label="Diminuir quantidade">−</button>
              <span class="qtd-valor">${quantidade}</span>
              <button class="qtd-btn qtd-mais" aria-label="Aumentar quantidade">+</button>
            </div>
          `;
          const qtdValorEl = linha.querySelector(".qtd-valor");
          linha.querySelector(".qtd-mais").addEventListener("click", () => {
            alterarQuantidade(produto, produto.fracao, qtdValorEl);
            renderizarPainelCarrinho();
          });
          linha.querySelector(".qtd-menos").addEventListener("click", () => {
            alterarQuantidade(produto, -produto.fracao, qtdValorEl);
            renderizarPainelCarrinho();
          });
          grupoColecao.appendChild(linha);
        });
      });

      lista.appendChild(grupoColecao);
    });
  }

  document.getElementById("carrinho-total-valor").textContent = formatarPreco(calcularTotalCarrinho());
  document.getElementById("carrinho-negociacao-aviso").hidden = !temItemEmNegociacao();
}

function limparCarrinho() {
  if (carrinho.size === 0) return;
  const confirmar = confirm("Excluir todos os itens do carrinho?");
  if (!confirmar) return;
  carrinho.clear();
  atualizarContadorCarrinho();
  renderizarPainelCarrinho();
}

function abrirCarrinho() {
  renderizarPainelCarrinho();
  mostrarTela("tela-carrinho");
}

function voltarDoCarrinho() {
  if (COLECAO_ATUAL && SEGMENTO_ATUAL) {
    const produtosDaColecao = (PRODUTOS_POR_SEGMENTO.get(SEGMENTO_ATUAL) || []).filter(
      (p) => p.colecao === COLECAO_ATUAL
    );
    renderizarGradeProdutos(produtosDaColecao);
    mostrarTela("tela-colecao", "voltar");
  } else if (SEGMENTO_ATUAL) {
    renderizarCardsColecao(PRODUTOS_POR_SEGMENTO.get(SEGMENTO_ATUAL) || []);
    mostrarTela("tela-segmento", "voltar");
  } else {
    mostrarTela("tela-inicial", "voltar");
  }
}

// ---------- Envio do pedido pelo WhatsApp ----------
// Formato (negrito e citação são os próprios códigos de formatação do
// WhatsApp: *texto* = negrito, > no início da linha = bloco de citação):
//
// 📋 *Pedido Havaianas*
// Loja: [nome da loja]
//
// > *BRASIL - R$31,90*
// - *AZUL NAVAL*
// Cód: 1202477 | 33/34 | Qtd: 2
//
// > *TOP ADULTO - Negociação*
// - *AMARELO POP*
// Cód: 1221317 | 33/34 | Qtd: 2
//
// *TOTAL DO PEDIDO: R$95,70*
function montarTextoPedido() {
  const nomeLoja = document.getElementById("input-loja").value.trim();
  const linhas = [`📋 *Pedido ${CONFIG.nomeCatalogo}*`, `Loja: ${nomeLoja || "Não informada"}`, ""];

  const porColecao = agruparCarrinhoPorColecao();
  porColecao.forEach(({ exemplo, itens }, colecao) => {
    const rotulo = exemplo.negociacao ? "Negociação" : formatarPreco(exemplo.preco);
    linhas.push(`> *${colecao.toUpperCase()} - ${rotulo}*`);

    const porCor = agruparItensPorCor(itens);

    porCor.forEach((itensDaCor, cor) => {
      linhas.push(`- *${cor.toUpperCase()}*`);
      itensDaCor.forEach(({ produto, quantidade }) => {
        linhas.push(`Cód: ${produto.codigo} | ${produto.numeracao} | Qtd: ${quantidade}`);
      });
    });

    linhas.push("");
  });

  linhas.push(`*TOTAL DO PEDIDO: ${formatarPreco(calcularTotalCarrinho())}*`);
  if (temItemEmNegociacao()) {
    linhas.push(`_(itens em negociação não entram nesse total)_`);
  }
  return linhas.join("\n");
}

function enviarPedidoWhatsapp() {
  if (carrinho.size === 0) {
    alert("Adicione pelo menos um produto antes de enviar o pedido.");
    return;
  }
  const texto = encodeURIComponent(montarTextoPedido());
  const url = `https://wa.me/${CONFIG.vendedor.whatsapp}?text=${texto}`;
  window.open(url, "_blank");
}

// ---------- Tela de pausado (assinatura em atraso) ----------
function configurarBotaoPausado() {
  const btn = document.getElementById("btn-pausado-whatsapp");
  const texto = encodeURIComponent(
    `Olá! Meu catálogo (${CONFIG.nomeCatalogo}) está pausado, gostaria de regularizar o acesso.`
  );
  btn.href = `https://wa.me/${PLATAFORMA.whatsapp}?text=${texto}`;
}

// ---------- Boot ----------
async function iniciar() {
  iniciarCabecalho();

  const carregando = document.getElementById("carregando-app");

  const vendedorAtivo = await verificarVendedorAtivo();
  if (!vendedorAtivo) {
    carregando.hidden = true;
    configurarBotaoPausado();
    mostrarTela("tela-pausado");
    return;
  }

  const statusMsg = document.getElementById("status-msg");
  statusMsg.hidden = false;
  statusMsg.innerHTML = `<span class="spinner"></span> Carregando segmentos...`;

  TODOS_PRODUTOS = await buscarProdutos();
  PRODUTOS_POR_SEGMENTO = agruparPor(TODOS_PRODUTOS, "segmento");

  statusMsg.hidden = true;
  renderizarCardsSegmento();

  document.getElementById("btn-carrinho").addEventListener("click", abrirCarrinho);
  document.getElementById("btn-voltar-segmento").addEventListener("click", () => {
    SEGMENTO_ATUAL = null;
    mostrarTela("tela-inicial", "voltar");
  });
  document.getElementById("btn-voltar-colecao").addEventListener("click", () => {
    COLECAO_ATUAL = null;
    mostrarTela("tela-segmento", "voltar");
  });
  document.getElementById("btn-voltar-carrinho").addEventListener("click", voltarDoCarrinho);
  document.getElementById("btn-enviar-pedido").addEventListener("click", enviarPedidoWhatsapp);
  document.getElementById("btn-limpar-carrinho").addEventListener("click", limparCarrinho);

  carregando.hidden = true;
  mostrarTela("tela-inicial");
}

document.addEventListener("DOMContentLoaded", iniciar);
