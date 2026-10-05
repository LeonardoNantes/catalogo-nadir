// ============================================================
// PRÉ-VISUALIZAÇÃO PERSONALIZADA DO LINK (Open Graph) — Nadir
// ============================================================
// O WhatsApp (e similares) não executa o JavaScript da página pra montar
// o card de pré-visualização — ele só lê o HTML puro que o servidor
// devolve, na hora que alguém cola o link. Por isso essa função roda no
// servidor (Vercel), ANTES do navegador, descobre quem é o vendedor
// desse link (mesmo critério já usado no catálogo: primeiro ?v=slug na
// URL, senão o domínio antigo pela tabela dominios_antigos) e devolve o
// HTML de catalogo-base.html já com o nome certo no lugar do marcador
// __OG_TITLE__.
//
// Se der qualquer erro (Supabase fora do ar, vendedor não encontrado,
// etc), devolve o HTML com um título genérico — nunca trava nem quebra
// o catálogo pro cliente, só fica sem o nome personalizado naquele
// acesso específico.

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://eubbzefshftafjjcirna.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GZ-duizLJSQSVcdYejzWGQ_wdNUu8vA";

function headerSupabase() {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
}

// Mesma lógica de resolverVendedorId() do supabase-client.js: primeiro o
// parâmetro ?v=slug, senão consulta "dominios_antigos" pelo domínio usado.
async function resolverSlug(req) {
  const vParam = req.query && req.query.v;
  if (vParam) return String(vParam).trim();

  const dominio = req.headers && req.headers.host;
  if (!dominio) return null;

  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/dominios_antigos?dominio=eq.${encodeURIComponent(dominio)}&select=slug`,
    { headers: headerSupabase() }
  );
  if (!resp.ok) return null;
  const linhas = await resp.json();
  return linhas && linhas[0] ? linhas[0].slug : null;
}

// Busca só o nome na tabela "vendedores" (mesma tabela/coluna de
// buscarStatusVendedor() em supabase-client.js).
async function buscarNomeVendedor(slug) {
  if (!slug) return null;
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/vendedores?slug=eq.${encodeURIComponent(slug)}&select=nome`,
    { headers: headerSupabase() }
  );
  if (!resp.ok) return null;
  const linhas = await resp.json();
  return linhas && linhas[0] ? linhas[0].nome : null;
}

module.exports = async (req, res) => {
  const htmlPath = path.join(process.cwd(), "catalogo-base.html");
  let html;
  try {
    html = fs.readFileSync(htmlPath, "utf8");
  } catch (erro) {
    console.error("[OG Nadir] Não encontrei catalogo-base.html:", erro);
    res.status(500).send("Erro ao carregar o catálogo.");
    return;
  }

  let titulo = "Catálogo Nadir";
  try {
    const slug = await resolverSlug(req);
    const nome = await buscarNomeVendedor(slug);
    if (nome) titulo = `Catálogo Nadir - ${nome}`;
  } catch (erro) {
    // Qualquer erro aqui (Supabase fora do ar, etc) não trava o acesso —
    // segue com o título genérico.
    console.error("[OG Nadir] Erro ao identificar o vendedor:", erro);
  }

  const htmlFinal = html.split("__OG_TITLE__").join(titulo);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(htmlFinal);
};
