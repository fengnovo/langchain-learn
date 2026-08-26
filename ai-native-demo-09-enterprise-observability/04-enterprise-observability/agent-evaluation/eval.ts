/**
 * Agent质量评分Demo
 */
const evaluation={
 faithfulness:0.95,
 relevance:0.9,
 toolAccuracy:0.98,
 userScore:0.88
};
const score=
(
 evaluation.faithfulness+
 evaluation.relevance+
 evaluation.toolAccuracy+
 evaluation.userScore
)/4;
console.log(
 "Agent Quality Score:",
 score
);
