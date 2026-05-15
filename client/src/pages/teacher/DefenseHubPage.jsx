import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { isLocalOnlyHost, PUBLIC_APP_URL } from "../../lib/appConfig";
import QRCode from "qrcode";
import RubricTable from "../../components/assessment/RubricTable";
import {
  buildRubricPayload,
  CLO_CODES,
  createRubricEntries,
  formatAssessmentScore,
  mergeRubricEntries,
  MILESTONE_LABELS,
  TEACHER_ASSESSMENT_TABS,
} from "../../lib/assessment";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
};

const getProjectDisplayName = (project) => project?.groupName || project?.title || "N/A";

const attendanceStatusClassMap = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  excused: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const attendanceStatusOrder = {
  pending: 0,
  present: 1,
  excused: 2,
  absent: 3,
};

const checkInMethodLabelMap = {
  qr: "QR scan",
  code: "teacher code",
  manual: "manual confirmation",
};

const buildAttendanceCheckInUrl = (qrToken, ngrokBaseUrl) => {
  if (!qrToken) return "";
  const base = ngrokBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/student/defense?token=${encodeURIComponent(qrToken)}`;
};

const buildAttendanceMetrics = (records = []) => {
  const metrics = {
    total: records.length,
    pending: 0,
    present: 0,
    excused: 0,
    absent: 0,
  };

  records.forEach((record) => {
    if (metrics[record.status] !== undefined) {
      metrics[record.status] += 1;
    }
  });

  return {
    ...metrics,
    completed: metrics.total - metrics.pending,
  };
};

const sortAttendanceRecords = (records = []) =>
  [...records].sort((left, right) => {
    const leftOrder = attendanceStatusOrder[left.status] ?? 99;
    const rightOrder = attendanceStatusOrder[right.status] ?? 99;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return (left.student?.name || "").localeCompare(right.student?.name || "");
  });

const attendanceFilterOptions = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "present", label: "Present" },
  { key: "other", label: "Other" },
];

const filterAttendanceRecords = (records = [], filterKey = "all") => {
  switch (filterKey) {
    case "pending":
      return records.filter((record) => record.status === "pending");
    case "present":
      return records.filter((record) => record.status === "present");
    case "other":
      return records.filter((record) => ["excused", "absent"].includes(record.status));
    case "all":
    default:
      return records;
  }
};

const formatModeLabel = (mode) => {
  const labels = {
    offline: "Offline Defense",
    online: "Online Defense",
    hybrid: "Hybrid Defense",
  };
  return labels[mode] || mode || "N/A";
};

const formatSlotStatusLabel = (status) => {
  const labels = {
    available: "Available for student pick",
    booked: "Booked by a team",
    cancelled: "Cancelled",
  };
  return labels[status] || status || "N/A";
};

const FieldBlock = ({ label, hint, children }) => (
  <div className="space-y-2">
    <div>
      <label className="label">{label}</label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
    {children}
  </div>
);

const createSlot = () => ({
  startAt: "",
  endAt: "",
  location: "",
  mode: "offline",
});

const DefenseHubPage = () => {
  const [loading, setLoading] = useState(true);
  const [ngrokBaseUrl, setNgrokBaseUrl] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionQrCodes, setSessionQrCodes] = useState({});
  const [councils, setCouncils] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    description: "",
    pickDeadline: "",
    rescheduleWindowHours: 24,
    slots: [createSlot()],
  });
  const [attendanceForm, setAttendanceForm] = useState({
    projectId: "",
    title: "",
    startsAt: "",
    endsAt: "",
    windowMinutes: 15,
  });
  const [attendanceFilters, setAttendanceFilters] = useState({});
  const [editSessionForms, setEditSessionForms] = useState({});
  const [scoreForms, setScoreForms] = useState({});
  const [reviewerForms, setReviewerForms] = useState({});
  const [reviewerAssignments, setReviewerAssignments] = useState({});
  const [assessmentTab, setAssessmentTab] = useState("M1");
  const [assessmentSummaries, setAssessmentSummaries] = useState({});
  const [selectedAssessmentProjectId, setSelectedAssessmentProjectId] = useState("");
  const [assessmentForms, setAssessmentForms] = useState({});
  const [assessmentFileForms, setAssessmentFileForms] = useState({});
  const [m6ReviewForms, setM6ReviewForms] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheduleRes, sessionRes, councilRes, studentsRes, usersRes, ngrokRes] = await Promise.all([
        axiosInstance.get("/teacher/schedules"),
        axiosInstance.get("/teacher/attendance-sessions"),
        axiosInstance.get("/teacher/councils"),
        axiosInstance.get("/teacher/assigned-students"),
        axiosInstance.get("/teacher/teacher-directory"),
        axiosInstance.get("/teacher/ngrok-url").catch(() => ({ data: { data: { publicUrl: null } } })),
      ]);

      setSchedules(scheduleRes.data.data?.schedules || []);
      setSessions(sessionRes.data.data?.sessions || []);
      setCouncils(councilRes.data.data?.councils || []);
      const nextStudents = studentsRes.data.data?.students || [];
      setStudents(nextStudents);
      setTeachers(
        usersRes.data.data?.teachers || [],
      );
      setNgrokBaseUrl(ngrokRes.data.data?.publicUrl || "");

      const projectIds = Array.from(
        new Set(
          nextStudents
            .map((student) => student.project?._id)
            .filter(Boolean),
        ),
      );

      if (!selectedAssessmentProjectId && projectIds.length > 0) {
        setSelectedAssessmentProjectId(projectIds[0]);
      }

      const assessmentEntries = await Promise.all(
        projectIds.map(async (projectId) => {
          try {
            const res = await axiosInstance.get(`/teacher/projects/${projectId}/assessment-summary`);
            return [projectId, res.data.data?.assessment || null];
          } catch {
            return [projectId, null];
          }
        }),
      );
      setAssessmentSummaries(Object.fromEntries(assessmentEntries));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load defense hub");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const sessionRes = await axiosInstance.get("/teacher/attendance-sessions");
        setSessions(sessionRes.data.data?.sessions || []);
      } catch {
        // Ignore silent background refresh failures.
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const buildQrCodes = async () => {
      const entries = await Promise.all(
        (sessions || []).map(async (session) => {
          if (!session?.qrToken) {
            return [session?._id, null];
          }

          try {
            const qrDataUrl = await QRCode.toDataURL(
              buildAttendanceCheckInUrl(session.qrToken, ngrokBaseUrl),
              {
              width: 180,
              margin: 1,
              },
            );
            return [session._id, qrDataUrl];
          } catch (error) {
            console.error("QR Code generation error:", error);
            return [session._id, null];
          }
        }),
      );

      if (!isCancelled) {
        setSessionQrCodes(Object.fromEntries(entries));
      }
    };

    buildQrCodes();

    return () => {
      isCancelled = true;
    };
  }, [sessions, ngrokBaseUrl]);

  const projectOptions = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      if (student.project?._id) {
        map.set(student.project._id, student.project);
      }
    });
    return Array.from(map.values());
  }, [students]);

  const selectedAssessmentProject = useMemo(
    () => projectOptions.find((project) => project._id === selectedAssessmentProjectId) || projectOptions[0] || null,
    [projectOptions, selectedAssessmentProjectId],
  );

  const selectedAssessmentSummary = selectedAssessmentProject?._id
    ? assessmentSummaries[selectedAssessmentProject._id] || null
    : null;

  useEffect(() => {
    if (!selectedAssessmentProject?._id || !selectedAssessmentSummary) {
      return;
    }

    ["M1", "M2", "M3", "M4", "M5"].forEach((milestoneCode) => {
      const formKey = `${selectedAssessmentProject._id}:${milestoneCode}`;
      if (!assessmentForms[formKey]) {
        seedAssessmentFormFromSummary(
          selectedAssessmentProject._id,
          milestoneCode,
          selectedAssessmentSummary,
        );
      }
    });
  }, [selectedAssessmentProject, selectedAssessmentSummary]);

  const updateScheduleField = (field, value) => {
    setScheduleForm((current) => ({ ...current, [field]: value }));
  };

  const updateSlotField = (index, field, value) => {
    setScheduleForm((current) => ({
      ...current,
      slots: current.slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  };

  const createSchedule = async () => {
    if (!scheduleForm.title.trim()) {
      toast.error("Please enter a defense schedule window title");
      return;
    }
    if (!scheduleForm.pickDeadline) {
      toast.error("Please set the slot picking deadline");
      return;
    }
    if (!scheduleForm.slots.every((slot) => slot.startAt && slot.endAt)) {
      toast.error("Every slot must include both defense start time and end time");
      return;
    }

    try {
      await axiosInstance.post("/teacher/schedules", scheduleForm);
      toast.success("Defense schedule window created");
      setScheduleForm({
        title: "",
        description: "",
        pickDeadline: "",
        rescheduleWindowHours: 24,
        slots: [createSlot()],
      });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create schedule");
    }
  };

  const runAutoAssign = async (scheduleId) => {
    try {
      await axiosInstance.post(`/teacher/schedules/${scheduleId}/auto-assign`);
      toast.success("Deadline auto-assignment completed");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to auto-assign");
    }
  };

  const createAttendance = async () => {
    if (!attendanceForm.projectId) {
      toast.error("Please select a supervised project first");
      return;
    }
    if (!attendanceForm.title.trim()) {
      toast.error("Please enter an attendance session title");
      return;
    }
    if (!attendanceForm.startsAt || !attendanceForm.endsAt) {
      toast.error("Please fill in both meeting start time and meeting end time");
      return;
    }

    const toIso = (v) => v ? new Date(v).toISOString() : v;
    try {
      await axiosInstance.post("/teacher/attendance-sessions", {
        ...attendanceForm,
        startsAt: toIso(attendanceForm.startsAt),
        endsAt: toIso(attendanceForm.endsAt),
      });
      toast.success("Attendance session created");
      setAttendanceForm({
        projectId: "",
        title: "",
        startsAt: "",
        endsAt: "",
        windowMinutes: 15,
      });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create attendance session");
    }
  };

  const reviewLeave = async (sessionId, studentId, decision) => {
    try {
      await axiosInstance.put(
        `/teacher/attendance-sessions/${sessionId}/students/${studentId}/leave-review`,
        { decision },
      );
      toast.success("Leave request updated");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to review leave request");
    }
  };

  const manualAttendance = async (sessionId, studentId, status) => {
    try {
      await axiosInstance.put(
        `/teacher/attendance-sessions/${sessionId}/students/${studentId}/manual`,
        { status },
      );
      toast.success("Attendance updated manually");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update attendance");
    }
  };

  const updateScoreForm = (key, field, value) => {
    setScoreForms((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const submitScore = async (councilId, projectId) => {
    const key = `${councilId}-${projectId}`;
    try {
      await axiosInstance.post(`/teacher/councils/${councilId}/projects/${projectId}/score`, {
        score: scoreForms[key]?.score,
        comment: scoreForms[key]?.comment,
      });
      toast.success("Score saved");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save score");
    }
  };

  const updateReviewerForm = (key, field, value) => {
    setReviewerForms((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const submitReviewerFormAction = async (councilId, projectId) => {
    const key = `${councilId}-${projectId}`;
    try {
      await axiosInstance.post(
        `/teacher/councils/${councilId}/projects/${projectId}/reviewer-form`,
        reviewerForms[key] || {},
      );
      toast.success("Reviewer report exported to PDF");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to export reviewer report");
    }
  };

  const finalizeScore = async (councilId, projectId) => {
    const key = `${councilId}-${projectId}`;
    try {
      await axiosInstance.post(
        `/teacher/councils/${councilId}/projects/${projectId}/finalize`,
        { chairComment: scoreForms[key]?.chairComment || "" },
      );
      toast.success("Final score locked");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize score");
    }
  };

  const updateReviewerAssignment = (key, field, value) => {
    setReviewerAssignments((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const assignReviewer = async (councilId, projectId) => {
    const key = `${councilId}-${projectId}`;
    try {
      await axiosInstance.post(
        `/teacher/councils/${councilId}/projects/${projectId}/reviewer`,
        reviewerAssignments[key] || {},
      );
      toast.success("Reviewer assigned by chairman");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign reviewer");
    }
  };

  const updateAttendanceFilter = (sessionId, filterKey) => {
    setAttendanceFilters((current) => ({
      ...current,
      [sessionId]: filterKey,
    }));
  };

  const toLocalInputValue = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditSession = (session) => {
    setEditSessionForms((prev) => ({
      ...prev,
      [session._id]: {
        open: true,
        title: session.title,
        startsAt: toLocalInputValue(session.startsAt),
        endsAt: toLocalInputValue(session.endsAt),
        windowMinutes: session.checkInClosesAt && session.startsAt
          ? Math.round((new Date(session.checkInClosesAt) - new Date(session.startsAt)) / 60000)
          : 15,
      },
    }));
  };

  const closeEditSession = (sessionId) => {
    setEditSessionForms((prev) => ({ ...prev, [sessionId]: { open: false } }));
  };

  const updateEditSessionField = (sessionId, field, value) => {
    setEditSessionForms((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], [field]: value },
    }));
  };

  const saveEditSession = async (sessionId) => {
    const form = editSessionForms[sessionId];
    if (!form) return;
    const toIso = (v) => v ? new Date(v).toISOString() : v;
    try {
      await axiosInstance.put(`/teacher/attendance-sessions/${sessionId}`, {
        title: form.title,
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
        windowMinutes: form.windowMinutes,
      });
      toast.success("Attendance session updated");
      closeEditSession(sessionId);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update session");
    }
  };

  const deleteSession = async (sessionId, sessionTitle) => {
    const confirmed = window.confirm(
      `Delete attendance session "${sessionTitle}"? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await axiosInstance.delete(`/teacher/attendance-sessions/${sessionId}`);
      toast.success("Attendance session deleted");
      setEditSessionForms((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      setAttendanceFilters((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      setSessionQrCodes((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Failed to delete session",
      );
    }
  };

  const refreshAssessmentSummary = async (projectId) => {
    if (!projectId) return;
    try {
      const res = await axiosInstance.get(`/teacher/projects/${projectId}/assessment-summary`);
      setAssessmentSummaries((current) => ({
        ...current,
        [projectId]: res.data.data?.assessment || null,
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to refresh assessment summary");
    }
  };

  const updateAssessmentFormEntry = (projectId, milestoneCode, cloCode, field, value) => {
    const formKey = `${projectId}:${milestoneCode}`;
    setAssessmentForms((current) => {
      const existing = current[formKey]?.entries || createRubricEntries();
      return {
        ...current,
        [formKey]: {
          ...(current[formKey] || {}),
          entries: existing.map((entry) =>
            entry.cloCode === cloCode ? { ...entry, [field]: value } : entry,
          ),
        },
      };
    });
  };

  const updateAssessmentOverallComment = (projectId, milestoneCode, value) => {
    const formKey = `${projectId}:${milestoneCode}`;
    setAssessmentForms((current) => ({
      ...current,
      [formKey]: {
        ...(current[formKey] || { entries: createRubricEntries() }),
        overallComment: value,
      },
    }));
  };

  const updateAssessmentFiles = (projectId, milestoneCode, files) => {
    setAssessmentFileForms((current) => ({
      ...current,
      [`${projectId}:${milestoneCode}`]: Array.from(files || []),
    }));
  };

  const seedAssessmentFormFromSummary = (projectId, milestoneCode, summary, assessorId = null) => {
    const milestone = summary?.milestones?.find((item) => item.code === milestoneCode);
    const existingSubmission =
      milestone
        ? assessorId
          ? milestone.assessorSubmissions?.find((item) => item.assessor?._id === assessorId || item.assessor === assessorId)
          : milestone.assessorSubmissions?.[0]
        : null;

    const entries = mergeRubricEntries(existingSubmission?.cloEntries || []);
    const formKey = `${projectId}:${milestoneCode}`;
    setAssessmentForms((current) => ({
      ...current,
      [formKey]: {
        entries,
        overallComment: existingSubmission?.overallComment || "",
      },
    }));
  };

  const submitTeacherAssessment = async (projectId, milestoneCode) => {
    const formKey = `${projectId}:${milestoneCode}`;
    const form = assessmentForms[formKey] || { entries: createRubricEntries(), overallComment: "" };
    const files = assessmentFileForms[formKey] || [];
    const payload = new FormData();
    payload.append("cloEntries", JSON.stringify(buildRubricPayload(form.entries)));
    payload.append("overallComment", form.overallComment || "");
    files.forEach((file) => payload.append("files", file));

    try {
      await axiosInstance.post(
        `/teacher/projects/${projectId}/assessments/${milestoneCode}/submissions`,
        payload,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success(`${milestoneCode} rubric saved`);
      await refreshAssessmentSummary(projectId);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to save ${milestoneCode} rubric`);
    }
  };

  const submitTeacherM5Assessment = async (councilId, projectId) => {
    const formKey = `${projectId}:M5`;
    const form = assessmentForms[formKey] || { entries: createRubricEntries(), overallComment: "" };
    const files = assessmentFileForms[formKey] || [];
    const payload = new FormData();
    payload.append("cloEntries", JSON.stringify(buildRubricPayload(form.entries)));
    payload.append("overallComment", form.overallComment || "");
    files.forEach((file) => payload.append("files", file));

    try {
      await axiosInstance.post(
        `/teacher/councils/${councilId}/projects/${projectId}/m5-submissions`,
        payload,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success("M5 CLO rubric submitted");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit M5 rubric");
    }
  };

  const updateM6ReviewForm = (submissionId, field, value) => {
    setM6ReviewForms((current) => ({
      ...current,
      [submissionId]: {
        ...(current[submissionId] || {}),
        [field]: value,
      },
    }));
  };

  const reviewM6Submission = async (projectId, submissionId, approvalStatus) => {
    const payload = new FormData();
    payload.append("approvalStatus", approvalStatus);
    payload.append("overallComment", m6ReviewForms[submissionId]?.overallComment || "");

    try {
      await axiosInstance.put(
        `/teacher/projects/${projectId}/assessments/M6/submissions/${submissionId}`,
        payload,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success(`M6 submission ${approvalStatus}`);
      await refreshAssessmentSummary(projectId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to review M6 submission");
    }
  };

  const finalizeCloAssessmentAction = async (councilId, projectId) => {
    const formKey = `${projectId}:M5`;
    try {
      await axiosInstance.post(
        `/teacher/councils/${councilId}/projects/${projectId}/finalize-clo`,
        { chairComment: assessmentForms[formKey]?.overallComment || "" },
      );
      toast.success("CLO assessment finalized");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize CLO assessment");
    }
  };

  if (loading) {
    return <div className="card">Loading defense hub...</div>;
  }

  const attendancePreviewStart = attendanceForm.startsAt
    ? new Date(attendanceForm.startsAt)
    : null;
  const attendanceWindowMinutes = Number(attendanceForm.windowMinutes || 15);
  const attendanceCheckInOpen = attendancePreviewStart
    ? new Date(attendancePreviewStart.getTime() - 15 * 60 * 1000)
    : null;
  const attendanceCheckInClose = attendancePreviewStart
    ? new Date(
        attendancePreviewStart.getTime() + attendanceWindowMinutes * 60 * 1000,
      )
    : null;
  const qrUsesLocalhost = isLocalOnlyHost(PUBLIC_APP_URL);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Defense Hub</h1>
        <p className="text-emerald-100">
          Manage defense schedule slots, attendance sessions, reviewer assignment, scoring, and final lock.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">How Teacher Uses This Page</h2>
          <p className="card-subtitle">
            Follow the steps in order so the flow is clear for both teacher and student.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            "Step 1. Create a defense schedule window with multiple available slots for students to pick.",
            "Step 2. Wait for the representative student to pick one slot, or run auto-assign after the deadline.",
            "Step 3. Before each meeting/reporting session, create an attendance session for one supervised project.",
            "Step 4. During or after the session, review leave requests and manually mark attendance if needed.",
            "Step 5. If you are in a council, assign reviewer, enter scores, export reviewer PDF, and lock final score.",
          ].map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div className="card-header">
            <h2 className="card-title">Section A. Create Defense Schedule Window</h2>
            <p className="card-subtitle">
              Create one slot-picking batch for supervised teams. The times below are defense presentation times that students will choose from.
            </p>
          </div>

          <FieldBlock
            label="A1. Defense Schedule Window Title"
            hint='Example: "Round 1 - Midterm Defense Slot Selection"'
          >
            <input
              className="input"
              placeholder="Enter schedule window title"
              value={scheduleForm.title}
              onChange={(event) => updateScheduleField("title", event.target.value)}
            />
          </FieldBlock>

          <FieldBlock
            label="A2. Description For Students"
            hint="Explain what this schedule is for, such as midterm defense, final defense, or weekly reporting."
          >
            <textarea
              className="input min-h-20"
              placeholder="Enter schedule description shown to students"
              value={scheduleForm.description}
              onChange={(event) => updateScheduleField("description", event.target.value)}
            />
          </FieldBlock>

          <FieldBlock
            label="A3. Slot Picking Deadline"
            hint="This is the last time a team representative is allowed to choose a slot by themselves. After this moment, the system can auto-assign remaining slots."
          >
            <input
              className="input"
              type="datetime-local"
              value={scheduleForm.pickDeadline}
              onChange={(event) => updateScheduleField("pickDeadline", event.target.value)}
            />
          </FieldBlock>

          <FieldBlock
            label="A4. Reschedule Lock Window (Hours Before Defense)"
            hint="If set to 24, students cannot change slot within 24 hours before the booked defense time."
          >
            <input
              className="input"
              type="number"
              min="1"
              value={scheduleForm.rescheduleWindowHours}
              onChange={(event) =>
                updateScheduleField("rescheduleWindowHours", event.target.value)
              }
              placeholder="Example: 24 or 48"
            />
          </FieldBlock>

          {scheduleForm.slots.map((slot, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="border-b border-slate-200 pb-2">
                <p className="font-medium text-slate-800">
                  A5. Defense Slot #{index + 1}
                </p>
                <p className="text-xs text-slate-500">
                  One slot equals one concrete defense appointment that one team can book.
                </p>
              </div>

              <FieldBlock
                label={`Slot ${index + 1} Start Time`}
                hint="The exact time the defense/report starts."
              >
                <input
                  className="input"
                  type="datetime-local"
                  value={slot.startAt}
                  onChange={(event) => updateSlotField(index, "startAt", event.target.value)}
                />
              </FieldBlock>

              <FieldBlock
                label={`Slot ${index + 1} End Time`}
                hint="The exact time the defense/report ends."
              >
                <input
                  className="input"
                  type="datetime-local"
                  value={slot.endAt}
                  onChange={(event) => updateSlotField(index, "endAt", event.target.value)}
                />
              </FieldBlock>

              <FieldBlock
                label={`Slot ${index + 1} Room / Meeting Location`}
                hint="Example: Room B305, Google Meet link, or Zoom room name."
              >
                <input
                  className="input"
                  placeholder="Enter room or online meeting location"
                  value={slot.location}
                  onChange={(event) => updateSlotField(index, "location", event.target.value)}
                />
              </FieldBlock>

              <FieldBlock
                label={`Slot ${index + 1} Defense Mode`}
                hint="Choose whether the defense is offline, online, or hybrid."
              >
                <select
                  className="input"
                  value={slot.mode}
                  onChange={(event) => updateSlotField(index, "mode", event.target.value)}
                >
                  <option value="offline">Offline Defense</option>
                  <option value="online">Online Defense</option>
                  <option value="hybrid">Hybrid Defense</option>
                </select>
              </FieldBlock>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              className="btn-outline"
              onClick={() =>
                setScheduleForm((current) => ({
                  ...current,
                  slots: [...current.slots, createSlot()],
                }))
              }
            >
              Add Another Slot
            </button>
            <button className="btn-primary" onClick={createSchedule}>
              Save Defense Schedule Window
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="card-header">
            <h2 className="card-title">Section B. Create Attendance Session</h2>
            <p className="card-subtitle">
              Create one attendance event for one supervised project. These time fields are meeting/check-in times, not defense slot-picking times.
            </p>
          </div>

          <FieldBlock
            label="B1. Supervised Project / Group"
            hint="Choose which team this attendance session belongs to."
          >
            <select
              className="input"
              value={attendanceForm.projectId}
              onChange={(event) =>
                setAttendanceForm((current) => ({
                  ...current,
                  projectId: event.target.value,
                }))
              }
            >
              <option value="">Select supervised project</option>
              {projectOptions.map((project) => (
                <option key={project._id} value={project._id}>
                  {getProjectDisplayName(project)}
                </option>
              ))}
            </select>
          </FieldBlock>

          <FieldBlock
            label="B2. Attendance Session Title"
            hint='Example: "Week 5 Progress Report Attendance" or "Final Defense Attendance".'
          >
            <input
              className="input"
              placeholder="Enter attendance session title"
              value={attendanceForm.title}
              onChange={(event) =>
                setAttendanceForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </FieldBlock>

          <FieldBlock
            label="B3. Meeting Start Time"
            hint="This is when the reporting/defense meeting officially starts."
          >
            <input
              className="input"
              type="datetime-local"
              value={attendanceForm.startsAt}
              onChange={(event) =>
                setAttendanceForm((current) => ({
                  ...current,
                  startsAt: event.target.value,
                }))
              }
            />
          </FieldBlock>

          <FieldBlock
            label="B4. Meeting End Time"
            hint="This is when the reporting/defense meeting ends."
          >
            <input
              className="input"
              type="datetime-local"
              value={attendanceForm.endsAt}
              onChange={(event) =>
                setAttendanceForm((current) => ({
                  ...current,
                  endsAt: event.target.value,
                }))
              }
            />
          </FieldBlock>

          <FieldBlock
            label="B5. Check-in Close Window (Minutes After Start Time)"
            hint="The system automatically opens check-in 15 minutes before the meeting starts, then closes it after this many minutes from the start time."
          >
            <input
              className="input"
              type="number"
              min="5"
              value={attendanceForm.windowMinutes}
              onChange={(event) =>
                setAttendanceForm((current) => ({
                  ...current,
                  windowMinutes: event.target.value,
                }))
              }
              placeholder="Example: 15"
            />
          </FieldBlock>

          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-800 mb-1">Auto-generated Attendance Timing Preview</p>
            <p>
              Check-in opens: {attendanceCheckInOpen ? formatDateTime(attendanceCheckInOpen) : "Select meeting start time first"}
            </p>
            <p>
              Check-in closes: {attendanceCheckInClose ? formatDateTime(attendanceCheckInClose) : "Select meeting start time first"}
            </p>
          </div>

          <button className="btn-primary" onClick={createAttendance}>
            Create Attendance Session
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section C. Existing Defense Schedule Windows</h2>
        </div>
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule._id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{schedule.title}</p>
                  <p className="text-sm text-slate-500">
                    Slot picking deadline: {formatDateTime(schedule.pickDeadline)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Reschedule lock: {schedule.rescheduleWindowHours} hours before booked defense time
                  </p>
                  {schedule.description ? (
                    <p className="text-sm text-slate-500">{schedule.description}</p>
                  ) : null}
                </div>
                <button className="btn-outline" onClick={() => runAutoAssign(schedule._id)}>
                  Run Deadline Auto-Assign
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {(schedule.slots || []).map((slot) => (
                  <div
                    key={slot._id}
                    className="rounded-lg bg-slate-50 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Location: {slot.location || "No location"} | Mode: {formatModeLabel(slot.mode)}
                      </p>
                    </div>
                    <span className="text-sm capitalize text-slate-600">
                      {formatSlotStatusLabel(slot.status)}
                      {slot.project?.title
                        ? ` - ${getProjectDisplayName(slot.project)}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {schedules.length === 0 && <p className="text-slate-500">No defense schedules created yet.</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="card-title">Section D. Attendance Sessions and Leave Review</h2>
              <p className="card-subtitle">
                Review live student check-in status, pending confirmations, and leave requests.
              </p>
            </div>
            <button className="btn-outline" onClick={loadData}>
              Refresh Attendance Status
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {sessions.map((session) => {
            const metrics = buildAttendanceMetrics(session.records);
            const sortedRecords = sortAttendanceRecords(session.records);
            const activeFilter = attendanceFilters[session._id] || "all";
            const visibleRecords = filterAttendanceRecords(sortedRecords, activeFilter);

            return (
              <div key={session._id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-800">{session.title}</p>
                        <button
                          onClick={() =>
                            editSessionForms[session._id]?.open
                              ? closeEditSession(session._id)
                              : openEditSession(session)
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {editSessionForms[session._id]?.open ? "Cancel" : "Edit"}
                        </button>
                        <button
                          onClick={() => deleteSession(session._id, session.title)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-slate-500">
                        Project: {getProjectDisplayName(session.project)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Meeting time: {formatDateTime(session.startsAt)} - {formatDateTime(session.endsAt)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Check-in window: {formatDateTime(session.checkInOpensAt)} - {formatDateTime(session.checkInClosesAt)}
                      </p>
                      <p className="text-sm text-slate-500">
                        6-digit fallback code: {session.accessCode}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm lg:min-w-80">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Completed</p>
                        <p className="font-semibold text-slate-800">
                          {metrics.completed}/{metrics.total}
                        </p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-green-700">Present</p>
                        <p className="font-semibold text-green-800">{metrics.present}</p>
                      </div>
                      <div className="rounded-lg bg-yellow-50 p-3">
                        <p className="text-yellow-700">Pending</p>
                        <p className="font-semibold text-yellow-800">{metrics.pending}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-blue-700">Excused / Absent</p>
                        <p className="font-semibold text-blue-800">
                          {metrics.excused} / {metrics.absent}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {editSessionForms[session._id]?.open && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                    <p className="font-medium text-blue-800">Edit Session Times</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-medium text-slate-600">Session Title</label>
                        <input
                          className="input"
                          value={editSessionForms[session._id]?.title || ""}
                          onChange={(e) => updateEditSessionField(session._id, "title", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Meeting Start Time</label>
                        <input
                          className="input"
                          type="datetime-local"
                          value={editSessionForms[session._id]?.startsAt || ""}
                          onChange={(e) => updateEditSessionField(session._id, "startsAt", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Meeting End Time</label>
                        <input
                          className="input"
                          type="datetime-local"
                          value={editSessionForms[session._id]?.endsAt || ""}
                          onChange={(e) => updateEditSessionField(session._id, "endsAt", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Check-in Close Window (min after start)</label>
                        <input
                          className="input"
                          type="number"
                          min="5"
                          value={editSessionForms[session._id]?.windowMinutes || 15}
                          onChange={(e) => updateEditSessionField(session._id, "windowMinutes", e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-blue-700">Check-in opens 15 min before start. Saving recomputes the session status automatically.</p>
                    <div className="flex gap-2 pt-1">
                      <button className="btn-primary" onClick={() => saveEditSession(session._id)}>Save Changes</button>
                      <button className="btn-outline" onClick={() => closeEditSession(session._id)}>Cancel</button>
                    </div>
                  </div>
                )}
                <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <p className="font-medium text-slate-800 mb-1">Student Check-in QR</p>
                  <p className="text-sm text-slate-500 mb-3">
                    Students should scan while signed in to their student account. The QR opens the attendance page and the app confirms attendance with the temporary token automatically.
                  </p>
                  {sessionQrCodes[session._id] ? (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <img
                        src={sessionQrCodes[session._id]}
                        alt={`Attendance QR for ${session.title}`}
                        className="w-40 h-40 rounded-lg border border-slate-200 bg-white p-2"
                      />
                      <div className="text-sm text-slate-600">
                        <p>Scan target: {buildAttendanceCheckInUrl(session.qrToken, ngrokBaseUrl)}</p>
                        <p>Fallback 6-digit code: {session.accessCode}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      QR is being generated or could not be generated for this session.
                    </p>
                  )}
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">Student Status List</p>
                    <p className="text-sm text-slate-500">
                      Pending students are shown first.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attendanceFilterOptions.map((option) => {
                      const isActive = activeFilter === option.key;
                      return (
                        <button
                          key={option.key}
                          className={
                            isActive
                              ? "rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
                              : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                          }
                          onClick={() => updateAttendanceFilter(session._id, option.key)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  {visibleRecords.map((record) => (
                  <div
                    key={record.student?._id}
                    className="rounded-lg bg-slate-50 p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <p className="font-medium text-slate-800">{record.student?.name}</p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${attendanceStatusClassMap[record.status] || attendanceStatusClassMap.pending}`}
                        >
                          {record.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {record.checkedInAt
                          ? `Confirmed at ${formatDateTime(record.checkedInAt)}`
                          : "No check-in confirmation yet"}
                        {record.checkInMethod
                          ? ` via ${checkInMethodLabelMap[record.checkInMethod] || record.checkInMethod}`
                          : ""}
                      </p>
                      <p className="text-sm text-slate-500">
                        Manual override allowed if student has technical problems or late confirmation from teacher.
                      </p>
                      {record.leaveRequest?.status === "pending" && (
                        <p className="text-sm text-amber-700">
                          Pending leave request: {record.leaveRequest.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-outline"
                        onClick={() => manualAttendance(session._id, record.student?._id, "present")}
                      >
                        Mark Present
                      </button>
                      <button
                        className="btn-outline"
                        onClick={() => manualAttendance(session._id, record.student?._id, "excused")}
                      >
                        Mark Excused
                      </button>
                      <button
                        className="btn-outline"
                        onClick={() => manualAttendance(session._id, record.student?._id, "absent")}
                      >
                        Mark Absent
                      </button>
                      {record.leaveRequest?.status === "pending" && (
                        <>
                          <button
                            className="btn-primary"
                            onClick={() => reviewLeave(session._id, record.student?._id, "approved")}
                          >
                            Approve Leave
                          </button>
                          <button
                            className="btn-outline"
                            onClick={() => reviewLeave(session._id, record.student?._id, "rejected")}
                          >
                            Reject Leave
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  ))}
                  {visibleRecords.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      No students match the current filter.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {sessions.length === 0 && <p className="text-slate-500">No attendance session created yet.</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section E. Council Reviewer Assignment and Scoring</h2>
          <p className="card-subtitle">
            Chairman assigns reviewer. Then council members and reviewer submit scores and comments.
          </p>
        </div>
        <div className="space-y-4">
          {councils.map((council) => (
            <div key={council._id} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-4">
                <p className="font-semibold text-slate-800">{council.name}</p>
                <p className="text-sm text-slate-500">
                  {formatDateTime(council.defenseDate)} | Room: {council.room || "N/A"}
                </p>
              </div>

              {(council.projects || []).map((projectItem) => {
                const key = `${council._id}-${projectItem.project?._id}`;
                return (
                  <div key={projectItem.project?._id} className="rounded-lg bg-slate-50 p-4 mb-3">
                    <p className="font-medium text-slate-800">
                      {getProjectDisplayName(projectItem.project)}
                    </p>
                    <p className="text-sm text-slate-500 mb-3">
                      Reviewer: {projectItem.reviewer?.name || "Not assigned yet"} | Weighted score:{" "}
                      {projectItem.weightedAverage ?? "N/A"}
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <p className="font-medium text-slate-700">Reviewer Assignment</p>
                        <p className="text-xs text-slate-500">
                          Only the chairman should assign the reviewer for each project in this council.
                        </p>
                        <select
                          className="input"
                          value={reviewerAssignments[key]?.reviewerId || ""}
                          onChange={(event) =>
                            updateReviewerAssignment(key, "reviewerId", event.target.value)
                          }
                        >
                          <option value="">Select reviewer teacher</option>
                          {teachers.map((teacher) => (
                            <option key={teacher._id} value={teacher._id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={reviewerAssignments[key]?.reviewerWeight || 1.5}
                          onChange={(event) =>
                            updateReviewerAssignment(key, "reviewerWeight", event.target.value)
                          }
                          placeholder="Reviewer score weight"
                        />
                        <button
                          className="btn-outline"
                          onClick={() => assignReviewer(council._id, projectItem.project?._id)}
                        >
                          Chairman Assigns Reviewer
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-slate-700">Council Score Entry</p>
                        <p className="text-xs text-slate-500">
                          Each council member enters their own score and comment. Chairman locks the final result after review.
                        </p>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Score"
                          value={scoreForms[key]?.score || ""}
                          onChange={(event) => updateScoreForm(key, "score", event.target.value)}
                        />
                        <textarea
                          className="input min-h-24"
                          placeholder="Score comment"
                          value={scoreForms[key]?.comment || ""}
                          onChange={(event) => updateScoreForm(key, "comment", event.target.value)}
                        />
                        <textarea
                          className="input min-h-20"
                          placeholder="Chairman final lock comment"
                          value={scoreForms[key]?.chairComment || ""}
                          onChange={(event) =>
                            updateScoreForm(key, "chairComment", event.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            className="btn-primary"
                            onClick={() => submitScore(council._id, projectItem.project?._id)}
                          >
                            Save Score
                          </button>
                          <button
                            className="btn-outline"
                            onClick={() => finalizeScore(council._id, projectItem.project?._id)}
                          >
                            Chairman Locks Final Score
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-slate-700">Reviewer Report</p>
                        <p className="text-xs text-slate-500">
                          The assigned reviewer writes the report here. The system exports it as a PDF file for project records.
                        </p>
                        <textarea
                          className="input min-h-20"
                          placeholder="Reviewer summary"
                          value={reviewerForms[key]?.summary || ""}
                          onChange={(event) =>
                            updateReviewerForm(key, "summary", event.target.value)
                          }
                        />
                        <textarea
                          className="input min-h-20"
                          placeholder="Project strengths"
                          value={reviewerForms[key]?.strengths || ""}
                          onChange={(event) =>
                            updateReviewerForm(key, "strengths", event.target.value)
                          }
                        />
                        <textarea
                          className="input min-h-20"
                          placeholder="Concerns or issues"
                          value={reviewerForms[key]?.concerns || ""}
                          onChange={(event) =>
                            updateReviewerForm(key, "concerns", event.target.value)
                          }
                        />
                        <textarea
                          className="input min-h-20"
                          placeholder="Recommendation"
                          value={reviewerForms[key]?.recommendation || ""}
                          onChange={(event) =>
                            updateReviewerForm(key, "recommendation", event.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            className="btn-outline"
                            onClick={() =>
                              submitReviewerFormAction(council._id, projectItem.project?._id)
                            }
                          >
                            Export Reviewer PDF
                          </button>
                          {projectItem.reviewerForm?.pdfUrl && (
                            <a
                              href={`${axiosInstance.defaults.baseURL}/teacher/councils/${council._id}/projects/${projectItem.project?._id}/reviewer-form/download`}
                              className="btn-outline inline-flex"
                            >
                              Download Reviewer PDF
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {councils.length === 0 && <p className="text-slate-500">You are not in any council yet.</p>}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="card-header">
          <h2 className="card-title">Section F. CLO Assessment Workspace</h2>
          <p className="card-subtitle">
            Score milestones M1-M6 by CLO rubric, review peer/ICS, and watch QA readiness before finalizing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TEACHER_ASSESSMENT_TABS.map((tab) => (
            <button
              key={tab.key}
              className={
                assessmentTab === tab.key
                  ? "rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
              }
              onClick={() => setAssessmentTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="label">Assessment Project</label>
            <select
              className="input"
              value={selectedAssessmentProject?._id || ""}
              onChange={(event) => setSelectedAssessmentProjectId(event.target.value)}
            >
              <option value="">Select supervised project</option>
              {projectOptions.map((project) => (
                <option key={project._id} value={project._id}>
                  {getProjectDisplayName(project)}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Current track / result</p>
            <p className="font-semibold text-slate-800">
              {selectedAssessmentSummary?.projectTrack || selectedAssessmentProject?.projectTrack || "capstone"} |{" "}
              {formatAssessmentScore(selectedAssessmentSummary?.teamFinalScore, "/10")} |{" "}
              {selectedAssessmentSummary?.teamPassStatus || "pending"}
            </p>
            <p className="text-sm text-slate-500">
              QA completeness: {selectedAssessmentSummary?.qaEvidenceSummary?.completenessPercent || 0}%
            </p>
          </div>
        </div>

        {!selectedAssessmentProject && (
          <p className="text-slate-500">Choose a supervised project to work with milestone CLO scoring.</p>
        )}

        {selectedAssessmentProject && assessmentTab === "M1" && (
          <div className="space-y-4">
            {["M1", "M2", "M3"].map((milestoneCode) => {
              const formKey = `${selectedAssessmentProject._id}:${milestoneCode}`;
              const milestoneSummary = selectedAssessmentSummary?.milestones?.find(
                (item) => item.code === milestoneCode,
              );
              const form = assessmentForms[formKey] || { entries: createRubricEntries(), overallComment: "" };

              return (
                <div key={milestoneCode} className="rounded-lg border border-slate-200 p-4 space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {milestoneCode}. {MILESTONE_LABELS[milestoneCode]}
                      </p>
                      <p className="text-sm text-slate-500">
                        Score: {formatAssessmentScore(milestoneSummary?.componentScore5, "/5")} | Status:{" "}
                        {milestoneSummary?.status || "pending"}
                      </p>
                    </div>
                    <button
                      className="btn-outline"
                      onClick={() =>
                        seedAssessmentFormFromSummary(
                          selectedAssessmentProject._id,
                          milestoneCode,
                          selectedAssessmentSummary,
                        )
                      }
                    >
                      Load Existing Submission
                    </button>
                  </div>

                  <RubricTable
                    entries={form.entries}
                    onChange={(cloCode, field, value) =>
                      updateAssessmentFormEntry(
                        selectedAssessmentProject._id,
                        milestoneCode,
                        cloCode,
                        field,
                        value,
                      )
                    }
                    title={`${milestoneCode} CLO Rubric`}
                  />

                  <textarea
                    className="input min-h-24"
                    placeholder={`Overall comment for ${milestoneCode}`}
                    value={form.overallComment || ""}
                    onChange={(event) =>
                      updateAssessmentOverallComment(
                        selectedAssessmentProject._id,
                        milestoneCode,
                        event.target.value,
                      )
                    }
                  />

                  <input
                    type="file"
                    multiple
                    onChange={(event) =>
                      updateAssessmentFiles(
                        selectedAssessmentProject._id,
                        milestoneCode,
                        event.target.files,
                      )
                    }
                  />

                  <button
                    className="btn-primary"
                    onClick={() => submitTeacherAssessment(selectedAssessmentProject._id, milestoneCode)}
                  >
                    Save {milestoneCode} Rubric
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {selectedAssessmentProject && assessmentTab === "M4" && (
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <div>
              <p className="font-semibold text-slate-800">M4. {MILESTONE_LABELS.M4}</p>
              <p className="text-sm text-slate-500">
                Use this section for report / thesis rubric before the defense milestone opens.
              </p>
            </div>

            <RubricTable
              entries={(assessmentForms[`${selectedAssessmentProject._id}:M4`] || { entries: createRubricEntries() }).entries}
              onChange={(cloCode, field, value) =>
                updateAssessmentFormEntry(
                  selectedAssessmentProject._id,
                  "M4",
                  cloCode,
                  field,
                  value,
                )
              }
              title="M4 CLO Rubric"
            />

            <textarea
              className="input min-h-24"
              placeholder="Overall comment for M4"
              value={assessmentForms[`${selectedAssessmentProject._id}:M4`]?.overallComment || ""}
              onChange={(event) =>
                updateAssessmentOverallComment(
                  selectedAssessmentProject._id,
                  "M4",
                  event.target.value,
                )
              }
            />
            <input
              type="file"
              multiple
              onChange={(event) =>
                updateAssessmentFiles(selectedAssessmentProject._id, "M4", event.target.files)
              }
            />
            <button
              className="btn-primary"
              onClick={() => submitTeacherAssessment(selectedAssessmentProject._id, "M4")}
            >
              Save M4 Rubric
            </button>
          </div>
        )}

        {assessmentTab === "M5" && (
          <div className="space-y-4">
            {councils.flatMap((council) =>
              (council.projects || []).map((projectItem) => {
                const assessmentSummary = projectItem.assessmentSummary;
                const projectId = projectItem.project?._id;
                const formKey = `${projectId}:M5`;
                const form = assessmentForms[formKey] || { entries: createRubricEntries(), overallComment: "" };

                return (
                  <div key={`${council._id}-${projectId}`} className="rounded-lg border border-slate-200 p-4 space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{getProjectDisplayName(projectItem.project)}</p>
                        <p className="text-sm text-slate-500">
                          {council.name} | Team result: {formatAssessmentScore(assessmentSummary?.teamFinalScore, "/10")}
                        </p>
                      </div>
                      <button
                        className="btn-outline"
                        onClick={() => seedAssessmentFormFromSummary(projectId, "M5", assessmentSummary)}
                      >
                        Load Existing M5 Submission
                      </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="font-medium text-slate-700 mb-2">Required Assessors</p>
                        <div className="space-y-2">
                          {(assessmentSummary?.milestones?.find((item) => item.code === "M5")?.requiredAssessors || []).map((assessor, index) => (
                            <div key={`${assessor.teacher?._id || assessor.teacher}-${index}`} className="rounded-lg bg-white p-3">
                              <p className="font-medium text-slate-700">
                                {assessor.teacher?.name || assessor.teacher || "Assessor"}
                              </p>
                              <p className="text-sm text-slate-500">
                                {assessor.role} | Weight {assessor.weight}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="xl:col-span-2 space-y-4">
                        <RubricTable
                          entries={form.entries}
                          onChange={(cloCode, field, value) =>
                            updateAssessmentFormEntry(projectId, "M5", cloCode, field, value)
                          }
                          title="M5 Council CLO Rubric"
                        />
                        <textarea
                          className="input min-h-24"
                          placeholder="Overall council comment / chair note"
                          value={form.overallComment || ""}
                          onChange={(event) =>
                            updateAssessmentOverallComment(projectId, "M5", event.target.value)
                          }
                        />
                        <input
                          type="file"
                          multiple
                          onChange={(event) => updateAssessmentFiles(projectId, "M5", event.target.files)}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg bg-slate-50 p-4">
                          <div>
                            <p className="text-xs uppercase text-slate-500">Reviewer form</p>
                            <p className="font-medium text-slate-700">
                              {projectItem.reviewerForm?.pdfUrl ? "Ready" : "Missing"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-slate-500">QA completeness</p>
                            <p className="font-medium text-slate-700">
                              {assessmentSummary?.qaEvidenceSummary?.completenessPercent || 0}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-slate-500">Missing items</p>
                            <p className="font-medium text-slate-700">
                              {assessmentSummary?.qaEvidenceSummary?.missingItems?.join(", ") || "None"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn-primary"
                            onClick={() => submitTeacherM5Assessment(council._id, projectId)}
                          >
                            Submit M5 CLO Rubric
                          </button>
                          <button
                            className="btn-outline"
                            onClick={() => finalizeCloAssessmentAction(council._id, projectId)}
                          >
                            Chairman Finalizes CLO Result
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }),
            )}
            {councils.length === 0 && <p className="text-slate-500">No councils available for M5 scoring.</p>}
          </div>
        )}

        {selectedAssessmentProject && assessmentTab === "M6" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">M6. {MILESTONE_LABELS.M6}</p>
              <p className="text-sm text-slate-500">
                Students submit peer / ICS evidence first. Supervisor approves or rejects each submission here.
              </p>
            </div>

            {(selectedAssessmentSummary?.studentAssessments || []).map((studentAssessment) => (
              <div
                key={studentAssessment.student?._id}
                className="rounded-lg border border-slate-200 p-4 space-y-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{studentAssessment.student?.name}</p>
                    <p className="text-sm text-slate-500">
                      M6 score: {formatAssessmentScore(studentAssessment.individualM6Score5, "/5")} | Final:{" "}
                      {formatAssessmentScore(studentAssessment.officialFinalScore, "/10")} |{" "}
                      {studentAssessment.officialPassStatus}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {studentAssessment.peerSubmission?.approvalStatus || "No submission"}
                  </span>
                </div>

                {studentAssessment.peerSubmission?.cloEntries?.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left">CLO</th>
                          <th className="px-3 py-2 text-left">Score</th>
                          <th className="px-3 py-2 text-left">Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {studentAssessment.peerSubmission.cloEntries.map((entry) => (
                          <tr key={`${studentAssessment.student?._id}-${entry.cloCode}`}>
                            <td className="px-3 py-2 font-medium text-slate-700">{entry.cloCode}</td>
                            <td className="px-3 py-2">{entry.score1to5}</td>
                            <td className="px-3 py-2">{entry.comment || "No comment"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <textarea
                  className="input min-h-20"
                  placeholder="Supervisor note for this M6 submission"
                  value={m6ReviewForms[studentAssessment.peerSubmission?._id]?.overallComment || ""}
                  onChange={(event) =>
                    updateM6ReviewForm(
                      studentAssessment.peerSubmission?._id,
                      "overallComment",
                      event.target.value,
                    )
                  }
                />
                <div className="flex gap-2">
                  <button
                    className="btn-primary"
                    disabled={!studentAssessment.peerSubmission?._id}
                    onClick={() =>
                      reviewM6Submission(
                        selectedAssessmentProject._id,
                        studentAssessment.peerSubmission?._id,
                        "approved",
                      )
                    }
                  >
                    Approve M6
                  </button>
                  <button
                    className="btn-outline"
                    disabled={!studentAssessment.peerSubmission?._id}
                    onClick={() =>
                      reviewM6Submission(
                        selectedAssessmentProject._id,
                        studentAssessment.peerSubmission?._id,
                        "rejected",
                      )
                    }
                  >
                    Reject M6
                  </button>
                </div>
              </div>
            ))}
            {(selectedAssessmentSummary?.studentAssessments || []).length === 0 && (
              <p className="text-slate-500">No student peer / ICS submissions yet.</p>
            )}
          </div>
        )}

        {selectedAssessmentProject && assessmentTab === "SUMMARY" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Team score</p>
                <p className="font-semibold text-slate-800">
                  {formatAssessmentScore(selectedAssessmentSummary?.teamFinalScore, "/10")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Pass status</p>
                <p className="font-semibold text-slate-800">
                  {selectedAssessmentSummary?.teamPassStatus || "pending"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">QA completeness</p>
                <p className="font-semibold text-slate-800">
                  {selectedAssessmentSummary?.qaEvidenceSummary?.completenessPercent || 0}%
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Template version</p>
                <p className="font-semibold text-slate-800">
                  {selectedAssessmentSummary?.templateVersion || "N/A"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 font-medium text-slate-700">Final CLO Status</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {(selectedAssessmentSummary?.cloResults || []).map((item) => (
                  <div key={item.cloCode} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-medium text-slate-800">{item.cloCode}</p>
                    <p className="text-sm text-slate-500">
                      {formatAssessmentScore(item.score5, "/5")} | {item.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 font-medium text-slate-700">Milestone Overview</p>
              <div className="space-y-2">
                {(selectedAssessmentSummary?.milestones || []).map((milestone) => (
                  <div
                    key={milestone.code}
                    className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {milestone.code}. {milestone.label}
                      </p>
                      <p className="text-sm text-slate-500">
                        Component: {formatAssessmentScore(milestone.componentScore5, "/5")} /{" "}
                        {formatAssessmentScore(milestone.componentScore10, "/10")}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-600">{milestone.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 font-medium text-slate-700">Missing QA Evidence</p>
              <p className="text-sm text-slate-500">
                {selectedAssessmentSummary?.qaEvidenceSummary?.missingItems?.join(", ") || "No missing items"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefenseHubPage;
