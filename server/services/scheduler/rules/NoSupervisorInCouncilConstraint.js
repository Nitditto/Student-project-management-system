import { BaseConstraint } from "./BaseConstraint.js";

/**
 * Hard Constraint: A project's supervisor must not be part of the evaluating council
 * (neither a regular member, chairman, secretary, nor the assigned reviewer).
 */
export class NoSupervisorInCouncilConstraint extends BaseConstraint {
  constructor() {
    super("NoSupervisorInCouncil", 1.0, true); // Hard constraint
  }

  evaluate(assignment, context) {
    const project = assignment.project;
    if (!project) return 1.0;

    // Get supervisor ID
    const supervisorId = project.supervisor 
      ? project.supervisor.toString() 
      : (project.student?.supervisor ? project.student.supervisor.toString() : null);

    if (!supervisorId) return 1.0;

    // 1. Check if supervisor is in councilMembers
    const councilMembers = assignment.councilMembers || [];
    const isSupervisorInCouncil = councilMembers.some(member => {
      const memberId = member.teacher ? member.teacher.toString() : member.toString();
      return memberId === supervisorId;
    });

    if (isSupervisorInCouncil) {
      return 0.0; // Violation
    }

    // 2. Check if supervisor is the reviewer
    if (assignment.reviewer) {
      const reviewerId = assignment.reviewer.toString();
      if (reviewerId === supervisorId) {
        return 0.0; // Violation
      }
    }

    return 1.0; // Satisfied
  }
}
