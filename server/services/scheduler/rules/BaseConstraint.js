/**
 * Base Constraint Class (Specification Pattern)
 * All custom scheduler constraints must extend this class.
 */
export class BaseConstraint {
  /**
   * @param {string} name - Unique identifier of the constraint.
   * @param {number} weight - Relative impact of the constraint (only for soft constraints).
   * @param {boolean} isHard - True if violation of this constraint vetoes the solution (makes fitness -Infinity).
   */
  constructor(name, weight = 1.0, isHard = false) {
    this.name = name;
    this.weight = weight;
    this.isHard = isHard;
  }

  /**
   * Evaluates the constraint against an assignment in the generated schedule.
   * @param {Object} assignment - A single scheduled item e.g., { project, councilMembers, reviewer, room, timeSlot }
   * @param {Object} context - Global context data (e.g., all assignments, teacher expertises, etc.)
   * @returns {number} Score between 0.0 (completely violated) and 1.0 (perfectly satisfied).
   */
  evaluate(assignment, context) {
    throw new Error("Method 'evaluate()' must be implemented in concrete constraint subclasses.");
  }
}
