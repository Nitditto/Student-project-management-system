import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import QRCode from "qrcode";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
};

const getProjectDisplayName = (project) => project?.groupName || project?.title || "N/A";

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
  const [scoreForms, setScoreForms] = useState({});
  const [reviewerForms, setReviewerForms] = useState({});
  const [reviewerAssignments, setReviewerAssignments] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheduleRes, sessionRes, councilRes, studentsRes, usersRes] = await Promise.all([
        axiosInstance.get("/teacher/schedules"),
        axiosInstance.get("/teacher/attendance-sessions"),
        axiosInstance.get("/teacher/councils"),
        axiosInstance.get("/teacher/assigned-students"),
        axiosInstance.get("/teacher/teacher-directory"),
      ]);

      setSchedules(scheduleRes.data.data?.schedules || []);
      setSessions(sessionRes.data.data?.sessions || []);
      setCouncils(councilRes.data.data?.councils || []);
      setStudents(studentsRes.data.data?.students || []);
      setTeachers(
        usersRes.data.data?.teachers || [],
      );
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
    let isCancelled = false;

    const buildQrCodes = async () => {
      const entries = await Promise.all(
        (sessions || []).map(async (session) => {
          if (!session?.qrToken) {
            return [session?._id, null];
          }

          try {
            const qrDataUrl = await QRCode.toDataURL(session.qrToken, {
              width: 180,
              margin: 1,
            });
            return [session._id, qrDataUrl];
          } catch {
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
  }, [sessions]);

  const projectOptions = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      if (student.project?._id) {
        map.set(student.project._id, student.project);
      }
    });
    return Array.from(map.values());
  }, [students]);

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

    try {
      await axiosInstance.post("/teacher/attendance-sessions", attendanceForm);
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
          <h2 className="card-title">Section D. Attendance Sessions and Leave Review</h2>
        </div>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session._id} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3">
                <p className="font-semibold text-slate-800">{session.title}</p>
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
                  6-digit code: {session.accessCode} | QR token: {session.qrToken}
                </p>
              </div>
              <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="font-medium text-slate-800 mb-1">Student Check-in QR</p>
                <p className="text-sm text-slate-500 mb-3">
                  Students can scan this QR code to get the check-in token, then submit it on the student defense attendance page.
                </p>
                {sessionQrCodes[session._id] ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <img
                      src={sessionQrCodes[session._id]}
                      alt={`Attendance QR for ${session.title}`}
                      className="w-40 h-40 rounded-lg border border-slate-200 bg-white p-2"
                    />
                    <div className="text-sm text-slate-600">
                      <p>QR token value: {session.qrToken}</p>
                      <p>Fallback 6-digit code: {session.accessCode}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    QR is being generated or could not be generated for this session.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                {session.records.map((record) => (
                  <div
                    key={record.student?._id}
                    className="rounded-lg bg-slate-50 p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{record.student?.name}</p>
                      <p className="text-sm text-slate-500 capitalize">
                        Attendance status: {record.status}
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
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default DefenseHubPage;
