import assert from "node:assert/strict";
import { validateArtifacts } from "./index.js";
const result = validateArtifacts([
  { role: "frontend", title: "FE", content: "React TypeScript page" },
  { role: "backend", title: "BE", content: "Node service" },
  { role: "qa", title: "QA", content: "unit test" }
]);
assert.equal(result.passed, true);
console.log("harness test passed");
