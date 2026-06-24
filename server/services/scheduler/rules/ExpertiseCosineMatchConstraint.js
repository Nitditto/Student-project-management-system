import { BaseConstraint } from "./BaseConstraint.js";

// Calculates dot product (which equals Cosine Similarity if vectors are L2-normalized)
const dotProduct = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  return vecA.reduce((sum, val, idx) => sum + val * vecB[idx], 0);
};

/**
 * Soft Constraint: Evaluates how well the expertise of the council teachers matches 
 * the project proposal topic, using vector embedding cosine similarity or keyword fallback.
 */
export class ExpertiseCosineMatchConstraint extends BaseConstraint {
  constructor(weight = 5.0) {
    super("ExpertiseCosineMatch", weight, false); // Soft constraint
  }

  evaluate(assignment, context) {
    const project = assignment.project;
    if (!project) return 1.0;

    const projectEmbedding = project.embedding;

    // Collect all teachers
    const teachers = (assignment.councilMembers || []).map(m => m.teacher || m);
    if (assignment.reviewer) {
      teachers.push(assignment.reviewer);
    }

    if (teachers.length === 0) return 0.5;

    let totalScore = 0;
    let matchedCount = 0;

    const teacherMap = context.teacherMap || new Map();

    for (const teacher of teachers) {
      const teacherIdStr = teacher.toString();
      const teacherObj = teacherMap.get(teacherIdStr);

      if (!teacherObj) continue;

      let similarity = 0;

      // 1. Try vector embeddings
      if (
        projectEmbedding && 
        projectEmbedding.length > 0 && 
        teacherObj.embedding && 
        teacherObj.embedding.length > 0
      ) {
        const score = dotProduct(projectEmbedding, teacherObj.embedding);
        // Map score from [-1..1] range to [0..1]
        similarity = (score + 1) / 2;
      } else {
        // 2. Fallback: Keyword keyword overlap
        const textToMatch = `${project.title} ${project.description}`.toLowerCase();
        const experties = teacherObj.experties || [];

        if (experties.length > 0) {
          let matches = 0;
          experties.forEach(tag => {
            if (textToMatch.includes(tag.toLowerCase())) {
              matches += 1;
            }
          });
          similarity = matches / experties.length;
        } else {
          similarity = 0.3; // Low baseline similarity if no expertise profile exists
        }
      }

      totalScore += similarity;
      matchedCount += 1;
    }

    return matchedCount > 0 ? totalScore / matchedCount : 0.5;
  }
}
