import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

const TeacherPreselectionPage = () => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [note, setNote] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [candidateRes, invitationRes] = await Promise.all([
        axiosInstance.get("/teacher/preselection-candidates"),
        axiosInstance.get("/teacher/preselections"),
      ]);

      setCandidates(candidateRes.data.data?.students || []);
      setInvitations(invitationRes.data.data?.invitations || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load preselection workspace",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sendInvitation = async () => {
    try {
      await axiosInstance.post("/teacher/preselections", {
        studentId: selectedStudentId,
        note,
      });
      toast.success("Preselection invitation sent");
      setSelectedStudentId("");
      setNote("");
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send preselection invitation",
      );
    }
  };

  if (loading) {
    return <div className="card">Loading preselection workspace...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Teacher Preselection</h1>
        <p className="text-amber-100">
          Invite the group representative first. After that, students can accept or reject in their registration page.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="card-header">
          <h2 className="card-title">Send Preselection Invitation</h2>
          <p className="card-subtitle">
            Select the student leader only. Do not invite a regular group member.
          </p>
        </div>

        <select
          className="input"
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
        >
          <option value="">Select student leader candidate</option>
          {candidates.map((student) => (
            <option key={student._id} value={student._id}>
              {student.name} - {student.email}
              {student.project?.groupName
                ? ` - ${student.project.groupName}`
                : student.project?.title
                  ? ` - ${student.project.title}`
                  : ""}
            </option>
          ))}
        </select>

        <textarea
          className="input min-h-24"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note: why you want to supervise this student or team."
        />

        <div className="flex justify-end">
          <button
            className="btn-primary"
            onClick={sendInvitation}
            disabled={!selectedStudentId}
          >
            Send Preselection Invitation
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Preselection History</h2>
        </div>

        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div key={invitation._id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    {invitation.student?.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {invitation.student?.email}
                  </p>
                </div>
                <span className="text-sm capitalize text-slate-600">
                  Status: {invitation.status}
                </span>
              </div>
              {invitation.note && (
                <p className="mt-3 text-sm text-slate-600">{invitation.note}</p>
              )}
            </div>
          ))}
          {invitations.length === 0 && (
            <p className="text-slate-500">No preselection invitations sent yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherPreselectionPage;
