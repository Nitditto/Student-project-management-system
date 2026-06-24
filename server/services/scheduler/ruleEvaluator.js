/**
 * Rule Evaluator Pipeline.
 * Evaluates a candidate schedule solution against all registered constraint specifications.
 */
export class RuleEvaluator {
  /**
   * @param {BaseConstraint[]} rules - Array of constraint specifications.
   */
  constructor(rules = []) {
    this.rules = rules;
  }

  /**
   * Evaluates the total fitness score of a candidate schedule.
   * @param {Array<{project, councilMembers, reviewer, room, timeSlot}>} schedule - Candidate solution assignments.
   * @param {Object} context - Shared context data (e.g. teacherMap, studentMap, etc.)
   * @returns {number} Aggregate score, or -Infinity if any hard constraint is violated.
   */
  evaluate(schedule, context = {}) {
    let totalScore = 0;

    // Inject all assignments into context to allow other rules (like double-booking checks)
    // to search through all assignments.
    context.allAssignments = schedule;

    for (const assignment of schedule) {
      for (const rule of this.rules) {
        try {
          const ruleScore = rule.evaluate(assignment, context);

          // If a hard constraint is fully violated (score is 0), veto the schedule immediately.
          if (rule.isHard && ruleScore === 0.0) {
            return -Infinity;
          }

          // Accumulate weighted score for soft constraints
          if (!rule.isHard) {
            totalScore += ruleScore * rule.weight;
          }
        } catch (error) {
          console.error(`Error executing rule ${rule.name}:`, error.message);
          return -Infinity; // Treat rule exceptions as fatal schedule failures
        }
      }
    }

    return totalScore;
  }
}
