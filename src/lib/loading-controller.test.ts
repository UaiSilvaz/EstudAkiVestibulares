import assert from "node:assert/strict";
import { test } from "node:test";
import { createLoadingController, LOADING_TIMING as timing } from "./loading-controller";
import { routeLoadingMeta } from "./route-loading";

test("a ready document never shows a timed intro", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = createLoadingController();
  assert.equal(controller.getServerSnapshot().phase, "hidden");
  t.mock.timers.tick(30000);
  assert.equal(controller.getSnapshot().phase, "hidden");
});

test("slow navigation stays visible until all nested boundaries finish", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = createLoadingController();
  const navigationDone = controller.begin(routeLoadingMeta("/redacao"), 2);
  t.mock.timers.tick(timing.delay);
  const contentDone = controller.begin(routeLoadingMeta("/dashboard"));
  assert.equal(controller.getSnapshot().meta.label, routeLoadingMeta("/redacao").label);
  navigationDone();
  t.mock.timers.tick(60000);
  assert.equal(controller.getSnapshot().phase, "visible");
  contentDone();
  assert.equal(controller.getSnapshot().phase, "leaving");
  t.mock.timers.tick(timing.exit - 1);
  assert.equal(controller.getSnapshot().phase, "leaving");
  t.mock.timers.tick(1);
  assert.equal(controller.getSnapshot().phase, "hidden");
});

test("fast or cancelled navigation never flashes a screen", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = createLoadingController();
  const finish = controller.begin(routeLoadingMeta("/login"));
  t.mock.timers.tick(timing.delay - 1);
  finish();
  t.mock.timers.tick(30000);
  assert.equal(controller.getSnapshot().phase, "hidden");
  assert.equal(controller.getSnapshot().cycle, 0);
});

test("new work during exit cancels the fade without restarting the logo", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = createLoadingController();
  const finish = controller.begin(routeLoadingMeta("/redacao"), 2);
  t.mock.timers.tick(timing.delay);
  finish();
  t.mock.timers.tick(100);
  const finishNext = controller.begin(routeLoadingMeta("/simulados"), 2);
  t.mock.timers.tick(timing.exit);
  assert.equal(controller.getSnapshot().phase, "visible");
  assert.equal(controller.getSnapshot().cycle, 1);
  assert.equal(controller.getSnapshot().meta.label, "Abrindo Simulados");
  finishNext();
  t.mock.timers.tick(timing.exit);
  assert.equal(controller.getSnapshot().phase, "hidden");
});

test("finished navigation allows another independent loading cycle", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = createLoadingController();
  for (let cycle = 1; cycle <= 2; cycle++) {
    const finish = controller.begin(routeLoadingMeta("/flashcards"));
    t.mock.timers.tick(timing.delay);
    assert.equal(controller.getSnapshot().cycle, cycle);
    finish(); finish();
    t.mock.timers.tick(timing.exit);
    assert.equal(controller.getSnapshot().phase, "hidden");
  }
});

test("Strict Mode cleanup removes timers and ignores stale releases", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = createLoadingController();
  const staleRelease = controller.begin(routeLoadingMeta("/dashboard"));
  controller.dispose();
  const finish = controller.begin(routeLoadingMeta("/simulados"), 2);
  staleRelease();
  t.mock.timers.tick(timing.delay);
  assert.equal(controller.getSnapshot().phase, "visible");
  finish(); controller.dispose();
  t.mock.timers.tick(30000);
  assert.equal(controller.getSnapshot().phase, "hidden");
});

test("route labels support nested URLs and signup", () => {
  assert.deepEqual(routeLoadingMeta("http://localhost:3000/cursos/algebra/aula/123?from=home"), routeLoadingMeta("/cursos"));
  assert.deepEqual(routeLoadingMeta("/cronograma"), routeLoadingMeta("/meu-plano"));
  assert.notEqual(routeLoadingMeta("/login").label, routeLoadingMeta("/login?signup=true").label);
});
