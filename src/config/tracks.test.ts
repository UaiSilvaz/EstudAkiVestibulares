import assert from "node:assert/strict";
import test from "node:test";
import { trackForPreparation, trackIds, trackStyle } from "./tracks";

test("ENEM is distinct from vestibulares without replacing specialized preparations", () => {
  assert.equal(trackForPreparation({ vertical: { slug: "vestibular" }, examSlug: "enem" }), "enem");
  assert.equal(trackForPreparation({ vertical: { slug: "vestibular" }, examSlug: "fuvest" }), "vestibulares");
  assert.equal(trackForPreparation({ vertical: { slug: "medicina" }, examSlug: "enem" }), "medicina");
  assert.equal(trackForPreparation(null), "vestibulares");
});

test("saved police and legacy preparations retain a supported visual identity", () => {
  for (const slug of ["policial", "policia-civil", "policia-militar", "militares", "militar"]) {
    assert.equal(trackForPreparation({ vertical: { slug }, examSlug: null }), "policia");
  }
});

test("all tracks have light/dark tokens while button contrast stays stable", () => {
  for (const track of trackIds) {
    const light = trackStyle(track) as Record<string, string>;
    const dark = trackStyle(track, true) as Record<string, string>;
    assert.notEqual(light["--text"], dark["--text"]);
    assert.notEqual(light["--brand"], dark["--brand"]);
    assert.equal(light["--brand-button"], dark["--brand-button"]);
    assert.equal(light["--theme-primary"], light["--brand"]);
  }
});
