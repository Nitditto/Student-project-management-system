import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    return <div className="card">{t("student.proposal.loading")}</div>;
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
        <h1 className="text-2xl font-bold mb-2">{t("student.proposal.headerTitle")}</h1>
        <p className="text-blue-100">
          {t("student.proposal.headerDesc")}
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t("student.proposal.policyTitle")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{t("student.proposal.groupMode")}</p>
            <p className="font-semibold text-slate-800">
              {settings?.allowGroupProjects ? t("student.proposal.enabled") : t("student.proposal.disabled")}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{t("student.proposal.groupSize")}</p>
            <p className="font-semibold text-slate-800">
              {t("student.proposal.groupSizeVal", { min: settings?.minGroupSize, max: settings?.maxGroupSize })}
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
              <h2 className="card-title">{t("student.proposal.currProposalTitle")}</h2>
              <p className="card-subtitle">
                {isLeader
                  ? t("student.proposal.leaderLabel")
                  : t("student.proposal.memberLabel", { name: project.student?.name })}
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
                  {t("student.proposal.leaderActions")}
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
                      {t("student.proposal.transferLeadOpt")}
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
                          {t("student.proposal.kickMemberOpt")}
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
                          {t("student.proposal.disbandGroupOpt")}
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
              <p className="text-sm text-slate-500">{t("student.proposal.titleLabel")}</p>
              <p className="font-semibold text-slate-800">{project.title}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t("student.proposal.groupNameLabel")}</p>
              <p className="font-semibold text-slate-800">
                {project.groupName || project.title}
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-slate-500">{t("student.proposal.modeLabel")}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${project.projectMode === "group" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                  {project.projectMode === "group" ? t("student.proposal.modeGroup") : t("student.proposal.modeIndiv")}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500">{t("student.proposal.statusLabel")}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-yellow-100 text-yellow-800 capitalize">
                  {project.status}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t("student.proposal.repLabel")}</p>
              <div className="mt-1 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <p className="font-semibold text-slate-800">{project.student?.name}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2">{t("student.proposal.membersLabel")}</p>
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
        <form id="proposal-form-container" onSubmit={handleSubmit} className="card space-y-6">
          <div className="card-header">
            <h2 className="card-title">{t("student.proposal.createNewHeader")}</h2>
            <p className="card-subtitle">
              {t("student.proposal.createNewSub")}
            </p>
          </div>

          <div>
            <label className="label">{t("student.proposal.titleLabel")}</label>
            <input
              id="proposal-title-input"
              type="text"
              className="input"
              value={formData.title}
              onChange={(event) =>
                setFormData((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={t("student.proposal.titlePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="label">{t("student.proposal.descLabel")}</label>
            <textarea
              id="proposal-desc-input"
              className="input min-h-[140px]"
              value={formData.description}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={t("student.proposal.descPlaceholder")}
              required
            />
          </div>

          <div>
            <label className="label">{t("student.proposal.outlineLabel")}</label>
            <input
              id="proposal-file-input"
              type="file"
              accept=".pdf,.docx,.txt"
              className="border border-slate-200 p-2 rounded-lg w-full bg-white text-sm"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] || null : null)}
            />
          </div>

          {settings?.allowGroupProjects && (
            <>
              <div>
                <label className="label">{t("student.proposal.groupNameLabel")}</label>
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
                  placeholder={t("sidebar.home") === "Trang chủ" ? "Ví dụ: Nhóm Orion" : "Example: Team Orion"}
                />
              </div>

              <div>
                <label className="label">{t("student.proposal.inviteLabel")}</label>
                <p className="text-sm text-slate-500 mb-3">
                  {t("student.proposal.inviteSub")}
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
                      placeholder={t("student.proposal.invitePlaceholder")}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary flex items-center gap-1.5"
                    onClick={handleAddByEmail}
                  >
                    <Plus className="w-4 h-4" />
                    {t("student.proposal.addBtn")}
                  </button>
                </div>

                {formData.memberIds.length > 0 && (
                  <div className="space-y-2.5 mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("student.proposal.selectedMembers", { count: formData.memberIds.length })}
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
                              title={t("student.proposal.removeMember")}
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
            <button id="proposal-submit-btn" type="submit" className="btn-primary" disabled={saving}>
              {saving ? t("student.proposal.submitting") : t("student.proposal.submitBtn")}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t("student.proposal.incomingInvitations")}</h2>
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
                  {t("student.proposal.repCol", { name: invitation.inviter?.name })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  onClick={() => respondInvitation(invitation._id, "accepted")}
                >
                  {t("student.proposal.acceptBtn")}
                </button>
                <button
                  className="btn-outline"
                  onClick={() => respondInvitation(invitation._id, "rejected")}
                >
                  {t("student.proposal.rejectBtn")}
                </button>
              </div>
            </div>
          ))}
          {incomingInvitations.length === 0 && (
            <p className="text-slate-500">{t("student.proposal.noIncoming")}</p>
          )}
        </div>
      </div>

      {outgoingInvitations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t("student.proposal.outgoingInvitations")}</h2>
          </div>
          <div className="space-y-3">
            {outgoingInvitations.map((invitation) => (
              <div key={invitation._id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-800">
                  {invitation.invitee?.name}
                </p>
                <p className="text-sm text-slate-500">{invitation.invitee?.email}</p>
                <p className="mt-2 text-sm capitalize text-slate-600">
                  {t("student.proposal.statusCol", { status: invitation.status })}
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
                {t("student.proposal.transferModalTitle")}
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowTransferModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {t("student.proposal.transferModalSub")}
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
                {t("student.proposal.cancelBtn")}
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={!selectedMember || actionLoading}
                onClick={handleTransferLeadership}
              >
                {actionLoading ? t("student.proposal.transferring") : t("student.proposal.transferConfirmBtn")}
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
                {t("student.proposal.kickModalTitle")}
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowKickModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {t("student.proposal.kickModalSub")}
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
                {t("student.proposal.cancelBtn")}
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                disabled={!selectedMember || actionLoading}
                onClick={handleKickMember}
              >
                {actionLoading ? t("student.proposal.kicking") : t("student.proposal.kickConfirmBtn")}
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
                {t("student.proposal.disbandModalTitle")}
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowDisbandModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">
                {t("student.proposal.disbandModalWarning")}
              </p>
              <ul className="text-sm text-red-700 list-disc pl-4 space-y-1">
                <li>{t("student.proposal.disbandItem1")}</li>
                <li>{t("student.proposal.disbandItem2")}</li>
                <li>{t("student.proposal.disbandItem3")}</li>
              </ul>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              {t("student.proposal.titleLabel")}: <strong>{project?.title}</strong>
            </p>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200" onClick={() => setShowDisbandModal(false)}>
                {t("student.proposal.cancelBtn")}
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={actionLoading}
                onClick={handleDisbandGroup}
              >
                {actionLoading ? t("student.proposal.disbanding") : t("student.proposal.disbandConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitProposal;
