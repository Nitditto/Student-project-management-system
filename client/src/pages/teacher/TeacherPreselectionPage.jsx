import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { Search, Edit, Trash2, X } from "lucide-react";

const TeacherPreselectionPage = () => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [note, setNote] = useState("");
  const [candidateSearchQuery, setCandidateSearchQuery] = useState("");
  const [editingInvitation, setEditingInvitation] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const filteredCandidates = useMemo(() => {
    const query = candidateSearchQuery.trim().toLowerCase();
    return candidates.filter((student) => {
      return (
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.project?.groupName || "").toLowerCase().includes(query) ||
        (student.project?.title || "").toLowerCase().includes(query)
      );
    });
  }, [candidates, candidateSearchQuery]);

  const openEditModal = (invitation) => {
    setEditingInvitation(invitation);
    setEditNote(invitation.note || "");
    setShowEditModal(true);
  };

  const handleUpdateNote = async () => {
    if (!editingInvitation) return;
    try {
      await axiosInstance.put(`/teacher/preselections/${editingInvitation._id}`, {
        note: editNote,
      });
      toast.success("Preselection note updated");
      setShowEditModal(false);
      setEditingInvitation(null);
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update invitation note"
      );
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm("Are you sure you want to cancel this preselection invitation?")) {
      return;
    }
    try {
      await axiosInstance.delete(`/teacher/preselections/${invitationId}`);
      toast.success("Preselection invitation cancelled");
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to cancel invitation"
      );
    }
  };

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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Type to search student leader name or email..."
            value={candidateSearchQuery}
            onChange={(e) => setCandidateSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="input"
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
        >
          <option value="">Select student leader candidate ({filteredCandidates.length} found)</option>
          {filteredCandidates.map((student) => (
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
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    invitation.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : invitation.status === "accepted"
                        ? "bg-green-100 text-green-800"
                        : invitation.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-800"
                  }`}>
                    {invitation.status}
                  </span>
                  {invitation.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-50 transition-colors"
                        onClick={() => openEditModal(invitation)}
                        title="Edit Note"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-50 transition-colors"
                        onClick={() => handleCancelInvitation(invitation._id)}
                        title="Cancel Invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {invitation.note && (
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                  Note: {invitation.note}
                </p>
              )}
            </div>
          ))}
          {invitations.length === 0 && (
            <p className="text-slate-500">No preselection invitations sent yet.</p>
          )}
        </div>
      </div>

      {/* Edit Note Modal */}
      {showEditModal && editingInvitation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Edit Preselection Note
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-md bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-800">{editingInvitation.student?.name}</p>
                <p className="text-slate-500">{editingInvitation.student?.email}</p>
              </div>

              <div>
                <label className="label">Note</label>
                <textarea
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  className="input min-h-[120px]"
                  placeholder="Explain why you want to supervise this student or team."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button onClick={() => setShowEditModal(false)} className="btn-outline">
                  Cancel
                </button>
                <button onClick={handleUpdateNote} className="btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPreselectionPage;
