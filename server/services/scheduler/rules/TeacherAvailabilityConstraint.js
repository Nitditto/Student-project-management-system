import { BaseConstraint } from "./BaseConstraint.js";

/**
 * Hard Constraint: Check if assigned teachers (members, chairman, secretary, reviewer)
 * are actually available at the scheduled timeslot based on their registered schedules.
 * If a teacher has no registered schedules in the system, we assume they are available.
 * If they have registered schedules, they must have an available slot covering the timeslot
 * and no booked/completed slot overlapping it.
 */
export class TeacherAvailabilityConstraint extends BaseConstraint {
  constructor() {
    super("TeacherAvailability", 1.0, true); // Hard constraint
  }

  evaluate(assignment, context) {
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

    const teacherSchedules = context.teacherSchedules || [];

    for (const teacherId of teachers) {
      // Find schedules for this teacher
      const schedules = teacherSchedules.filter(s => s.teacher?.toString() === teacherId);
      if (schedules.length === 0) {
        // No schedules registered: assume available
        continue;
      }

      // Check if teacher has an available slot that covers this timeslot
      // A slot covers the timeslot if slot.startAt <= startAt and slot.endAt >= endAt
      let isTeacherAvailable = false;
      let hasBookedConflict = false;

      for (const schedule of schedules) {
        for (const slot of schedule.slots || []) {
          const slotStart = new Date(slot.startAt).getTime();
          const slotEnd = new Date(slot.endAt).getTime();

          // Check if timeslot overlaps with slot
          const isOverlapping = (startAt < slotEnd && endAt > slotStart);

          if (isOverlapping) {
            if (slot.status === "booked" || slot.status === "completed") {
              hasBookedConflict = true;
              break;
            }
            if (slot.status === "available") {
              // Teacher is available if slot covers the timeslot
              if (slotStart <= startAt && slotEnd >= endAt) {
                isTeacherAvailable = true;
              }
            }
          }
        }
        if (hasBookedConflict) break;
      }

      if (hasBookedConflict || !isTeacherAvailable) {
        return 0.0; // Violation
      }
    }

    return 1.0; // Satisfied
  }
}
