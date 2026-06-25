import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import RubricTable from "../../components/assessment/RubricTable";
import { useTranslation } from "react-i18next";
import {
  buildRubricPayload,
  createRubricEntries,
  formatAssessmentScore,
} from "../../lib/assessment";

const statusClassMap = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  excused: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const MyDefensePage = () => {
  const { t, i18n } = useTranslation();
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

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleString(i18n.language === "vi" ? "vi-VN" : "en-US");
  };

  const getDayOfWeekStr = (dateValue) => {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "";
    const day = d.getDay();
    const days = [
      t("student.defense.sun"),
      t("student.defense.mon"),
      t("student.defense.tue"),
      t("student.defense.wed"),
      t("student.defense.thu"),
      t("student.defense.fri"),
      t("student.defense.sat")
    ];
    return days[day];
  };

  const formatCouncilSchedule = (defenseDate, room) => {
    if (!defenseDate) return t("student.defense.notScheduled");
    const d = new Date(defenseDate);
    if (isNaN(d.getTime())) return t("student.defense.invalidSchedule");
    const dayName = getDayOfWeekStr(d);
    const dateStr = d.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = d.toLocaleTimeString(i18n.language === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" });
    const roomInfo = room ? t("student.defense.room", { room }) : t("student.defense.noRoomAssigned");
    
    if (i18n.language === "vi") {
      return `${dayName}, ngày ${dateStr} vào lúc ${timeStr} | ${roomInfo}`;
    } else {
      return `${dayName}, ${dateStr} at ${timeStr} | ${roomInfo}`;
    }
  };

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
    return <div className="card">{t("student.supervisor.loading")}</div>;
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
        <h1 className="text-2xl font-bold mb-2">{t("student.defense.headerTitle")}</h1>
        <p className="text-sky-100">
          {t("student.defense.headerDesc")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">{t("student.defense.teamProject")}</p>
          <p className="font-semibold text-slate-800">
            {project?.groupName || project?.title || t("student.defense.noProject")}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t("student.defense.currDefenseSlot")}</p>
          <p className="font-semibold text-slate-800">
            {selectedSchedule?.startAt ? formatDateTime(selectedSchedule.startAt) : t("student.defense.notSelected")}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t("student.defense.attendanceRate")}</p>
          <p className="font-semibold text-slate-800">
            {summary ? `${summary.attendanceRate}%` : "0%"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">{t("student.defense.finalScore")}</p>
          <p className="font-semibold text-slate-800">
            {project?.defenseFinalScore ?? t("student.defense.notFinalized")}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t("student.defense.secATitle")}</h2>
          <p className="card-subtitle">
            {t("student.defense.secASub")}
          </p>
        </div>

        {!isLeader && (
          <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-slate-700">
            {t("student.defense.repViewOnly", { name: project?.student?.name })}
          </div>
        )}

        {selectedSchedule?.slotId ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
              <p className="font-semibold text-slate-800">
                {t("student.defense.selectedSlot", { start: formatDateTime(selectedSchedule.startAt), end: formatDateTime(selectedSchedule.endAt) })}
              </p>
              <p className="text-sm text-slate-600">
                {t("student.defense.slotDetail", { location: selectedSchedule.location || t("student.defense.notSelected"), mode: selectedSchedule.mode || "N/A" })}
              </p>
            </div>
            {isLeader && (
              <>
                <textarea
                  className="input min-h-24 w-full"
                  placeholder={t("student.defense.rescheduleReason")}
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                />
                <button className="btn-outline" onClick={handleReschedule}>
                  {t("student.defense.releaseSlotBtn")}
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
                    {t("student.defense.pickDeadlineInfo", { date: formatDateTime(schedule.pickDeadline), hours: schedule.rescheduleWindowHours })}
                  </p>
                </div>
                <div className="space-y-2">
                  {(schedule.slots || []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      {t("student.defense.noSlotsLeft")}
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
                            {slot.location || t("student.defense.noRoomAssigned")} | {slot.mode}
                          </p>
                        </div>
                        {isLeader ? (
                          <button
                            className="btn-primary"
                            onClick={() => handlePickSlot(schedule._id, slot._id)}
                          >
                            {t("student.defense.pickSlotBtn")}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-500">{t("student.defense.repActionOnly")}</span>
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
            <h2 className="card-title">{t("student.defense.secBTitle")}</h2>
            <p className="card-subtitle">{summary?.formula}</p>
          </div>

          {qrToken && (
            <div className="mb-4 rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-cyan-800">
              <p>
                {qrCheckInStatus === "error"
                  ? qrCheckInError || t("student.defense.qrFailed")
                  : t("student.defense.qrProcessing")}
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
                  {t("student.defense.qrRetry")}
                </button>
              )}
            </div>
          )}

          {summary?.warning && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700">
              {t("student.defense.attendanceWarning")}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-500">{t("student.defense.totalSessions")}</p>
              <p className="text-xl font-semibold text-slate-800">
                {summary?.totalSessions || 0}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-500">{t("student.defense.presentExcused")}</p>
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
                      {status === "present"
                        ? t("student.defense.statusPresent")
                        : status === "absent"
                          ? t("student.defense.statusAbsent")
                          : status === "excused"
                            ? t("student.defense.statusExcused")
                            : t("student.defense.statusPending")}
                    </span>
                  </div>

                  {canConfirmByCode && (
                    <div className="mt-3 flex flex-col gap-3 md:flex-row">
                      <input
                        className="input"
                        placeholder={t("student.defense.codePlaceholder")}
                        value={codeInputs[session._id] || ""}
                        onChange={(event) => updateCodeField(session._id, event.target.value)}
                      />
                      <button className="btn-primary" onClick={() => handleCheckIn(session._id)}>
                        {t("student.defense.confirmCodeBtn")}
                      </button>
                    </div>
                  )}

                  {status === "present" && (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      {t("student.defense.attendanceConfirmed")}
                      {myRecord?.checkedInAt
                        ? ` ${t("student.defense.at", "at")} ${formatDateTime(myRecord.checkedInAt)}`
                        : ""}
                      {myRecord?.checkInMethod
                        ? ` ${t("student.defense.via")} ${
                            myRecord.checkInMethod === "qr"
                              ? t("student.defense.methodQr")
                              : myRecord.checkInMethod === "code"
                                ? t("student.defense.methodCode")
                                : t("student.defense.methodManual")
                          }`
                        : ""}
                      .
                    </div>
                  )}

                  {status === "excused" && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      {t("student.defense.excusedInfo")}
                    </div>
                  )}

                  {canRequestLeave && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 space-y-3">
                      <p className="font-medium text-slate-700">{t("student.defense.requestLeave")}</p>
                      <input
                        className="input"
                        placeholder={t("student.defense.leaveReason")}
                        value={form.reason || ""}
                        onChange={(event) =>
                          updateLeaveField(session._id, "reason", event.target.value)
                        }
                      />
                      <textarea
                        className="input min-h-20"
                        placeholder={t("student.defense.leaveNote")}
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
                        {t("student.defense.submitLeaveBtn")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {(!attendanceBoard?.sessions || attendanceBoard.sessions.length === 0) && (
              <p className="text-slate-500">{t("student.defense.noSessions")}</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t("student.defense.secCTitle")}</h2>
          </div>

          {!council ? (
            <p className="text-slate-500">{t("student.defense.noCouncilAssigned")}</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">{council.name}</p>
                <p className="text-sm text-slate-500">
                  {formatCouncilSchedule(council.defenseDate, council.room)}
                </p>
              </div>

              <div>
                <p className="mb-2 font-medium text-slate-700">{t("student.defense.councilMembers")}</p>
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
                      <span className="text-sm text-slate-500">{t("student.defense.weight", { weight: member.weight })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {councilProject && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <p className="font-medium text-slate-800">
                    {councilProject.reviewer?.name 
                      ? t("student.defense.reviewer", { name: councilProject.reviewer.name }) 
                      : t("student.defense.waitingChairman")}
                  </p>
                  <p className="text-sm text-slate-500">
                    {t("student.defense.councilScoringStatus", { status: councilProject.status })}
                  </p>
                  <p className="font-semibold text-slate-800">
                    {t("student.defense.weightedAverageScore", { score: councilProject.weightedAverage ?? "N/A" })}
                  </p>
                  {councilProject.reviewerForm?.pdfUrl && (
                    <a
                      href={`${axiosInstance.defaults.baseURL}/student/councils/${council._id}/projects/${project._id}/reviewer-form/download`}
                      className="btn-outline inline-flex"
                    >
                      {t("student.defense.downloadReviewerPdf")}
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
          <h2 className="card-title">{t("student.defense.secDTitle")}</h2>
          <p className="card-subtitle">
            {t("student.defense.secDSub")}
          </p>
        </div>

        {!assessmentSummary ? (
          <p className="text-slate-500">{t("student.defense.noAssessment")}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{t("student.defense.teamScore")}</p>
                <p className="font-semibold text-slate-800">
                  {formatAssessmentScore(assessmentSummary.teamFinalScore, "/10")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{t("student.defense.teamResult")}</p>
                <p className="font-semibold text-slate-800">{assessmentSummary.teamPassStatus}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{t("student.defense.myFinalScore")}</p>
                <p className="font-semibold text-slate-800">
                  {formatAssessmentScore(myAssessment?.officialFinalScore, "/10")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{t("student.defense.qaCompleteness")}</p>
                <p className="font-semibold text-slate-800">
                  {assessmentSummary.qaEvidenceSummary?.completenessPercent || 0}%
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 font-medium text-slate-700">{t("student.defense.milestoneTimeline")}</p>
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
                        {t("student.defense.score", "Component")}: {formatAssessmentScore(milestone.componentScore5, "/5")} /{" "}
                        {formatAssessmentScore(milestone.componentScore10, "/10")}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-600">{milestone.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 font-medium text-slate-700">{t("student.defense.finalCloStatus")}</p>
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
                <p className="font-medium text-slate-700">{t("student.defense.m6Title")}</p>
                <p className="text-sm text-slate-500">
                  {t("student.defense.m6Sub")}
                </p>
              </div>

              <RubricTable
                entries={peerForm.entries}
                onChange={updatePeerEntry}
                title={t("student.defense.m6RubricTitle")}
              />

              <textarea
                className="input min-h-24"
                placeholder={t("student.defense.peerNotePlaceholder")}
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
                  {t("student.defense.submitM6Btn")}
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                  {t("student.defense.currStatus", { status: myAssessment?.peerSubmission?.approvalStatus || t("student.defense.notSubmitted") })}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 font-medium text-slate-700">{t("student.defense.missingQaEvidence")}</p>
              <p className="text-sm text-slate-500">
                {assessmentSummary.qaEvidenceSummary?.missingItems?.join(", ") || t("student.defense.noMissingEvidence")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyDefensePage;
