import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('styles.css', import.meta.url), 'utf8');

test('seção semântica, aviso fictício e contato', () => {
  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /<section\s+id="servicos"\s+aria-labelledby="titulo-servicos">/);
  assert.match(html, /<h2 id="titulo-servicos">Serviços<\/h2>/);
  assert.ok(html.includes('Negócio fictício — demonstração'));
  assert.match(html, /<a href="#contato">Ver contato<\/a>/);
  assert.match(html, /id="contato"[^>]*>[\s\S]*?Contato demonstrativo/);
  assert.doesNotMatch(html + css, /https?:\/\/|(?:src|href)=["']\/\//i);
});

test('três serviços com preços e descrições no HTML', () => {
  const artigos = [...html.matchAll(/<article class="servico">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
  assert.equal(artigos.length, 3);
  for (const [i, [nome, preco]] of [['Revisão essencial', '90'], ['Ajuste de freios', '45'], ['Troca de pneus', '60']].entries()) {
    assert.ok(artigos[i].includes(`<h3>${nome}</h3>`));
    assert.ok(artigos[i].includes(`R$ ${preco}`));
    assert.match(artigos[i], /<p>[^<]{15,}<\/p>/);
  }
});

test('grid em uma e três colunas e foco visível', () => {
  assert.match(css, /\.servicos-lista\s*\{[^}]*display:\s*grid\s*;[^}]*grid-template-columns:\s*1fr\s*;/);
  assert.match(css, /@media\s*\(min-width:\s*800px\)\s*\{\s*\.servicos-lista\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*[^;]+;/);
});

test('entrada curta e exceção de movimento reduzido', () => {
  assert.match(css, /\.servico\s*\{[^}]*animation:\s*entrada 600ms ease-out both\s*;/);
  assert.match(css, /@keyframes\s+entrada\s*\{/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.servico\s*\{\s*animation:\s*none\s*;/);
});
