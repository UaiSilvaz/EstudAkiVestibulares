import { runOldExamExtraction } from "../../src/lib/old-exam-extraction";

const idIndex = process.argv.indexOf("--id");
const examId = idIndex >= 0 ? process.argv[idIndex + 1] : undefined;

runOldExamExtraction({ examId })
  .then((summary) => console.log(JSON.stringify(summary, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
