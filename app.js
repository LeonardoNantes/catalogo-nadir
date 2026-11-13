// ============================================================
// LÓGICA DO CATÁLOGO — versão do site COMPARTILHADO (tela do catálogo com
// abas de coleção + tela do carrinho e WhatsApp) — reconhece o vendedor por
// ?v= ou domínio antigo
// ============================================================

// codigo -> { produto, quantidade }
// "quantidade" aqui é número de CAIXAS FECHADAS (ou de kits/peças únicas
// quando fracao = 1) — não número de peças individuais. Cada clique no
// +/- soma ou tira 1 caixa. O preço usado nas contas é sempre o
// preco_total (preço da caixa já pronto na planilha), pra bater
// exatamente com o valor que o Leonardo lança no sistema real dele.
const carrinho = new Map();
let TODOS_PRODUTOS = [];
let PRODUTOS_POR_COLECAO = new Map(); // colecao -> [produtos] (na ordem da planilha)
let VENDEDOR_ATUAL = null; // { nome, whatsapp, foto_url, area, ... } do vendedor resolvido nesse acesso

// ---------- Estado da tela do catálogo (abas) ----------
// Antes eram 2 telas (cards de coleção → grade da coleção); agora é uma tela
// só, com uma aba por coleção no topo — igual ao Ofertas da Semana.
let COLECOES = []; // nomes das coleções, em ordem alfabética (pedido do Leonardo)
let ABA_ATIVA = null; // coleção da aba aberta
let BUSCA = ""; // texto da busca já normalizado ("" = sem busca)
let ORDENACAO = "padrao"; // "padrao" (ordem da planilha) | "menor" | "maior" preço
let POSICAO_ROLAGEM = 0; // onde a lista estava ao abrir o carrinho, pra voltar no mesmo ponto

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
    atualizarBarraCarrinho();
    renderizarPainelCarrinho();
    renderizarLista();
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
  // A barra fixa "Ir para o carrinho" só aparece na tela do catálogo
  // (os botões Buscar/PDF/Imagem já ficam dentro do cabeçalho dela).
  document.getElementById("barra-ir-carrinho").hidden = idTela !== "tela-inicial";
  document.getElementById("menu-ordenar").hidden = true;
  window.scrollTo(0, 0);
}

// ---------- Cabeçalho: parte que é igual pra todo mundo (marca) ----------
function iniciarCabecalhoMarca() {
  document.getElementById("nome-catalogo").textContent = CONFIG.nomeCatalogo;
  document.getElementById("vendedor-slogan").textContent = CONFIG.vendedorPadrao.slogan;
  document.getElementById("vendedor-foto").src = CONFIG.vendedorPadrao.foto;
  document.documentElement.style.setProperty("--cor-primaria", CONFIG.corPrimaria);
  document.documentElement.style.setProperty("--cor-destaque", CONFIG.corDestaque);
  document.documentElement.style.setProperty("--cor-dourada", CONFIG.corDourada);
  document.title = CONFIG.nomeCatalogo;
  // (O slogan da marca e o "Solicitar Catálogo" saíram da tela junto com a
  // antiga tela de cards de coleção — decisão do Leonardo, 13/11/2026.)
}

// ---------- Cabeçalho: parte que depende do vendedor identificado ----------
function preencherCabecalhoVendedor(vendedor) {
  document.getElementById("vendedor-nome").textContent = vendedor.nome || "Vendedor";
  if (vendedor.foto_url) {
    document.getElementById("vendedor-foto").src = vendedor.foto_url;
  }
}

// ---------- Tela do catálogo: abas de coleção ----------
function agruparPorColecao(produtos) {
  const mapa = new Map();
  produtos.forEach((p) => {
    if (!mapa.has(p.colecao)) mapa.set(p.colecao, []);
    mapa.get(p.colecao).push(p);
  });
  return mapa;
}

// Uma aba por coleção, em ordem alfabética (só coleções que têm produto
// ativo aparecem, porque a lista vem dos próprios produtos carregados).
// Os produtos DENTRO de cada aba continuam na ordem da planilha (coluna
// "ordem") — essa é a ordem "Padrão" do botão de ordenar.
function renderizarAbas() {
  const nav = document.getElementById("categoria-tabs");
  nav.innerHTML = "";
  COLECOES.forEach((colecao) => {
    const aba = document.createElement("button");
    aba.type = "button";
    aba.className = "categoria-tab" + (colecao === ABA_ATIVA ? " ativa" : "");
    aba.textContent = colecao;
    aba.addEventListener("click", () => trocarAba(colecao));
    nav.appendChild(aba);
  });
  centralizarAbaAtiva(nav);
}

