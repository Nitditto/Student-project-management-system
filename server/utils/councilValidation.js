const COUNCIL_MEMBER_ROLES = new Set(["chairman", "secretary", "member"]);

const toTeacherId = (teacher) => {
  if (!teacher) return "";
  if (typeof teacher === "string") return teacher;
  if (typeof teacher === "object" && teacher._id) {
    return String(teacher._id);
  }

  return String(teacher);
};

export const getCouncilMembersValidationMessage = (members) => {
  if (!Array.isArray(members) || members.length === 0) {
    return "Council members are required";
  }

  let chairmanCount = 0;
  let secretaryCount = 0;
  const teacherIds = [];

  for (const member of members) {
    if (!member?.teacher) {
      return "Each council member must have a teacher assigned";
    }

    if (!COUNCIL_MEMBER_ROLES.has(member.role)) {
      return "Each council member must have a valid role";
    }

    const numericWeight = Number(member.weight);
    if (Number.isNaN(numericWeight) || numericWeight < 0 || numericWeight > 10) {
      return "Each council member must have a valid score weight";
    }

    if (member.role === "chairman") chairmanCount += 1;
    if (member.role === "secretary") secretaryCount += 1;
    teacherIds.push(toTeacherId(member.teacher));
  }

  if (chairmanCount !== 1) {
    return "Council must have exactly one chairman";
  }

  if (secretaryCount !== 1) {
    return "Council must have exactly one secretary";
  }

  if (new Set(teacherIds).size !== teacherIds.length) {
    return "Council members must not contain duplicate teachers";
  }

  return null;
};
