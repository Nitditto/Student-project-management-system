import { BaseConstraint } from "./BaseConstraint.js";

/**
 * Hard Constraint: A classroom/room must not host multiple councils
 * at the same time during overlapping slots.
 */
export class NoRoomOverbookingConstraint extends BaseConstraint {
  constructor() {
    super("NoRoomOverbooking", 1.0, true); // Hard constraint
  }

  evaluate(assignment, context) {
    const room = assignment.room;
    const timeSlot = assignment.timeSlot;
    
    if (!room || !timeSlot || !timeSlot.startAt || !timeSlot.endAt) {
      return 1.0;
    }

    const startAt = new Date(timeSlot.startAt).getTime();
    const endAt = new Date(timeSlot.endAt).getTime();

    const allAssignments = context.allAssignments || [];
    for (const other of allAssignments) {
      // Skip self
      if (other.project?._id?.toString() === assignment.project?._id?.toString()) {
        continue;
      }

      // If in different rooms, no conflict
      if (other.room !== room) {
        continue;
      }

      const otherSlot = other.timeSlot;
      if (!otherSlot || !otherSlot.startAt || !otherSlot.endAt) continue;

      const otherStart = new Date(otherSlot.startAt).getTime();
      const otherEnd = new Date(otherSlot.endAt).getTime();

      // If they are in the same session (same room, same start and end times), they do not conflict.
      if (otherStart === startAt && otherEnd === endAt) {
        continue;
      }

      // Check for time overlap
      const isOverlapping = (startAt < otherEnd && endAt > otherStart);
      if (isOverlapping) {
        return 0.0; // Violation
      }
    }

    return 1.0; // Satisfied
  }
}
