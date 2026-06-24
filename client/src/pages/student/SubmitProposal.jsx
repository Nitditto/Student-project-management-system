import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import {
  Crown,
  UserMinus,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  X,
  Shield,
  ChevronDown,
  Search,
  Plus,
} from "lucide-react";

const SubmitProposal = () => {
  const { authUser } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    groupName: "",
    memberIds: [],
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState({ duplicates: [], supervisors: [] });
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!formData.title.trim() && !formData.description.trim() && !file) {
      setAiData({ duplicates: [], supervisors: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setAiLoading(true);
      try {
        const data = new FormData();
        data.append("title", formData.title);
        data.append("description", formData.description);
        if (file) {
          data.append("file", file);
        }
        
        const res = await axiosInstance.post("/ai/analyze-proposal", data, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        if (res.data && res.data.success) {
          setAiData(res.data.data);
        }
      } catch (error) {
        console.error("AI Analysis failed:", error);
      } finally {
        setAiLoading(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.title, formData.description, file]);

  // Leader action modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showKickModal, setShowKickModal] = useState(false);
  const [showDisbandModal, setShowDisbandModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleAddByEmail = () => {
    const trimmedEmail = searchEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Please enter a student email");
      return;
    }

    const student = candidates.find(
      (c) => c.email.toLowerCase() === trimmedEmail
    );

    if (!student) {
      toast.error("No eligible student found with this email");
      return;
    }

    if (formData.memberIds.includes(student._id)) {
      toast.warning("This student is already in your group selection");
      return;
    }

    const maxGroupSize = setup?.settings?.maxGroupSize || 3;
    if (formData.memberIds.length + 1 >= maxGroupSize) {
      toast.error(`Maximum group size is ${maxGroupSize} students (including yourself).`);
      return;
    }

    toggleMember(student._id);
    setSearchEmail("");
    toast.success(`Added ${student.name} to the group selection`);
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

  // ---- Leader Actions ----

  const handleTransferLeadership = async () => {
    if (!selectedMember || !project) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(`/student/projects/${project._id}/transfer-leadership`, {
        newLeaderId: selectedMember._id,
      });
      toast.success("Leadership transferred successfully");
      setShowTransferModal(false);
      setSelectedMember(null);
      await loadData();
    } catch (error) {
      console.error("TRANSFER ERROR:", error);
      console.error("RESPONSE DATA:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to transfer leadership");
    } finally {
      setActionLoading(false);
    }
  };

  const handleKickMember = async () => {
    if (!selectedMember || !project) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(`/student/projects/${project._id}/kick-member`, {
        memberId: selectedMember._id,
      });
      toast.success("Member removed from group");
      setShowKickModal(false);
      setSelectedMember(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisbandGroup = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      await axiosInstance.delete(`/student/projects/${project._id}/disband`);
      toast.success("Group has been disbanded");
      setShowDisbandModal(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to disband group");
    } finally {
      setActionLoading(false);
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

  const isLeader = project?.student?._id === authUser?._id;
  const hasSupervisor = !!project?.supervisor;
  const otherMembers = (project?.members || []).filter(
    (m) => m._id !== authUser?._id,
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
          <div className="card-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="card-title">Current Project Proposal</h2>
              <p className="card-subtitle">
                {isLeader
                  ? "You are the group representative (Leader)."
                  : `Group representative: ${project.student?.name}`}
              </p>
            </div>

            {/* Leader Actions Dropdown */}
            {isLeader && project.projectMode === "group" && (
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                  onClick={() => setActionsOpen(!actionsOpen)}
                >
                  <Shield className="w-4 h-4" />
                  Leader Actions
                  <ChevronDown className={`w-4 h-4 transition-transform ${actionsOpen ? "rotate-180" : ""}`} />
                </button>

                {actionsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-20 py-1">
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                      onClick={() => {
                        setActionsOpen(false);
                        setShowTransferModal(true);
                      }}
                    >
                      <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                      Transfer Leadership
                    </button>
                    {!hasSupervisor && (
                      <>
                        <button
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                          onClick={() => {
                            setActionsOpen(false);
                            setShowKickModal(true);
                          }}
                        >
                          <UserMinus className="w-4 h-4 text-orange-500" />
                          Remove a Member
                        </button>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                          onClick={() => {
                            setActionsOpen(false);
                            setShowDisbandModal(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Disband Group
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
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
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-slate-500">Project Mode</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${project.projectMode === "group" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                  {project.projectMode === "group" ? "Group" : "Individual"}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-yellow-100 text-yellow-800 capitalize">
                  {project.status}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500">Representative (Leader)</p>
              <div className="mt-1 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <p className="font-semibold text-slate-800">{project.student?.name}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2">Members</p>
              <div className="flex flex-wrap gap-2">
                {(project.members || []).map((member) => {
                  const memberIsLeader = member._id === project.student?._id;
                  return (
                    <span
                      key={member._id}
                      className={`rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                        memberIsLeader
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {memberIsLeader && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                      {member.name}
                    </span>
                  );
                })}
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

          <div>
            <label className="label">Outline Draft (Optional PDF/DOCX/TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="border border-slate-200 p-2 rounded-lg w-full bg-white text-sm"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] || null : null)}
            />
          </div>

          {/* AI Feedback Section */}
          {(formData.title.trim() || formData.description.trim() || file) && (
            <div className="card space-y-6">
              {/* Header */}
              <div className="card-header flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="card-title flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${aiLoading ? "animate-ping bg-blue-400" : "bg-slate-300"}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${aiLoading ? "bg-blue-500" : "bg-slate-400"}`}></span>
                    </span>
                    AI Real-time Assistant
                  </h3>
                  <p className="card-subtitle">AI-powered similarity check & mentor recommendation</p>
                </div>
                {aiLoading ? (
                  <span className="text-xs text-blue-600 font-medium animate-pulse">Analyzing...</span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Ready</span>
                )}
              </div>

              {/* Duplicate Detection */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Duplicate Check</h4>
                {aiData.duplicates && aiData.duplicates.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>Found similar previous project proposals. Please review to avoid duplicates.</span>
                    </div>
                    <div className="space-y-2">
                      {aiData.duplicates.map((item, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg flex justify-between items-center text-sm shadow-sm">
                          <div>
                            <p className="font-semibold text-slate-800">{item.title}</p>
                            <p className="text-xs text-slate-500">Student: {item.student} | Status: {item.status}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${item.score > 0.7 ? "bg-red-500" : "bg-yellow-500"}`}
                                style={{ width: `${Math.round(item.score * 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.score > 0.7 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {Math.round(item.score * 100)}% Match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-green-600 font-medium">✓ No similar projects found. Your topic seems unique!</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* Recommended Mentors */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Recommended Supervisors</h4>
                {aiData.supervisors && aiData.supervisors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiData.supervisors.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h5 className="font-semibold text-slate-800 text-sm">{item.name}</h5>
                              <p className="text-xs text-slate-500">{item.department || "General Department"}</p>
                            </div>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full flex-shrink-0">
                              {Math.round(item.score * 100)}% Fit
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-slate-300 pl-2.5 my-2">
                            "{item.aiSummary || "Recommended based on similar academic focus areas."}"
                          </p>
                        </div>

                        {item.experties && item.experties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {item.experties.slice(0, 3).map((exp, eidx) => (
                              <span 
                                key={eidx} 
                                className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5"
                              >
                                {exp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Provide more details to see supervisor recommendations.</p>
                )}
              </div>
            </div>
          )}

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
                  Search for a student by their exact email address to add them to your group selection.
                </p>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className="input pl-9"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddByEmail();
                        }
                      }}
                      placeholder="Enter student's exact email address..."
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary flex items-center gap-1.5"
                    onClick={handleAddByEmail}
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {formData.memberIds.length > 0 && (
                  <div className="space-y-2.5 mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Selected Members ({formData.memberIds.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {formData.memberIds.map((id) => {
                        const student = candidates.find((c) => c._id === id);
                        if (!student) return null;
                        return (
                          <div
                            key={student._id}
                            className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex items-center justify-between shadow-sm animate-fadeIn"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">{student.name}</p>
                              <p className="text-xs text-slate-500">{student.email}</p>
                            </div>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                              onClick={() => toggleMember(student._id)}
                              title="Remove Member"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

      {/* ===== MODALS ===== */}

      {/* Transfer Leadership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                Transfer Leadership
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowTransferModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Select a member to become the new group leader. You will remain as a regular member.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {otherMembers.map((member) => (
                <label
                  key={member._id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMember?._id === member._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="newLeader"
                    checked={selectedMember?._id === member._id}
                    onChange={() => setSelectedMember(member)}
                  />
                  <div>
                    <p className="font-medium text-slate-800">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200" onClick={() => setShowTransferModal(false)}>
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={!selectedMember || actionLoading}
                onClick={handleTransferLeadership}
              >
                {actionLoading ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Member Modal */}
      {showKickModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowKickModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-orange-500" />
                Remove Member
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowKickModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Select a member to remove from the group. Project files will be preserved.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {otherMembers.map((member) => (
                <label
                  key={member._id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMember?._id === member._id
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="kickMember"
                    checked={selectedMember?._id === member._id}
                    onChange={() => setSelectedMember(member)}
                  />
                  <div>
                    <p className="font-medium text-slate-800">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200" onClick={() => setShowKickModal(false)}>
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                disabled={!selectedMember || actionLoading}
                onClick={handleKickMember}
              >
                {actionLoading ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disband Group Modal */}
      {showDisbandModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDisbandModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Disband Group
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowDisbandModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">
                This action is irreversible!
              </p>
              <ul className="text-sm text-red-700 list-disc pl-4 space-y-1">
                <li>The project and all uploaded files will be permanently deleted</li>
                <li>All members will be removed from the group</li>
                <li>All pending invitations will be cancelled</li>
              </ul>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Project: <strong>{project?.title}</strong>
            </p>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200" onClick={() => setShowDisbandModal(false)}>
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={actionLoading}
                onClick={handleDisbandGroup}
              >
                {actionLoading ? "Disbanding..." : "Confirm Disband"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitProposal;
