// ============================================================
// LÓGICA DO CATÁLOGO — versão do site COMPARTILHADO (3 telas, coleções,
// carrinho e WhatsApp) — reconhece o vendedor por ?v= ou domínio antigo
// ============================================================

// codigo -> { produto, quantidade }
// "quantidade" aqui é número de CAIXAS FECHADAS (ou de kits/peças únicas
// quando fracao = 1) — não número de peças individuais. Cada clique no
// +/- soma ou tira 1 caixa. O preço usado nas contas é sempre o
// preco_total (preço da caixa já pronto na planilha), pra bater
// exatamente com o valor que o Leonardo lança no sistema real dele.
const carrinho = new Map();
let TODOS_PRODUTOS = [];
let PRODUTOS_POR_COLECAO = new Map(); // colecao -> [produtos]
let COLECAO_ATUAL = null; // colecao sendo exibida na tela 2
let VENDEDOR_ATUAL = null; // { nome, whatsapp, foto_url, area, ... } do vendedor resolvido nesse acesso

// ---------- Carrinho guardado no celular (localStorage) ----------
// O carrinho fica guardado no próprio navegador do cliente, numa "gaveta"
// separada por vendedor (chave com o slug), pra não misturar o carrinho de
// um vendedor com o de outro. Guarda só código do produto + quantidade (o
// preço sempre vem atualizado do banco); se um código sair do catálogo, ele
// é ignorado ao carregar. Não expira sozinho — fica até o cliente limpar.
// Depois de "Enviar pedido", guarda a hora do envio; quando o cliente volta
// pra página, pergunta se já enviou e se quer limpar (ver perguntarSeJaEnviou).
let CHAVE_CARRINHO = null; // definida no iniciar(), por vendedor
let ENVIADO_EM = null; // hora do último "Enviar pedido" (ou null)
let PERGUNTA_ENVIO_ABERTA = false;

function salvarCarrinho() {
  if (!CHAVE_CARRINHO) return;
  try {
    const itens = {};
    carrinho.forEach(({ quantidade }, codigo) => { if (quantidade > 0) itens[codigo] = quantidade; });
    if (Object.keys(itens).length === 0) {
      localStorage.removeItem(CHAVE_CARRINHO);
      ENVIADO_EM = null;
      return;
    }
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify({ itens, enviadoEm: ENVIADO_EM }));
  } catch (erro) {
    // Navegador sem espaço/modo privado: segue funcionando, só não guarda.
  }
}

function carregarCarrinhoSalvo() {
  if (!CHAVE_CARRINHO) return;
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "null");
    if (!salvo || !salvo.itens) return;
    const produtoPorCodigo = new Map(TODOS_PRODUTOS.map((p) => [String(p.codigo), p]));
    Object.entries(salvo.itens).forEach(([codigo, quantidade]) => {
      const produto = produtoPorCodigo.get(String(codigo));
      const qtd = Math.floor(Number(quantidade));
      if (produto && qtd > 0) carrinho.set(produto.codigo, { produto, quantidade: qtd });
    });
    ENVIADO_EM = salvo.enviadoEm || null;
    salvarCarrinho(); // já limpa do guardado os códigos que saíram do catálogo
  } catch (erro) {
    // Guardado corrompido: ignora e começa do zero.
  }
}

// Caixinha de pergunta da própria página (no lugar do confirm() do
// navegador, que no celular fica feio e às vezes é bloqueado).
function perguntar(texto, rotuloSim, rotuloNao) {
  return new Promise((resolve) => {
    const fundo = document.getElementById("dialogo-fundo");
    document.getElementById("dialogo-texto").textContent = texto;
    const sim = document.getElementById("dialogo-sim");
    const nao = document.getElementById("dialogo-nao");
    sim.textContent = rotuloSim;
    nao.textContent = rotuloNao;
    fundo.hidden = false;
    const fechar = (resposta) => {
      fundo.hidden = true;
      sim.onclick = null;
      nao.onclick = null;
      resolve(resposta);
    };
    sim.onclick = () => fechar(true);
    nao.onclick = () => fechar(false);
  });
}

