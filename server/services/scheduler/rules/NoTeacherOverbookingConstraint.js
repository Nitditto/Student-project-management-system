import { BaseConstraint } from "./BaseConstraint.js";

/**
 * Hard Constraint: A teacher must not be scheduled to participate in multiple councils
 * (either as a member, chairman, secretary, or reviewer) during overlapping time slots.
 */
export class NoTeacherOverbookingConstraint extends BaseConstraint {
  constructor() {
    super("NoTeacherOverbooking", 1.0, true); // Hard constraint
  }

  evaluate(assignment, context) {
    const room = assignment.room;
    const timeSlot = assignment.timeSlot;
    if (!timeSlot || !timeSlot.startAt || !timeSlot.endAt) return 1.0;

    const startAt = new Date(timeSlot.startAt).getTime();
    const endAt = new Date(timeSlot.endAt).getTime();

    // Collect all teachers in current assignment
    const teachers = (assignment.councilMembers || []).map(m => 
      m.teacher ? m.teacher.toString() : m.toString()
    );
    if (assignment.reviewer) {
      teachers.push(assignment.reviewer.toString());
    }

    if (teachers.length === 0) return 1.0;

    // Check overlap against all other assignments in context
    const allAssignments = context.allAssignments || [];
    for (const other of allAssignments) {
      // Skip self
      if (other.project?._id?.toString() === assignment.project?._id?.toString()) {
        continue;
      }

      const otherSlot = other.timeSlot;
      if (!otherSlot || !otherSlot.startAt || !otherSlot.endAt) continue;

      const otherStart = new Date(otherSlot.startAt).getTime();
      const otherEnd = new Date(otherSlot.endAt).getTime();

      // If they are in the same session (same room, same start and end times), they do not conflict.
      if (other.room === room && otherStart === startAt && otherEnd === endAt) {
        continue;
      }

      // Check for time overlap
      const isOverlapping = (startAt < otherEnd && endAt > otherStart);

      if (isOverlapping) {
        // Collect other assignment's teachers
        const otherTeachers = (other.councilMembers || []).map(m => 
          m.teacher ? m.teacher.toString() : m.toString()
        );
        if (other.reviewer) {
          otherTeachers.push(other.reviewer.toString());
        }

        // Check if any teacher is in both lists
        const isDoubleBooked = teachers.some(t => otherTeachers.includes(t));
        if (isDoubleBooked) {
          return 0.0; // Violation
        }
      }
    }

    return 1.0; // Satisfied
  }
}
