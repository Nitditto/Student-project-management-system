import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import RubricTable from "../../components/assessment/RubricTable";
import {
  buildRubricPayload,
  createRubricEntries,
  formatAssessmentScore,
} from "../../lib/assessment";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
};

const statusClassMap = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  excused: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const checkInMethodLabelMap = {
  qr: "QR scan",
  code: "teacher code",
  manual: "manual confirmation",
};

const MyDefensePage = () => {
  const { authUser } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [scheduleBoard, setScheduleBoard] = useState(null);
  const [attendanceBoard, setAttendanceBoard] = useState(null);
  const [councilBoard, setCouncilBoard] = useState(null);
  const [assessmentBoard, setAssessmentBoard] = useState(null);
  const [codeInputs, setCodeInputs] = useState({});
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [leaveForms, setLeaveForms] = useState({});
  const [peerForm, setPeerForm] = useState({
    entries: createRubricEntries(),
    overallComment: "",
    files: [],
  });
  const [qrCheckInStatus, setQrCheckInStatus] = useState("idle");
  const [qrCheckInError, setQrCheckInError] = useState("");
  const processedQrTokenRef = useRef(null);
  const qrToken = searchParams.get("token");

  const clearQrTokenFromUrl = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("token");
    navigate(
      {
        pathname: "/student/defense",
        search: nextParams.toString() ? `?${nextParams.toString()}` : "",
      },
      { replace: true },
    );
  }, [navigate, searchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleRes, attendanceRes, councilRes, assessmentRes] = await Promise.all([
        axiosInstance.get("/student/schedule-board"),
        axiosInstance.get("/student/attendance-board"),
        axiosInstance.get("/student/council-board"),
        axiosInstance.get("/student/assessment-board"),
      ]);
      setScheduleBoard(scheduleRes.data.data);
      setAttendanceBoard(attendanceRes.data.data);
      setCouncilBoard(councilRes.data.data);
      setAssessmentBoard(assessmentRes.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load defense workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePickSlot = async (scheduleId, slotId) => {
    try {
      await axiosInstance.post(`/student/schedules/${scheduleId}/slots/${slotId}/pick`);
      toast.success("Defense slot selected");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to select defense slot");
    }
  };

  const handleReschedule = async () => {
    const selection = scheduleBoard?.project?.selectedSchedule;
    if (!selection?.scheduleId || !selection?.slotId) return;

    try {
      await axiosInstance.post(
        `/student/schedules/${selection.scheduleId}/slots/${selection.slotId}/reschedule`,
        { reason: rescheduleReason },
      );
      toast.success("Current defense slot released");
      setRescheduleReason("");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reschedule");
    }
  };

  const updateCodeField = (sessionId, value) => {
    setCodeInputs((current) => ({
      ...current,
      [sessionId]: value,
    }));
  };

  const handleCheckIn = async (sessionId) => {
    const accessCode = codeInputs[sessionId]?.trim();
    if (!accessCode) {
      toast.error("Please enter the 6-digit attendance code");
      return;
    }

    try {
      await axiosInstance.post(`/student/attendance/${sessionId}/check-in`, {
        accessCode,
      });
      toast.success("Attendance confirmed successfully");
      setCodeInputs((current) => ({
        ...current,
        [sessionId]: "",
      }));
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to check in");
    }
  };

  const updateLeaveField = (sessionId, field, value) => {
    setLeaveForms((current) => ({
      ...current,
      [sessionId]: {
        ...(current[sessionId] || {}),
        [field]: value,
      },
    }));
  };

  const handleLeaveRequest = async (sessionId) => {
    const form = leaveForms[sessionId] || {};
    const payload = new FormData();
    payload.append("reason", form.reason || "");
    payload.append("note", form.note || "");
    for (const file of form.files || []) {
      payload.append("evidence", file);
    }

    try {
      await axiosInstance.post(
        `/student/attendance/${sessionId}/request-leave`,
        payload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      toast.success("Leave request submitted");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit leave request");
    }
  };

  const handleQrCheckIn = useCallback(async (token, processedKey) => {
    setQrCheckInStatus("processing");
    setQrCheckInError("");

    try {
      await axiosInstance.post("/student/attendance/check-in", {
        token,
      });
      sessionStorage.setItem(processedKey, "done");
      setQrCheckInStatus("success");
      toast.success("Attendance confirmed from QR scan");
      await loadData();
      clearQrTokenFromUrl();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to confirm attendance from QR scan";
      processedQrTokenRef.current = null;
      setQrCheckInStatus("error");
      setQrCheckInError(message);
      toast.error(message);
    }
  }, [clearQrTokenFromUrl, loadData]);

  useEffect(() => {
    if (!authUser?._id || !qrToken) {
      return;
    }
    const processedKey = `attendance-qr:${authUser._id}:${qrToken}`;
    if (
      processedQrTokenRef.current === qrToken ||
      sessionStorage.getItem(processedKey) === "done"
    ) {
      setQrCheckInStatus("success");
      clearQrTokenFromUrl();
      return;
    }

    processedQrTokenRef.current = qrToken;
    handleQrCheckIn(qrToken, processedKey);
  }, [authUser?._id, clearQrTokenFromUrl, handleQrCheckIn, qrToken]);

  useEffect(() => {
    if (!assessmentBoard?.myAssessment?.peerSubmission?.cloEntries?.length) {
      return;
    }

    const byCode = new Map(
      assessmentBoard.myAssessment.peerSubmission.cloEntries.map((item) => [item.cloCode, item]),
    );
    setPeerForm((current) => ({
      ...current,
      entries: current.entries.map((entry) => ({
        ...entry,
        score1to5: byCode.get(entry.cloCode)?.score1to5 ?? entry.score1to5,
        comment: byCode.get(entry.cloCode)?.comment ?? entry.comment,
      })),
      overallComment:
        assessmentBoard.myAssessment.peerSubmission.overallComment || current.overallComment,
    }));
  }, [assessmentBoard?.myAssessment?.peerSubmission]);

  const updatePeerEntry = (cloCode, field, value) => {
    setPeerForm((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.cloCode === cloCode ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const submitPeerEvaluation = async () => {
    if (!assessmentBoard?.project?._id) return;

    const payload = new FormData();
    payload.append("cloEntries", JSON.stringify(buildRubricPayload(peerForm.entries)));
    payload.append("overallComment", peerForm.overallComment || "");
    (peerForm.files || []).forEach((file) => payload.append("files", file));

    try {
      await axiosInstance.post(
        `/student/projects/${assessmentBoard.project._id}/peer-evaluations`,
        payload,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success("Peer / ICS submission saved");
      setPeerForm({
        entries: createRubricEntries(),
        overallComment: "",
        files: [],
      });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit peer / ICS");
    }
  };

  if (loading) {
    return <div className="card">Loading defense workspace...</div>;
  }

  const project = scheduleBoard?.project || attendanceBoard?.project || councilBoard?.project;
  const summary = attendanceBoard?.summary;
  const selectedSchedule = project?.selectedSchedule;
  const council = councilBoard?.council;
  const isLeader = project?.student?._id === authUser?._id;
  const assessmentSummary = assessmentBoard?.assessment;
  const myAssessment = assessmentBoard?.myAssessment;
  const councilProject = council?.projects?.find(
    (item) => item.project?._id === project?._id,
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Defense Schedule, Attendance, and Council Result</h1>
        <p className="text-sky-100">
          Follow the team defense slot, personal attendance records, and the final council outcome.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Team / Project</p>
          <p className="font-semibold text-slate-800">
            {project?.groupName || project?.title || "No project"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Current Defense Slot</p>
          <p className="font-semibold text-slate-800">
            {selectedSchedule?.startAt ? formatDateTime(selectedSchedule.startAt) : "Not selected"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Attendance Rate</p>
          <p className="font-semibold text-slate-800">
            {summary ? `${summary.attendanceRate}%` : "0%"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Final Defense Score</p>
          <p className="font-semibold text-slate-800">
            {project?.defenseFinalScore ?? "Not finalized"}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Section A. Team Defense Slot Selection</h2>
          <p className="card-subtitle">
            Only the group representative can pick or reschedule the slot for the whole team.
          </p>
        </div>

        {!isLeader && (
          <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-slate-700">
            Representative: <strong>{project?.student?.name}</strong>. You can view the slot but cannot change it.
          </div>
        )}

        {selectedSchedule?.slotId ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
              <p className="font-semibold text-slate-800">
                Selected slot: {formatDateTime(selectedSchedule.startAt)} -{" "}
                {formatDateTime(selectedSchedule.endAt)}
              </p>
              <p className="text-sm text-slate-600">
                Location: {selectedSchedule.location || "Not set"} | Mode:{" "}
                {selectedSchedule.mode || "N/A"}
              </p>
            </div>
            {isLeader && (
              <>
                <textarea
                  className="input min-h-24 w-full"
                  placeholder="Reason for reschedule"
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                />
                <button className="btn-outline" onClick={handleReschedule}>
                  Release Current Slot For Reschedule
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(scheduleBoard?.schedules || []).map((schedule) => (
              <div key={schedule._id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-1 mb-3">
                  <h3 className="font-semibold text-slate-800">{schedule.title}</h3>
                  <p className="text-sm text-slate-500">
                    Pick deadline: {formatDateTime(schedule.pickDeadline)} | Reschedule locked {schedule.rescheduleWindowHours} hours before defense
                  </p>
                </div>
                <div className="space-y-2">
                  {(schedule.slots || []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No visible slot left. The system may already auto-assign after the deadline.
                    </p>
                  ) : (
                    schedule.slots.map((slot) => (
                      <div
                        key={slot._id}
                        className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {slot.location || "No location"} | {slot.mode}
                          </p>
                        </div>
                        {isLeader ? (
                          <button
                            className="btn-primary"
                            onClick={() => handlePickSlot(schedule._id, slot._id)}
                          >
                            Representative Picks This Slot
                          </button>
                        ) : (
                          <span className="text-sm text-slate-500">Representative action only</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Section B. Personal Attendance Record</h2>
            <p className="card-subtitle">{summary?.formula}</p>
          </div>

          {qrToken && (
            <div className="mb-4 rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-cyan-800">
              <p>
                {qrCheckInStatus === "error"
                  ? qrCheckInError || "QR attendance confirmation failed."
                  : "Processing the QR attendance confirmation for your signed-in student account."}
              </p>
              {qrCheckInStatus === "error" && authUser?._id && (
                <button
                  className="mt-3 btn-outline"
                  onClick={() => {
                    const processedKey = `attendance-qr:${authUser._id}:${qrToken}`;
                    processedQrTokenRef.current = qrToken;
                    handleQrCheckIn(qrToken, processedKey);
                  }}
                >
                  Retry QR Check-in
                </button>
              )}
            </div>
          )}

          {summary?.warning && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700">
              Warning: your attendance rate is below 70%.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Total Sessions</p>
              <p className="text-xl font-semibold text-slate-800">
                {summary?.totalSessions || 0}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Present + Excused</p>
              <p className="text-xl font-semibold text-slate-800">
                {(summary?.presentSessions || 0) + (summary?.excusedSessions || 0)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {(attendanceBoard?.sessions || []).map((session) => {
              const myRecord = session.records?.find(
                (item) => item.student?._id === authUser?._id,
              );
              const status = myRecord?.status || "pending";
              const canConfirmByCode =
                session.status === "active" && status === "pending";
              const form = leaveForms[session._id] || {};
              const canRequestLeave = new Date(session.startsAt) > new Date();

              return (
                <div key={session._id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{session.title}</p>
                      <p className="text-sm text-slate-500">
                        {formatDateTime(session.startsAt)} - {formatDateTime(session.endsAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClassMap[status] || statusClassMap.pending}`}
                    >
                      {status}
                    </span>
                  </div>

                  {canConfirmByCode && (
                    <div className="mt-3 flex flex-col gap-3 md:flex-row">
                      <input
                        className="input"
                        placeholder="Enter 6-digit teacher code if QR scan is unavailable"
                        value={codeInputs[session._id] || ""}
                        onChange={(event) => updateCodeField(session._id, event.target.value)}
                      />
                      <button className="btn-primary" onClick={() => handleCheckIn(session._id)}>
                        Confirm With Code
                      </button>
                    </div>
                  )}

                  {status === "present" && (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      Attendance confirmed
                      {myRecord?.checkedInAt
                        ? ` at ${formatDateTime(myRecord.checkedInAt)}`
                        : ""}
                      {myRecord?.checkInMethod
                        ? ` via ${checkInMethodLabelMap[myRecord.checkInMethod] || myRecord.checkInMethod}`
                        : ""}
                      .
                    </div>
                  )}

                  {status === "excused" && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      This session was marked as excused. No further check-in is required.
                    </div>
                  )}

                  {canRequestLeave && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 space-y-3">
                      <p className="font-medium text-slate-700">Request Leave For This Session</p>
                      <input
                        className="input"
                        placeholder="Leave reason"
                        value={form.reason || ""}
                        onChange={(event) =>
                          updateLeaveField(session._id, "reason", event.target.value)
                        }
                      />
                      <textarea
                        className="input min-h-20"
                        placeholder="Additional note"
                        value={form.note || ""}
                        onChange={(event) =>
                          updateLeaveField(session._id, "note", event.target.value)
                        }
                      />
                      <input
                        type="file"
                        multiple
                        onChange={(event) =>
                          updateLeaveField(
                            session._id,
                            "files",
                            Array.from(event.target.files || []),
                          )
                        }
                      />
                      <button className="btn-outline" onClick={() => handleLeaveRequest(session._id)}>
                        Submit Leave Request
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {(!attendanceBoard?.sessions || attendanceBoard.sessions.length === 0) && (
              <p className="text-slate-500">No attendance session yet.</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Section C. Defense Council Result</h2>
          </div>

          {!council ? (
            <p className="text-slate-500">This project has not been assigned to a defense council yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">{council.name}</p>
                <p className="text-sm text-slate-500">
                  {formatDateTime(council.defenseDate)} | Room: {council.room || "N/A"}
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-700">Council Members</p>
                <div className="space-y-2">
                  {(council.members || []).map((member) => (
                    <div
                      key={member.teacher?._id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{member.teacher?.name}</p>
                        <p className="text-sm text-slate-500 capitalize">{member.role}</p>
                      </div>
                      <span className="text-sm text-slate-500">Weight {member.weight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {councilProject && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <p className="font-medium text-slate-800">
                    Reviewer: {councilProject.reviewer?.name || "Waiting for chairman assignment"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Council scoring status: {councilProject.status}
                  </p>
                  <p className="font-semibold text-slate-800">
                    Weighted average score: {councilProject.weightedAverage ?? "N/A"}
                  </p>
                  {councilProject.reviewerForm?.pdfUrl && (
                    <a
                      href={`${axiosInstance.defaults.baseURL}/student/councils/${council._id}/projects/${project._id}/reviewer-form/download`}
                      className="btn-outline inline-flex"
                    >
                      Download Reviewer PDF
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="card-header">
          <h2 className="card-title">Section D. CLO Assessment and QA Evidence</h2>
          <p className="card-subtitle">
            Track milestone progress, final CLO status, and submit your peer / ICS package for M6.
          </p>
        </div>

        {!assessmentSummary ? (
          <p className="text-slate-500">CLO assessment has not been initialized for this project yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Team score</p>
                <p className="font-semibold text-slate-800">
                  {formatAssessmentScore(assessmentSummary.teamFinalScore, "/10")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Team result</p>
                <p className="font-semibold text-slate-800">{assessmentSummary.teamPassStatus}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">My final score</p>
                <p className="font-semibold text-slate-800">
                  {formatAssessmentScore(myAssessment?.officialFinalScore, "/10")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">QA completeness</p>
                <p className="font-semibold text-slate-800">
                  {assessmentSummary.qaEvidenceSummary?.completenessPercent || 0}%
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 font-medium text-slate-700">Milestone Timeline</p>
              <div className="space-y-2">
                {(assessmentSummary.milestones || []).map((milestone) => (
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
              <p className="mb-3 font-medium text-slate-700">Final CLO Status</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {(assessmentSummary.cloResults || []).map((item) => (
                  <div key={item.cloCode} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-medium text-slate-800">{item.cloCode}</p>
                    <p className="text-sm text-slate-500">
                      {formatAssessmentScore(item.score5, "/5")} | {item.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 space-y-4">
              <div>
                <p className="font-medium text-slate-700">M6 Peer / ICS Submission</p>
                <p className="text-sm text-slate-500">
                  Submit your individual evidence for teamwork, communication, and innovation CLOs.
                </p>
              </div>

              <RubricTable
                entries={peerForm.entries}
                onChange={updatePeerEntry}
                title="My M6 CLO Rubric"
              />

              <textarea
                className="input min-h-24"
                placeholder="Overall peer / ICS note"
                value={peerForm.overallComment}
                onChange={(event) =>
                  setPeerForm((current) => ({ ...current, overallComment: event.target.value }))
                }
              />

              <input
                type="file"
                multiple
                onChange={(event) =>
                  setPeerForm((current) => ({
                    ...current,
                    files: Array.from(event.target.files || []),
                  }))
                }
              />

              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={submitPeerEvaluation}>
                  Submit M6 Peer / ICS
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                  Current status: {myAssessment?.peerSubmission?.approvalStatus || "not submitted"}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 font-medium text-slate-700">Missing QA Evidence</p>
              <p className="text-sm text-slate-500">
                {assessmentSummary.qaEvidenceSummary?.missingItems?.join(", ") || "No missing evidence items"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyDefensePage;