// Quando o cliente volta pra página depois de ter tocado em "Enviar pedido"
// (voltou do WhatsApp, ou abriu o link de novo), pergunta se já enviou.
// Espera alguns segundos depois do envio pra não perguntar na hora em que o
// WhatsApp ainda está abrindo.
async function perguntarSeJaEnviou() {
  if (!ENVIADO_EM || PERGUNTA_ENVIO_ABERTA || carrinho.size === 0) return;
  if (Date.now() - ENVIADO_EM < 4000) return;
  PERGUNTA_ENVIO_ABERTA = true;
  const limpar = await perguntar(
    "Você já enviou esse pedido pelo WhatsApp? Quer limpar o carrinho pra começar outro?",
    "Sim, limpar",
    "Não, manter"
  );
  PERGUNTA_ENVIO_ABERTA = false;
  if (limpar) {
    carrinho.clear();
    atualizarContadorCarrinho();
    renderizarPainelCarrinho();
    if (COLECAO_ATUAL) renderizarGradeProdutos(PRODUTOS_POR_COLECAO.get(COLECAO_ATUAL) || []);
  }
  ENVIADO_EM = null;
  salvarCarrinho();
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") perguntarSeJaEnviou();
});

// ---------- Formatação ----------
function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  // O botão flutuante do carrinho só aparece nas telas 1 e 2; os botões de
  // exportar PDF/Imagem (que exportam o carrinho) aparecem só na tela inicial
  const btnCarrinho = document.getElementById("btn-carrinho");
  const acoesExportar = document.querySelector(".acoes-exportar");
  const telasSemCarrinho = ["tela-carrinho", "tela-pausado", "tela-nao-encontrado"];
  btnCarrinho.hidden = telasSemCarrinho.includes(idTela);
  acoesExportar.hidden = idTela !== "tela-inicial";
  window.scrollTo(0, 0);
}

// ---------- Cabeçalho: parte que é igual pra todo mundo (marca) ----------
function iniciarCabecalhoMarca() {
  document.getElementById("nome-catalogo").textContent = CONFIG.nomeCatalogo;
  document.getElementById("vendedor-slogan").textContent = CONFIG.vendedorPadrao.slogan;
  document.getElementById("vendedor-foto").src = CONFIG.vendedorPadrao.foto;
  document.getElementById("slogan-marca").textContent = CONFIG.sloganMarca;
  document.documentElement.style.setProperty("--cor-primaria", CONFIG.corPrimaria);
  document.documentElement.style.setProperty("--cor-destaque", CONFIG.corDestaque);
  document.documentElement.style.setProperty("--cor-dourada", CONFIG.corDourada);
  document.title = CONFIG.nomeCatalogo;

  const btnSolicitar = document.getElementById("btn-solicitar-catalogo");
  const texto = encodeURIComponent(PLATAFORMA.mensagemPadrao);
  btnSolicitar.href = `https://wa.me/${PLATAFORMA.whatsapp}?text=${texto}`;
}

// ---------- Cabeçalho: parte que depende do vendedor identificado ----------
function preencherCabecalhoVendedor(vendedor) {
  document.getElementById("vendedor-nome").textContent = vendedor.nome || "Vendedor";
  if (vendedor.foto_url) {
    document.getElementById("vendedor-foto").src = vendedor.foto_url;
  }
}

// ---------- Tela 1: cards de coleção ----------
function agruparPorColecao(produtos) {
  const mapa = new Map();
  produtos.forEach((p) => {
    if (!mapa.has(p.colecao)) mapa.set(p.colecao, []);
    mapa.get(p.colecao).push(p);
  });
  return mapa;
}

function renderizarCardsColecao() {
  const grade = document.getElementById("grade-colecoes");
  grade.innerHTML = "";
  const paleta = CONFIG.paletaCards;
  let i = 0;

  for (const [colecao, produtos] of PRODUTOS_POR_COLECAO) {
    const cor = paleta[i % paleta.length];
    i++;

    const card = document.createElement("button");
    card.className = "colecao-card";
    card.style.setProperty("--cor-card", cor);
    card.innerHTML = `<span class="colecao-card-nome">${colecao}</span>`;
    card.addEventListener("click", () => abrirColecao(colecao));
    grade.appendChild(card);
  }
}

