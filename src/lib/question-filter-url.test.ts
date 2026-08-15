import assert from "node:assert/strict";
import test from "node:test";
import {
  clearQuestionFilterParams,
  questionBankHref,
  setQuestionFilterParam,
} from "./question-filter-url";

test("atualiza o filtro na URL, preserva a sessão e reinicia a paginação", () => {
  const current = new URLSearchParams(
    "vestibular=enem&session=1&count=20&subject=matematica&topic=geometria&page=4",
  );
  const next = setQuestionFilterParam(current, "year", "2022");

  assert.equal(next.get("vestibular"), "enem");
  assert.equal(next.get("session"), "1");
  assert.equal(next.get("count"), "20");
  assert.equal(next.get("year"), "2022");
  assert.equal(next.get("page"), "1");
});

test("trocar a matéria remove conteúdo incompatível da URL", () => {
  const current = new URLSearchParams(
    "subject=historia&topic=brasil-colonia&content=brasil-colonia&page=3",
  );
  const next = setQuestionFilterParam(current, "subject", "geografia");

  assert.equal(next.get("subject"), "geografia");
  assert.equal(next.has("topic"), false);
  assert.equal(next.has("content"), false);
  assert.equal(next.get("page"), "1");
});

test("limpar filtros mantém somente o contexto da lista", () => {
  const current = new URLSearchParams(
    "vestibular=enem&session=1&count=30&year=2022&day=2%C2%BA+dia&area=CN&q=energia&page=2",
  );
  const next = clearQuestionFilterParams(current);

  assert.deepEqual(Object.fromEntries(next), {
    vestibular: "enem",
    session: "1",
    count: "30",
  });
  assert.equal(questionBankHref(next), "/questions?vestibular=enem&session=1&count=30");
  assert.equal(questionBankHref(new URLSearchParams()), "/questions");
});