// A aba escolhida desliza sempre pro meio da barra, pra dar pra ver as
// abas de trás e as da frente conforme o cliente vai tocando.
function centralizarAbaAtiva(nav) {
  const ativa = nav.querySelector(".categoria-tab.ativa");
  if (!ativa) return;
  const alvo = ativa.offsetLeft - (nav.clientWidth - ativa.clientWidth) / 2;
  nav.scrollTo({ left: Math.max(0, alvo), behavior: "smooth" });
}

function trocarAba(colecao) {
  ABA_ATIVA = colecao;
  if (document.getElementById("barra-busca").classList.contains("aberta")) fecharBusca(false);
  // A ordenação por preço vale só pra aba em que foi escolhida: trocou de
  // aba, volta pro padrão (pedido do Leonardo).
  ORDENACAO = "padrao";
  atualizarMenuOrdenar();
  renderizarAbas();
  renderizarLista();
  window.scrollTo(0, 0);
}

// ---------- Busca (lupa) — procura em todas as coleções ----------
// Ignora acento e maiúscula/minúscula; com várias palavras, o produto
// precisa ter todas (em qualquer ordem) na descrição, código ou cód. de barras.
function normalizarBusca(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

function produtoBateComBusca(produto) {
  const alvo = normalizarBusca(`${produto.descricao} ${produto.codigo} ${produto.codigo_barras || ""}`);
  return BUSCA.split(/\s+/).every((palavra) => alvo.includes(palavra));
}

function abrirBusca() {
  document.getElementById("barra-busca").classList.add("aberta");
  document.getElementById("btn-busca").classList.add("ativo");
  document.getElementById("campo-busca").focus();
}

function fecharBusca(redesenhar = true) {
  document.getElementById("barra-busca").classList.remove("aberta");
  document.getElementById("btn-busca").classList.remove("ativo");
  document.getElementById("campo-busca").value = "";
  document.getElementById("categoria-tabs").classList.remove("em-busca");
  BUSCA = "";
  if (redesenhar) renderizarLista();
}

// ---------- Ordenar por preço ----------
function atualizarMenuOrdenar() {
  document.getElementById("btn-ordenar").classList.toggle("ativo", ORDENACAO !== "padrao");
  document.querySelectorAll("#menu-ordenar button").forEach((btn) => {
    btn.classList.toggle("selecionada", btn.dataset.ordenacao === ORDENACAO);
  });
}

// ---------- Lista de produtos da aba aberta (ou do resultado da busca) ----------
function produtosVisiveis() {
  const lista = BUSCA
    ? TODOS_PRODUTOS.filter(produtoBateComBusca)
    : [...(PRODUTOS_POR_COLECAO.get(ABA_ATIVA) || [])];
  if (ORDENACAO === "menor") lista.sort((a, b) => Number(a.preco_unitario) - Number(b.preco_unitario));
  else if (ORDENACAO === "maior") lista.sort((a, b) => Number(b.preco_unitario) - Number(a.preco_unitario));
  return lista;
}

function renderizarLista() {
  const produtos = produtosVisiveis();
  const resumo = document.getElementById("busca-resumo");
  if (BUSCA) {
    resumo.hidden = false;
    resumo.textContent = `${produtos.length} ${produtos.length === 1 ? "produto encontrado" : "produtos encontrados"} em todas as coleções`;
  } else {
    resumo.hidden = true;
  }

  if (produtos.length === 0) {
    const grade = document.getElementById("grade-produtos");
    grade.innerHTML = `<p class="sem-itens">${BUSCA ? "Nenhum produto encontrado." : "Nenhum produto disponível no momento."}</p>`;
    return;
  }
  renderizarGradeProdutos(produtos);
}

// ---------- Foto ampliada (toque na foto do produto) ----------
function abrirFotoAmpliada(url) {
  document.getElementById("foto-zoom-img").src = url;
  document.getElementById("foto-zoom-fundo").hidden = false;
}

function fecharFotoAmpliada() {
  document.getElementById("foto-zoom-fundo").hidden = true;
  document.getElementById("foto-zoom-img").removeAttribute("src");
}

// Liga os botões da tela do catálogo (abas, busca, ordenar, carrinho, zoom).
function configurarTelaCatalogo() {
  document.getElementById("btn-busca").addEventListener("click", () => {
    document.getElementById("barra-busca").classList.contains("aberta") ? fecharBusca() : abrirBusca();
  });
  document.getElementById("btn-fechar-busca").addEventListener("click", () => fecharBusca());
  document.getElementById("campo-busca").addEventListener("input", (e) => {
    BUSCA = normalizarBusca(e.target.value);
    document.getElementById("categoria-tabs").classList.toggle("em-busca", !!BUSCA);
    renderizarLista();
    window.scrollTo(0, 0);
  });

  const menuOrdenar = document.getElementById("menu-ordenar");
  document.getElementById("btn-ordenar").addEventListener("click", (e) => {
    e.stopPropagation();
    menuOrdenar.hidden = !menuOrdenar.hidden;
  });
  menuOrdenar.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      ORDENACAO = btn.dataset.ordenacao;
      atualizarMenuOrdenar();
      menuOrdenar.hidden = true;
      renderizarLista();
      window.scrollTo(0, 0);
    });
  });
  // Com o menu aberto, tocar fora dele SÓ fecha o menu — o toque não passa
  // pro que estiver embaixo (senão o cliente poderia, sem querer, somar uma
  // caixa num "+" ou abrir uma foto só tentando fechar o menu).
  document.addEventListener("click", (e) => {
    if (!menuOrdenar.hidden && !menuOrdenar.contains(e.target)) {
      menuOrdenar.hidden = true;
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
  atualizarMenuOrdenar();

  document.getElementById("btn-ir-carrinho").addEventListener("click", abrirCarrinho);

  document.getElementById("foto-zoom-fundo").addEventListener("click", (e) => {
    if (e.target.id === "foto-zoom-fundo" || e.target.id === "foto-zoom-fechar") fecharFotoAmpliada();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("foto-zoom-fundo").hidden) fecharFotoAmpliada();
  });
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
    <div class="produto-imagem-wrap" title="Toque pra ampliar a foto">
      <img class="produto-imagem" src="${produto.imagem_url}" alt="${produto.descricao}" loading="lazy" />
    </div>
    <div class="produto-info">
      <h3 class="produto-nome">${produto.descricao}</h3>
      <p class="produto-codigos">Cód: ${produto.codigo}${produto.codigo_barras ? ` | Cod.Barra: ${produto.codigo_barras}` : ""}</p>
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
  card.querySelector(".produto-imagem-wrap").addEventListener("click", () => abrirFotoAmpliada(produto.imagem_url));

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
  atualizarBarraCarrinho();

  // Qualquer mudança no carrinho depois de um envio quer dizer que o
  // cliente continuou montando — a pergunta "já enviou?" deixa de fazer
  // sentido, então é resetada aqui antes de salvar.
  ENVIADO_EM = null;
  salvarCarrinho();
}

// Barra fixa de baixo: "Ir para o carrinho (N itens)", ou desabilitada
// quando nada foi marcado. N = total de caixas marcadas (mesmo número que
// o antigo contador do botão flutuante mostrava).
function atualizarBarraCarrinho() {
  let total = 0;
  carrinho.forEach((item) => (total += item.quantidade));
  const btn = document.getElementById("btn-ir-carrinho");
  btn.disabled = total === 0;
  btn.textContent = total === 0
    ? "Nenhum item selecionado"
    : `Ir para o carrinho (${total} ${total === 1 ? "item" : "itens"})`;
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
  atualizarBarraCarrinho();
  renderizarPainelCarrinho();
  ENVIADO_EM = null;
  salvarCarrinho();
}

function abrirCarrinho() {
  POSICAO_ROLAGEM = window.scrollY;
  renderizarPainelCarrinho();
  mostrarTela("tela-carrinho");
}

function voltarDoCarrinho() {
  // Redesenha a lista pra refletir mudanças de quantidade feitas no
  // carrinho, e volta pro mesmo ponto da lista onde o cliente estava.
  renderizarLista();
  mostrarTela("tela-inicial", "voltar");
  window.scrollTo(0, POSICAO_ROLAGEM);
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
  COLECOES = [...PRODUTOS_POR_COLECAO.keys()].sort((a, b) =>
    String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" })
  );
  ABA_ATIVA = COLECOES[0] || null;

  // Recupera o carrinho guardado no celular pra ESSE vendedor (se tiver).
  CHAVE_CARRINHO = `nadir-carrinho:${vendedorId}`;
  carregarCarrinhoSalvo();
  atualizarBarraCarrinho();

  statusMsg.hidden = true;
  configurarTelaCatalogo();
  renderizarLista();

  document.getElementById("btn-voltar-carrinho").addEventListener("click", voltarDoCarrinho);
  document.getElementById("btn-enviar-pedido").addEventListener("click", enviarPedidoWhatsapp);
  document.getElementById("btn-limpar-carrinho").addEventListener("click", limparCarrinho);

  carregando.hidden = true;
  mostrarTela("tela-inicial");
  // As abas são desenhadas depois que a tela aparece, pra conseguir medir a
  // largura delas e centralizar a aba ativa.
  renderizarAbas();

  // Se o cliente voltou pra página depois de já ter enviado um pedido
  // (ex: abriu o link de novo direto do WhatsApp), pergunta se já enviou.
  perguntarSeJaEnviou();
}

document.addEventListener("DOMContentLoaded", iniciar);