// ---------- Tela 2: produtos da coleção ----------
function abrirColecao(colecao) {
  COLECAO_ATUAL = colecao;
  document.getElementById("titulo-colecao").textContent = colecao;
  renderizarGradeProdutos(PRODUTOS_POR_COLECAO.get(colecao) || []);
  mostrarTela("tela-colecao");
}

// Produtos vendidos só em caixa fechada com mais de 1 unidade (fracao > 1)
// mostram uma legenda extra com o preço da caixa, além do preço unitário em
// destaque. Quando fracao = 1 (item vendido como peça/kit único), essa
// legenda não aparece — mostrar as duas seria redundante.
function montarBlocoPreco(produto) {
  const precoUnitario = formatarPreco(Number(produto.preco_unitario));
  if (produto.fracao > 1) {
    const precoCaixa = formatarPreco(Number(produto.preco_total));
    return `
      <span class="produto-preco">${precoUnitario} cada</span>
      <span class="produto-preco-caixa">Caixa c/ ${produto.fracao} un. · ${precoCaixa}</span>
    `;
  }
  return `<span class="produto-preco">${precoUnitario} cada</span>`;
}

function criarCardProduto(produto) {
  const card = document.createElement("article");
  card.className = "produto-card";
  card.dataset.codigo = produto.codigo;

  const quantidadeAtual = carrinho.get(produto.codigo)?.quantidade || 0;
  if (quantidadeAtual > 0) card.classList.add("produto-card-selecionado");

  card.innerHTML = `
    <div class="produto-imagem-wrap">
      <img class="produto-imagem" src="${produto.imagem_url}" alt="${produto.descricao}" loading="lazy" />
    </div>
    <div class="produto-info">
      <h3 class="produto-nome">${produto.descricao}</h3>
      <p class="produto-codigos">Código: ${produto.codigo}${produto.codigo_barras ? ` | Cod.Barra: ${produto.codigo_barras}` : ""}</p>
      <div class="produto-preco-qtd">
        <div class="produto-preco-bloco">
          ${montarBlocoPreco(produto)}
        </div>
        <div class="qtd-seletor">
          <button class="qtd-btn qtd-menos" aria-label="Diminuir quantidade">−</button>
          <span class="qtd-valor">${quantidadeAtual}</span>
          <button class="qtd-btn qtd-mais" aria-label="Aumentar quantidade">+</button>
        </div>
      </div>
    </div>
  `;

  const qtdValorEl = card.querySelector(".qtd-valor");
  const sincronizarDestaque = () => {
    const qtd = carrinho.get(produto.codigo)?.quantidade || 0;
    card.classList.toggle("produto-card-selecionado", qtd > 0);
  };
  card.querySelector(".qtd-mais").addEventListener("click", () => {
    alterarQuantidade(produto, 1, qtdValorEl);
    sincronizarDestaque();
  });
  card.querySelector(".qtd-menos").addEventListener("click", () => {
    alterarQuantidade(produto, -1, qtdValorEl);
    sincronizarDestaque();
  });

  return card;
}

function renderizarGradeProdutos(produtos) {
  const grade = document.getElementById("grade-produtos");
  grade.innerHTML = "";
  const fragmento = document.createDocumentFragment();
  produtos.forEach((p) => fragmento.appendChild(criarCardProduto(p)));
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

  qtdValorEl.textContent = nova;
  atualizarContadorCarrinho();

  // Qualquer mudança no carrinho depois de um envio quer dizer que o
  // cliente continuou montando — a pergunta "já enviou?" deixa de fazer
  // sentido, então é resetada aqui antes de salvar.
  ENVIADO_EM = null;
  salvarCarrinho();
}

function atualizarContadorCarrinho() {
  let total = 0;
  carrinho.forEach((item) => (total += item.quantidade));
  document.getElementById("carrinho-contagem").textContent = total;

  // Pequeno "pulso" no botão flutuante pra dar feedback visual ao adicionar/remover
  const btnCarrinho = document.getElementById("btn-carrinho");
  btnCarrinho.classList.remove("pulso");
  void btnCarrinho.offsetWidth;
  btnCarrinho.classList.add("pulso");
}

function calcularTotalCarrinho() {
  let total = 0;
  carrinho.forEach((item) => (total += item.quantidade * Number(item.produto.preco_total)));
  return total;
}

