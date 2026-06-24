/**
 * Strategy Pattern Interface for Scheduling Solvers.
 * Concrete solvers (e.g. GeneticAlgorithmSolver) must implement this strategy.
 */
export class ISchedulerSolver {
  /**
   * Executes the solving algorithm to find the optimal schedule.
   * @param {Object} data - Standardized input data.
   * @param {Array<Object>} data.projects - List of projects to schedule.
   * @param {Array<Object>} data.teachers - List of eligible teachers.
   * @param {Array<string>} data.rooms - List of classrooms.
   * @param {Array<Object>} data.timeSlots - List of available date-time slots.
   * @param {RuleEvaluator} evaluator - Pluggable evaluator pipeline.
   * @param {Object} config - Solver tuning parameters (e.g. iterations).
   * @returns {Promise<{schedule: Array<Object>, fitnessScore: number}>} Optimal schedule.
   */
  async solve(data, evaluator, config) {
    throw new Error("Method 'solve()' must be implemented by concrete solver strategies.");
  }
}
