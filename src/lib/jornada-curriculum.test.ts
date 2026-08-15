import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  courseActivityCount,
  courseLessonCount,
  getJornadaActivity,
  getJornadaCourse,
  jornadaActivities,
  jornadaCourses,
  jornadaSources,
} from "@/lib/jornada-curriculum";
import { jornadaSubjects } from "@/lib/jornada-subjects";

describe("jornada curriculum", () => {
  it("registers all required EstudAki subject icons", () => {
    assert.equal(jornadaSubjects.length, 7);
    for (const subject of jornadaSubjects) {
      assert.match(subject.icon, /^\/assets\/jornada-icons\/.+-compact\.png$/);
      assert.ok(subject.primaryColor);
      assert.ok(subject.secondaryColor);
    }
  });

  it("keeps the fractions pilot complete and navigable", () => {
    const course = getJornadaCourse("matematica", "matematica-basica", "fracoes-e-decimais");
    assert.ok(course);
    assert.equal(courseLessonCount(course), 6);
    assert.equal(courseActivityCount(course), 6);
    assert.equal(course.status, "available");
  });

  it("links every pilot lesson to an existing activity and source", () => {
    const sourceIds = new Set(jornadaSources.map((source) => source.id));
    const activityIds = new Set(jornadaActivities.map((activity) => activity.id));

    for (const course of jornadaCourses) {
      for (const courseModule of course.modules) {
        for (const lesson of courseModule.lessons) {
          assert.ok(activityIds.has(lesson.activityId), `${lesson.slug} sem atividade valida`);
          for (const sourceId of lesson.sourceIds) {
            assert.ok(sourceIds.has(sourceId), `${lesson.slug} com fonte inexistente ${sourceId}`);
          }
        }
      }
    }
  });

  it("resolves activity slugs to their lesson bundle", () => {
    const bundle = getJornadaActivity("atividade-operacoes-fracoes");
    assert.ok(bundle);
    assert.equal(bundle.activity.answer, "C");
    assert.equal(bundle.lesson.slug, "operacoes-com-fracoes");
    assert.equal(bundle.subject.slug, "matematica");
  });
});