function renderizarPainelCarrinho() {
  const lista = document.getElementById("lista-carrinho");
  lista.innerHTML = "";

  if (carrinho.size === 0) {
    lista.innerHTML = `
      <div class="carrinho-vazio">
        <span class="carrinho-vazio-icone">🛍️</span>
        <p>Seu carrinho está vazio.<br>Escolha uma coleção e adicione seus produtos!</p>
      </div>
    `;
  } else {
    carrinho.forEach(({ produto, quantidade }) => {
      const rotulo = produto.fracao > 1 ? "cx" : "un.";
      const precoPorItem = Number(produto.preco_total);
      const subtotal = quantidade * precoPorItem;
      const linha = document.createElement("div");
      linha.className = "carrinho-item";
      linha.innerHTML = `
        <div class="carrinho-item-info">
          <p class="carrinho-item-nome">${produto.descricao}</p>
          <p class="carrinho-item-codigo">Cód. ${produto.codigo} · ${produto.colecao}</p>
          <p class="carrinho-item-preco">${quantidade} ${rotulo} × ${formatarPreco(precoPorItem)} = ${formatarPreco(subtotal)}</p>
        </div>
        <div class="qtd-seletor">
          <button class="qtd-btn qtd-menos" aria-label="Diminuir quantidade">−</button>
          <span class="qtd-valor">${quantidade}</span>
          <button class="qtd-btn qtd-mais" aria-label="Aumentar quantidade">+</button>
        </div>
      `;
      const qtdValorEl = linha.querySelector(".qtd-valor");
      linha.querySelector(".qtd-mais").addEventListener("click", () => {
        alterarQuantidade(produto, 1, qtdValorEl);
        renderizarPainelCarrinho();
      });
      linha.querySelector(".qtd-menos").addEventListener("click", () => {
        alterarQuantidade(produto, -1, qtdValorEl);
        renderizarPainelCarrinho();
      });
      lista.appendChild(linha);
    });
  }

  document.getElementById("carrinho-total-valor").textContent = formatarPreco(calcularTotalCarrinho());
}

async function limparCarrinho() {
  if (carrinho.size === 0) return;
  const total = carrinho.size;
  const confirmar = await perguntar(
    `Desmarcar ${total === 1 ? "o item marcado" : `todos os ${total} itens marcados`} do carrinho?`,
    "Sim, desmarcar",
    "Cancelar"
  );
  if (!confirmar) return;
  carrinho.clear();
  atualizarContadorCarrinho();
  renderizarPainelCarrinho();
  ENVIADO_EM = null;
  salvarCarrinho();
}

function abrirCarrinho() {
  renderizarPainelCarrinho();
  mostrarTela("tela-carrinho");
}

function voltarDoCarrinho() {
  // Recarrega a grade da coleção pra refletir mudanças de quantidade feitas no carrinho
  if (COLECAO_ATUAL) {
    renderizarGradeProdutos(PRODUTOS_POR_COLECAO.get(COLECAO_ATUAL) || []);
    mostrarTela("tela-colecao", "voltar");
  } else {
    mostrarTela("tela-inicial", "voltar");
  }
}

// ---------- Envio do pedido pelo WhatsApp ----------
// Formato definido pelo Leonardo:
// 📋 Pedido Loja Nadir
// Loja: [nome da loja]
//
// • NOME DA COLEÇÃO
// Cód: XXXXXX | Qtd: N | R$XX.XX
//
// TOTAL DO PEDIDO: R$XXXX.XX
// "Qtd" aqui é número de caixas fechadas (ou de kits/peças únicas quando
// fracao = 1) — o mesmo número que aparece no carrinho, pronto pro
// Leonardo lançar direto no sistema real, sem precisar converter.
function montarTextoPedido() {
  const nomeLoja = document.getElementById("input-loja").value.trim();
  const linhas = [`📋 Pedido ${CONFIG.nomeCatalogo}`, `Loja: ${nomeLoja || "Não informada"}`, ""];

  const porColecao = new Map();
  carrinho.forEach(({ produto, quantidade }) => {
    if (!porColecao.has(produto.colecao)) porColecao.set(produto.colecao, []);
    porColecao.get(produto.colecao).push({ produto, quantidade });
  });

  for (const [colecao, itens] of porColecao) {
    linhas.push(`• ${colecao}`);
    itens.forEach(({ produto, quantidade }) => {
      const subtotal = quantidade * Number(produto.preco_total);
      linhas.push(`Cód: ${produto.codigo} | Qtd: ${quantidade} | ${formatarPreco(subtotal)}`);
    });
    linhas.push("");
  }

  linhas.push(`TOTAL DO PEDIDO: ${formatarPreco(calcularTotalCarrinho())}`);
  return linhas.join("\n");
}

