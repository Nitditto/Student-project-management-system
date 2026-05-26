import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

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

const MyDefensePage = () => {
  const { authUser } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [scheduleBoard, setScheduleBoard] = useState(null);
  const [attendanceBoard, setAttendanceBoard] = useState(null);
  const [councilBoard, setCouncilBoard] = useState(null);
  const [credential, setCredential] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [leaveForms, setLeaveForms] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheduleRes, attendanceRes, councilRes] = await Promise.all([
        axiosInstance.get("/student/schedule-board"),
        axiosInstance.get("/student/attendance-board"),
        axiosInstance.get("/student/council-board"),
      ]);
      setScheduleBoard(scheduleRes.data.data);
      setAttendanceBoard(attendanceRes.data.data);
      setCouncilBoard(councilRes.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load defense workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleCheckIn = async (sessionId) => {
    try {
      await axiosInstance.post(`/student/attendance/${sessionId}/check-in`, {
        credential,
      });
      toast.success("Attendance check-in successful");
      setCredential("");
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

  if (loading) {
    return <div className="card">Loading defense workspace...</div>;
  }

  const project = scheduleBoard?.project || attendanceBoard?.project || councilBoard?.project;
  const summary = attendanceBoard?.summary;
  const selectedSchedule = project?.selectedSchedule;
  const council = councilBoard?.council;
  const isLeader = project?.student?._id === authUser?._id;
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

                  {session.status === "active" && (
                    <div className="mt-3 flex flex-col gap-3 md:flex-row">
                      <input
                        className="input"
                        placeholder="Enter 6-digit code or QR token"
                        value={credential}
                        onChange={(event) => setCredential(event.target.value)}
                      />
                      <button className="btn-primary" onClick={() => handleCheckIn(session._id)}>
                        Check In Now
                      </button>
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
    </div>
  );
};

export default MyDefensePage;
