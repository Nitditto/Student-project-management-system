export const DESTINATION_META = {
  "/student/defense": {
    label: "Defense Workspace",
    description: "View defense schedule, council details, reviewer form, and result updates.",
    action: "Open Defense Page",
  },
  "/student/registration": {
    label: "Registration Setup",
    description: "Review group invitations, preselection, and registration progress.",
    action: "Open Registration Page",
  },
  "/student/supervisor": {
    label: "Supervisor Flow",
    description: "Check supervisor assignment and project approval flow.",
    action: "Open Supervisor Page",
  },
  "/teacher/defense": {
    label: "Defense Hub",
    description: "Review council work, M5/M6 status, and defense progress.",
    action: "Open Defense Hub",
  },
  "/teacher/preselect": {
    label: "Teacher Preselect",
    description: "Check preselection decisions and pending invitations.",
    action: "Open Preselect Page",
  },
};

export const TYPE_META = {
  feedback: {
    iconKey: "message",
    badgeClass: "bg-sky-100 text-sky-700",
    iconClass: "text-sky-600",
    accentClass: "from-sky-500/15 to-sky-100/30",
    label: "Feedback",
  },
  deadline: {
    iconKey: "deadline",
    badgeClass: "bg-rose-100 text-rose-700",
    iconClass: "text-rose-600",
    accentClass: "from-rose-500/15 to-rose-100/30",
    label: "Deadline",
  },
  approval: {
    iconKey: "approval",
    badgeClass: "bg-emerald-100 text-emerald-700",
    iconClass: "text-emerald-600",
    accentClass: "from-emerald-500/15 to-emerald-100/30",
    label: "Approval",
  },
  meeting: {
    iconKey: "meeting",
    badgeClass: "bg-violet-100 text-violet-700",
    iconClass: "text-violet-600",
    accentClass: "from-violet-500/15 to-violet-100/30",
    label: "Meeting",
  },
  attendance: {
    iconKey: "attendance",
    badgeClass: "bg-cyan-100 text-cyan-700",
    iconClass: "text-cyan-600",
    accentClass: "from-cyan-500/15 to-cyan-100/30",
    label: "Attendance",
  },
  leave: {
    iconKey: "leave",
    badgeClass: "bg-amber-100 text-amber-700",
    iconClass: "text-amber-600",
    accentClass: "from-amber-500/15 to-amber-100/30",
    label: "Leave",
  },
  defense: {
    iconKey: "defense",
    badgeClass: "bg-indigo-100 text-indigo-700",
    iconClass: "text-indigo-600",
    accentClass: "from-indigo-500/15 to-indigo-100/30",
    label: "Defense",
  },
  warning: {
    iconKey: "warning",
    badgeClass: "bg-orange-100 text-orange-700",
    iconClass: "text-orange-600",
    accentClass: "from-orange-500/15 to-orange-100/30",
    label: "Warning",
  },
  system: {
    iconKey: "system",
    badgeClass: "bg-slate-100 text-slate-700",
    iconClass: "text-slate-600",
    accentClass: "from-slate-500/15 to-slate-100/30",
    label: "System",
  },
  general: {
    iconKey: "general",
    badgeClass: "bg-slate-100 text-slate-700",
    iconClass: "text-slate-600",
    accentClass: "from-slate-500/15 to-slate-100/30",
    label: "General",
  },
};

export const PRIORITY_META = {
  high: {
    label: "High",
    badgeClass: "bg-rose-600 text-white",
    ringClass: "ring-rose-200 border-rose-200",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-amber-500 text-white",
    ringClass: "ring-amber-200 border-amber-200",
  },
  low: {
    label: "Low",
    badgeClass: "bg-emerald-600 text-white",
    ringClass: "ring-emerald-200 border-emerald-200",
  },
};

export const formatNotificationRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("vi-VN");
};

export const formatNotificationAbsoluteTime = (dateString) =>
  new Date(dateString).toLocaleString("vi-VN");

const toSentenceCase = (value = "") =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";

const getQuotedValues = (message = "") =>
  [...message.matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean);

export const buildNotificationPresentation = (notification) => {
  const message = notification.message || "";
  const destination = DESTINATION_META[notification.link] || null;
  const typeMeta = TYPE_META[notification.type] || TYPE_META.general;
  const quotedValues = getQuotedValues(message);
  const details = [];

  if (quotedValues[0]) {
    details.push({ label: "Related item", value: quotedValues[0] });
  }

  const cloFinalMatch = message.match(/ket qua\s+([a-z_]+)\s+va diem\s+([0-9.]+|N\/A)\/10/i);
  if (cloFinalMatch) {
    details.push({ label: "CLO result", value: toSentenceCase(cloFinalMatch[1]) });
    details.push({ label: "Official score", value: `${cloFinalMatch[2]}/10` });
  }

  const defenseScoreMatch = message.match(/diem tong ket\s+([0-9.]+|N\/A)/i);
  if (defenseScoreMatch) {
    details.push({ label: "Defense score", value: defenseScoreMatch[1] });
  }

  const councilMatch = message.match(/hoi dong\s+([^.]*)/i);
  if (message.includes("duoc gan vao hoi dong") && councilMatch?.[1]) {
    details.push({ label: "Council", value: councilMatch[1].trim() });
  }

  const slotMatch = message.match(/slot\s+(.+?)\s+cho nhom/i);
  if (slotMatch?.[1]) {
    details.push({ label: "Assigned slot", value: slotMatch[1].trim() });
  }

  const decisionMatch = message.match(/\sda duoc\s+(phe duyet|tu choi)/i);
  if (decisionMatch?.[1]) {
    details.push({
      label: "Decision",
      value: decisionMatch[1] === "phe duyet" ? "Approved" : "Rejected",
    });
  }

  if (message.includes("Vui long duyet")) {
    details.push({
      label: "Action needed",
      value: "Open the related page to review and process this item.",
    });
  }

  let title = typeMeta.label;
  if (notification.link === "/student/defense" && message.includes("khoa diem CLO")) {
    title = "CLO Result Finalized";
  } else if (
    notification.link === "/student/defense" &&
    message.includes("hoan tat bao ve voi diem tong ket")
  ) {
    title = "Defense Result Finalized";
  } else if (
    notification.link === "/student/defense" &&
    message.includes("duoc gan vao hoi dong")
  ) {
    title = "Assigned To Defense Council";
  } else if (
    notification.link === "/student/defense" &&
    message.includes("tao buoi diem danh")
  ) {
    title = "Attendance Session Created";
  } else if (notification.type === "leave") {
    title = "Leave Request Updated";
  } else if (notification.link === "/student/supervisor") {
    title = "Supervisor Assignment";
  } else if (notification.link === "/student/registration") {
    title = "Registration Update";
  } else if (notification.link === "/teacher/defense") {
    title = "Defense Workflow Update";
  }

  return {
    ...notification,
    title,
    summary: message,
    destination,
    details,
    typeMeta,
  };
};