function enviarPedidoWhatsapp() {
  if (carrinho.size === 0) {
    alert("Adicione pelo menos um produto antes de enviar o pedido.");
    return;
  }
  const whatsappVendedor = VENDEDOR_ATUAL?.whatsapp;
  if (!whatsappVendedor) {
    alert("Não conseguimos identificar o WhatsApp deste vendedor. Recarregue a página e tente novamente.");
    return;
  }
  const texto = encodeURIComponent(montarTextoPedido());
  const url = `https://wa.me/${whatsappVendedor}?text=${texto}`;
  ENVIADO_EM = Date.now();
  salvarCarrinho();
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

// ---------- Tela de "catálogo não encontrado" (link inválido/desconhecido) ----------
function configurarBotaoNaoEncontrado() {
  const btn = document.getElementById("btn-nao-encontrado-whatsapp");
  const texto = encodeURIComponent(
    `Olá! Abri um link de catálogo Nadir (${window.location.href}) e apareceu "não encontrado". Pode me ajudar?`
  );
  btn.href = `https://wa.me/${PLATAFORMA.whatsapp}?text=${texto}`;
}

// ---------- Boot ----------
async function iniciar() {
  iniciarCabecalhoMarca();

  const carregando = document.getElementById("carregando-app");

  // 1) Descobre QUEM é o vendedor (via ?v= ou domínio antigo)
  const vendedorId = await resolverVendedorId();
  if (!vendedorId) {
    carregando.hidden = true;
    configurarBotaoNaoEncontrado();
    mostrarTela("tela-nao-encontrado");
    return;
  }
  registrarAcesso(vendedorId);

  // 2) Busca os dados desse vendedor no Supabase
  const statusVendedor = await buscarStatusVendedor(vendedorId);
  if (!statusVendedor.encontrado) {
    carregando.hidden = true;
    configurarBotaoNaoEncontrado();
    mostrarTela("tela-nao-encontrado");
    return;
  }

  VENDEDOR_ATUAL = statusVendedor;
  preencherCabecalhoVendedor(statusVendedor);

  if (!statusVendedor.ativo) {
    carregando.hidden = true;
    configurarBotaoPausado();
    mostrarTela("tela-pausado");
    return;
  }

  const statusMsg = document.getElementById("status-msg");
  statusMsg.hidden = false;
  statusMsg.innerHTML = `<span class="spinner"></span> Carregando coleções...`;

  TODOS_PRODUTOS = await buscarProdutos(statusVendedor.area);
  PRODUTOS_POR_COLECAO = agruparPorColecao(TODOS_PRODUTOS);

  // Recupera o carrinho guardado no celular pra ESSE vendedor (se tiver).
  CHAVE_CARRINHO = `nadir-carrinho:${vendedorId}`;
  carregarCarrinhoSalvo();
  atualizarContadorCarrinho();

  statusMsg.hidden = true;
  renderizarCardsColecao();

  document.getElementById("btn-carrinho").addEventListener("click", abrirCarrinho);
  document.getElementById("btn-voltar-colecao").addEventListener("click", () => mostrarTela("tela-inicial", "voltar"));
  document.getElementById("btn-voltar-carrinho").addEventListener("click", voltarDoCarrinho);
  document.getElementById("btn-enviar-pedido").addEventListener("click", enviarPedidoWhatsapp);
  document.getElementById("btn-limpar-carrinho").addEventListener("click", limparCarrinho);

  carregando.hidden = true;
  mostrarTela("tela-inicial");

  // Se o cliente voltou pra página depois de já ter enviado um pedido
  // (ex: abriu o link de novo direto do WhatsApp), pergunta se já enviou.
  perguntarSeJaEnviou();
}

document.addEventListener("DOMContentLoaded", iniciar);
