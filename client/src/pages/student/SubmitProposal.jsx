import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

const SubmitProposal = () => {
  const { authUser } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    groupName: "",
    memberIds: [],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [setupRes, candidateRes] = await Promise.all([
        axiosInstance.get("/student/registration-setup"),
        axiosInstance.get("/student/group-candidates"),
      ]);
      setSetup(setupRes.data.data);
      setCandidates(candidateRes.data.data?.students || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load registration setup");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleMember = (studentId) => {
    setFormData((current) => {
      const exists = current.memberIds.includes(studentId);
      return {
        ...current,
        memberIds: exists
          ? current.memberIds.filter((id) => id !== studentId)
          : [...current.memberIds, studentId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.post("/student/project-proposal", formData);
      toast.success("Project proposal submitted");
      await loadData();
      setFormData({
        title: "",
        description: "",
        groupName: "",
        memberIds: [],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit proposal");
    } finally {
      setSaving(false);
    }
  };

  const respondInvitation = async (invitationId, decision) => {
    try {
      await axiosInstance.put(`/student/group-invitations/${invitationId}/respond`, {
        decision,
      });
      toast.success(`Invitation ${decision}`);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to respond invitation");
    }
  };

  if (loading) {
    return <div className="card">Loading registration setup...</div>;
  }

  const settings = setup?.settings;
  const project = setup?.project;
  const invitations = setup?.invitations || [];
  const incomingInvitations = invitations.filter(
    (invitation) =>
      invitation.invitee?._id === authUser?._id && invitation.status === "pending",
  );
  const outgoingInvitations = invitations.filter(
    (invitation) => invitation.inviter?._id === authUser?._id,
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Project Registration</h1>
        <p className="text-blue-100">
          Group representative creates the proposal and handles all registration procedures for the team.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Current Registration Policy</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Group Mode</p>
            <p className="font-semibold text-slate-800">
              {settings?.allowGroupProjects ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Group Size</p>
            <p className="font-semibold text-slate-800">
              {settings?.minGroupSize} - {settings?.maxGroupSize} students
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Representative Workflow</p>
            <p className="font-semibold text-slate-800">
              Leader handles proposal, supervisor selection, and defense slot
            </p>
          </div>
        </div>
        {settings?.notes && (
          <div className="mt-4 rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
            {settings.notes}
          </div>
        )}
      </div>

      {project ? (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Current Project Proposal</h2>
            <p className="card-subtitle">
              The student who created this proposal is the group representative.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Proposal Title</p>
              <p className="font-semibold text-slate-800">{project.title}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Group Name</p>
              <p className="font-semibold text-slate-800">
                {project.groupName || project.title}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Project Mode</p>
              <p className="font-semibold text-slate-800 capitalize">
                {project.projectMode}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Representative</p>
              <p className="font-semibold text-slate-800">{project.student?.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Members</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(project.members || []).map((member) => (
                  <span
                    key={member._id}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {member.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-6">
          <div className="card-header">
            <h2 className="card-title">Create New Project Proposal</h2>
            <p className="card-subtitle">
              Step 1: create the project. Step 2: invite members if this is a group project.
            </p>
          </div>

          <div>
            <label className="label">Proposal Title</label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(event) =>
                setFormData((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Example: AI-powered student project management assistant"
              required
            />
          </div>

          <div>
            <label className="label">Proposal Description</label>
            <textarea
              className="input min-h-[140px]"
              value={formData.description}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Describe the project scope, expected output, and core technology."
              required
            />
          </div>

          {settings?.allowGroupProjects && (
            <>
              <div>
                <label className="label">Group Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.groupName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      groupName: event.target.value,
                    }))
                  }
                  placeholder="Example: Team Orion"
                />
              </div>

              <div>
                <label className="label">Invite Group Members</label>
                <p className="text-sm text-slate-500 mb-3">
                  Pick students now. They will receive an invitation and can accept later.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidates.map((student) => (
                    <label
                      key={student._id}
                      className="rounded-lg border border-slate-200 p-3 flex items-start gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={formData.memberIds.includes(student._id)}
                        onChange={() => toggleMember(student._id)}
                      />
                      <div>
                        <p className="font-medium text-slate-800">{student.name}</p>
                        <p className="text-sm text-slate-500">{student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Submitting..." : "Create Project Proposal"}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Incoming Group Invitations</h2>
        </div>
        <div className="space-y-3">
          {incomingInvitations.map((invitation) => (
            <div
              key={invitation._id}
              className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  {invitation.project?.groupName || invitation.project?.title}
                </p>
                <p className="text-sm text-slate-500">
                  Representative: {invitation.inviter?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  onClick={() => respondInvitation(invitation._id, "accepted")}
                >
                  Accept Invitation
                </button>
                <button
                  className="btn-outline"
                  onClick={() => respondInvitation(invitation._id, "rejected")}
                >
                  Reject Invitation
                </button>
              </div>
            </div>
          ))}
          {incomingInvitations.length === 0 && (
            <p className="text-slate-500">No pending group invitations.</p>
          )}
        </div>
      </div>

      {outgoingInvitations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Outgoing Group Invitations Sent By Representative</h2>
          </div>
          <div className="space-y-3">
            {outgoingInvitations.map((invitation) => (
              <div key={invitation._id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-800">
                  {invitation.invitee?.name}
                </p>
                <p className="text-sm text-slate-500">{invitation.invitee?.email}</p>
                <p className="mt-2 text-sm capitalize text-slate-600">
                  Status: {invitation.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitProposal;
