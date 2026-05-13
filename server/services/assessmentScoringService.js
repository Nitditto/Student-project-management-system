/**
 * Service to handle calculations for CLO assessments.
 */

/**
 * Calculates the aggregated CLO score for a specific milestone.
 * 
 * @param {Array} submissions - Array of assessor submissions for the milestone
 * @returns {Map} aggregatedScores - Map of cloCode to average score (1-5)
 */
export const aggregateMilestoneCloScores = (submissions) => {
  const cloTotals = {};
  const cloCounts = {};

  submissions.forEach((submission) => {
    // For M5, different roles might have different weights, but the standard CLO aggregation
    // often uses simple averages per CLO. If roles need distinct weights, apply them here.
    submission.cloEntries.forEach((entry) => {
      if (!cloTotals[entry.cloCode]) {
        cloTotals[entry.cloCode] = 0;
        cloCounts[entry.cloCode] = 0;
      }
      cloTotals[entry.cloCode] += entry.score1to5;
      cloCounts[entry.cloCode] += 1;
    });
  });

  const aggregated = new Map();
  Object.keys(cloTotals).forEach((cloCode) => {
    aggregated.set(cloCode, cloTotals[cloCode] / cloCounts[cloCode]);
  });

  return aggregated;
};

/**
 * Converts a 1-5 scale to a 1-10 scale
 */
export const scale5To10 = (score5) => {
  if (score5 === null || score5 === undefined) return null;
  // 1 = 0.0, 2 = 2.5, 3 = 5.0, 4 = 7.5, 5 = 10.0
  // Or simply score * 2 depending on the academic rule. We use score * 2 here.
  return score5 * 2;
};

/**
 * Calculates the final CLO score across all milestones based on the matrix weights.
 * 
 * @param {Array} milestones - Array of milestone results
 * @param {Array} cloMatrix - Matrix defining CLO weights per milestone
 * @returns {Array} finalCloResults - Array of { cloCode, score, status }
 */
export const calculateFinalCloScores = (milestones, cloMatrix, minCloScore = 3.0) => {
  const cloResults = [];

  cloMatrix.forEach((cloDef) => {
    let totalScore = 0;
    let totalWeightApplied = 0;

    cloDef.weights.forEach((weightDef) => {
      const milestone = milestones.find((m) => m.code === weightDef.milestoneCode);
      if (milestone && milestone.aggregatedCloScores && milestone.aggregatedCloScores.has(cloDef.cloCode)) {
        const milestoneScore = milestone.aggregatedCloScores.get(cloDef.cloCode);
        totalScore += milestoneScore * (weightDef.percentage / 100);
        totalWeightApplied += weightDef.percentage;
      }
    });

    // If a CLO hasn't been fully evaluated yet, we could either normalize it or wait.
    // For now, we normalize it to the weight applied so far if in progress.
    const normalizedScore = totalWeightApplied > 0 ? (totalScore / (totalWeightApplied / 100)) : 0;
    
    cloResults.push({
      cloCode: cloDef.cloCode,
      score: Number(normalizedScore.toFixed(2)),
      status: normalizedScore >= minCloScore ? "achieved" : "not_achieved"
    });
  });

  return cloResults;
};

/**
 * Calculates the overall 10-point scale project score based on milestone components.
 * 
 * @param {Array} milestones - Array of milestone results
 * @returns {Number} teamFinalScore
 */
export const calculateTeamFinalScore = (milestones) => {
  let finalScore = 0;
  let totalWeight = 0;

  milestones.forEach((milestone) => {
    if (milestone.componentScore10 !== null && milestone.componentScore10 !== undefined) {
      finalScore += milestone.componentScore10 * (milestone.weight / 100);
      totalWeight += milestone.weight;
    }
  });

  // Normalize if not all milestones are done
  if (totalWeight === 0) return null;
  return Number((finalScore / (totalWeight / 100)).toFixed(2));
};

/**
 * Evaluates the final pass status based on overall score and individual CLO statuses.
 */
export const evaluatePassStatus = (finalScore, cloResults, minFinalScore = 5.0) => {
  if (finalScore === null || finalScore < minFinalScore) {
    return false;
  }
  
  // All CLOs must be achieved
  const hasFailedClo = cloResults.some(c => c.status === "not_achieved");
  if (hasFailedClo) {
    return false;
  }

  return true;
};
