import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { AlertTriangle } from "lucide-react";
import { formatAssessmentScore } from "../../lib/assessment";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
};

const createMember = (role = "member", weight = 1) => ({
  teacher: "",
  role,
  weight,
});

const FieldBlock = ({ label, hint, children }) => (
  <div className="space-y-2">
    <div>
      <label className="label">{label}</label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
    {children}
  </div>
);

const CouncilsPage = () => {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [councils, setCouncils] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [qaDashboard, setQaDashboard] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    defenseDate: "",
    room: "",
    members: [createMember("chairman", 1.5), createMember("secretary", 1)],
  });
  const [assignForms, setAssignForms] = useState({});
  const [councilToDelete, setCouncilToDelete] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, projectsRes, councilsRes, templatesRes, qaRes] = await Promise.all([
        axiosInstance.get("/admin/users"),
        axiosInstance.get("/admin/projects"),
        axiosInstance.get("/admin/councils"),
        axiosInstance.get("/admin/assessment-templates"),
        axiosInstance.get("/admin/qa/clo-dashboard"),
      ]);

      setTeachers(
        (usersRes.data.data?.users || []).filter((user) => user.role === "Teacher"),
      );
      setProjects(projectsRes.data.data?.projects || []);
      setCouncils(councilsRes.data.data?.councils || []);
      setTemplates(templatesRes.data.data?.templates || []);
      setQaDashboard(qaRes.data.data?.dashboard || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load councils page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleProjects = useMemo(
    () =>
      projects.filter((project) => project.status === "completed" && !project.councilId),
    [projects],
  );

  const handleMemberChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    }));
  };

  const createCouncil = async () => {
    try {
      await axiosInstance.post("/admin/councils", form);
      toast.success("Council created");
      setForm({
        name: "",
        description: "",
        defenseDate: "",
        room: "",
        members: [createMember("chairman", 1.5), createMember("secretary", 1)],
      });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create council");
    }
  };

  const updateAssignForm = (councilId, field, value) => {
    setAssignForms((current) => ({
      ...current,
      [councilId]: {
        ...(current[councilId] || {}),
        [field]: value,
      },
    }));
  };

  const assignProject = async (councilId) => {
    try {
      await axiosInstance.post(`/admin/councils/${councilId}/assign-project`, {
        projectId: assignForms[councilId]?.projectId,
        projectTrack: assignForms[councilId]?.projectTrack || "capstone",
        templateId: assignForms[councilId]?.templateId || undefined,
      });
      toast.success("Project assigned to council");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign project");
    }
  };

  const handleDeleteCouncil = async () => {
    if (!councilToDelete?._id) return;

    try {
      await axiosInstance.delete(`/admin/councils/${councilToDelete._id}`);
      toast.success("Council deleted");
      setCouncilToDelete(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete council");
    }
  };

  if (loading) {
    return <div className="card">Loading councils...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Defense Council Setup</h1>
        <p className="text-indigo-100">
          Admin creates the council, assigns chairman and secretary, then attaches approved-completed projects.
        </p>
      </div>

      {qaDashboard && (
        <div className="card space-y-4">
          <div className="card-header">
            <h2 className="card-title">CLO QA Dashboard</h2>
            <p className="card-subtitle">
              Follow CLO achievement, evidence completeness, and projects that still need QA attention.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Assessments</p>
              <p className="text-xl font-semibold text-slate-800">{qaDashboard.totalAssessments}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Finalized</p>
              <p className="text-xl font-semibold text-slate-800">{qaDashboard.finalizedAssessments}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Pass Rate</p>
              <p className="text-xl font-semibold text-slate-800">{qaDashboard.passRate}%</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Avg QA Completeness</p>
              <p className="text-xl font-semibold text-slate-800">{qaDashboard.averageQaCompleteness}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 font-medium text-slate-700">CLO Achievement Rate</p>
              <div className="space-y-2">
                {(qaDashboard.cloAchievementRates || []).map((item) => (
                  <div
                    key={item.cloCode}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <span className="font-medium text-slate-700">{item.cloCode}</span>
                    <span className="text-sm text-slate-500">
                      {item.achievementRate}% ({item.achievedProjects}/{item.totalProjects})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 font-medium text-slate-700">Projects Requiring QA Follow-up</p>
              <div className="space-y-2">
                {(qaDashboard.projectWarnings || []).slice(0, 8).map((item) => (
                  <div key={item.projectId} className="rounded-lg bg-amber-50 p-3">
                    <p className="font-medium text-slate-800">{item.projectName}</p>
                    <p className="text-sm text-slate-600">
                      CLO red: {item.redClos.length ? item.redClos.join(", ") : "None"} | QA completeness: {item.qaCompleteness}%
                    </p>
                    {item.missingItems.length > 0 && (
                      <p className="text-sm text-amber-700">
                        Missing evidence: {item.missingItems.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
                {(qaDashboard.projectWarnings || []).length === 0 && (
                  <p className="text-slate-500">No QA warnings right now.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <div className="card-header">
          <h2 className="card-title">Create New Defense Council</h2>
          <p className="card-subtitle">
            Chairman and secretary are mandatory. Chairman will assign reviewer later.
          </p>
        </div>

        <FieldBlock
          label="C1. Defense Council Name"
          hint='Example: "Final Defense Council - Software Engineering - Round 1"'
        >
          <input
            className="input"
            placeholder="Enter defense council name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </FieldBlock>

        <FieldBlock
          label="C2. Council Description"
          hint="Describe the defense batch, faculty, or any note the admin wants to keep with this council."
        >
          <textarea
            className="input min-h-20"
            placeholder="Enter short council description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </FieldBlock>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldBlock
            label="C3. Defense Date And Time"
            hint="This is the official date-time when the council starts hearing defenses."
          >
            <input
              className="input"
              type="datetime-local"
              value={form.defenseDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, defenseDate: event.target.value }))
              }
            />
          </FieldBlock>
          <FieldBlock
            label="C4. Defense Room Or Meeting Link"
            hint="Enter room name, lab name, or online meeting location."
          >
            <input
              className="input"
              placeholder="Example: Room B305 or Google Meet link"
              value={form.room}
              onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
            />
          </FieldBlock>
        </div>

        {form.members.map((member, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <div className="md:col-span-3 border-b border-slate-200 pb-2">
              <p className="font-medium text-slate-800">
                C5.{index + 1}. Council Member {index + 1}
              </p>
              <p className="text-xs text-slate-500">
                {member.role === "chairman"
                  ? "Required: choose the chairman who will coordinate the council and assign reviewer later."
                  : member.role === "secretary"
                    ? "Required: choose the secretary who records the defense process."
                    : "Optional: add another council member and set their score weight."}
              </p>
            </div>
            <FieldBlock label="Teacher" hint="Select the teacher for this council position.">
              <select
                className="input"
                value={member.teacher}
                onChange={(event) => handleMemberChange(index, "teacher", event.target.value)}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </FieldBlock>
            <FieldBlock label="Role" hint="Set the role this teacher will hold inside the council.">
              <select
                className="input"
                value={member.role}
                onChange={(event) => handleMemberChange(index, "role", event.target.value)}
              >
                <option value="chairman">Chairman</option>
                <option value="secretary">Secretary</option>
                <option value="member">Additional Member</option>
              </select>
            </FieldBlock>
            <FieldBlock label="Score Weight" hint="This weight contributes to the final weighted council score.">
              <input
                className="input"
                type="number"
                min="0.1"
                step="0.1"
                value={member.weight}
                onChange={(event) => handleMemberChange(index, "weight", event.target.value)}
                placeholder="Example: 1 or 1.5"
              />
            </FieldBlock>
          </div>
        ))}

        <div className="flex gap-3">
          <button
            className="btn-outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                members: [...current.members, createMember("member", 1)],
              }))
            }
          >
            Add Additional Member
          </button>
          <button className="btn-primary" onClick={createCouncil}>
            Create Defense Council
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {councils.map((council) => (
          <div key={council._id} className="card">
            <div className="card-header">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="card-title">{council.name}</h2>
                  <p className="card-subtitle">
                    {formatDateTime(council.defenseDate)} | Room: {council.room || "N/A"}
                  </p>
                </div>
                <button
                  className="btn-danger"
                  onClick={() => setCouncilToDelete(council)}
                >
                  Delete Council
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <p className="font-medium text-slate-700 mb-2">Council Members</p>
                <div className="space-y-2">
                  {(council.members || []).map((member) => (
                    <div
                      key={member.teacher?._id}
                      className="rounded-lg bg-slate-50 p-3 flex items-center justify-between"
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

              <div className="space-y-3">
                <p className="font-medium text-slate-700">Assign Project To Council</p>
                <select
                  className="input"
                  value={assignForms[council._id]?.projectId || ""}
                  onChange={(event) =>
                    updateAssignForm(council._id, "projectId", event.target.value)
                  }
                >
                  <option value="">Select completed project</option>
                  {eligibleProjects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.groupName || project.title}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    className="input"
                    value={assignForms[council._id]?.projectTrack || "capstone"}
                    onChange={(event) =>
                      updateAssignForm(council._id, "projectTrack", event.target.value)
                    }
                  >
                    <option value="capstone">Capstone</option>
                    <option value="research">Research thesis</option>
                  </select>
                  <select
                    className="input"
                    value={assignForms[council._id]?.templateId || ""}
                    onChange={(event) =>
                      updateAssignForm(council._id, "templateId", event.target.value)
                    }
                  >
                    <option value="">Default template for selected track</option>
                    {templates
                      .filter(
                        (template) =>
                          template.projectTrack ===
                          (assignForms[council._id]?.projectTrack || "capstone"),
                      )
                      .map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.name} ({template.version})
                        </option>
                      ))}
                  </select>
                </div>
                <button className="btn-primary" onClick={() => assignProject(council._id)}>
                  Assign Project To This Council
                </button>
              </div>
            </div>

            <div className="mt-4">
              <p className="font-medium text-slate-700 mb-2">Projects Already Assigned</p>
              <div className="space-y-2">
                {(council.projects || []).map((projectItem) => (
                  <div key={projectItem.project?._id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium text-slate-800">
                      {projectItem.project?.groupName || projectItem.project?.title}
                    </p>
                    <p className="text-sm text-slate-500">
                      Supervisor: {projectItem.project?.supervisor?.name || "N/A"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Reviewer: {projectItem.reviewer?.name || "Waiting for chairman assignment"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Track: {projectItem.projectTrack || projectItem.project?.projectTrack || "capstone"} | Template:{" "}
                      {projectItem.templateVersion || projectItem.assessmentSummary?.templateVersion || "default"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Final weighted score: {projectItem.weightedAverage ?? "N/A"} | Status: {projectItem.status}
                    </p>
                    {projectItem.assessmentSummary && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3">
                        <div>
                          <p className="text-xs uppercase text-slate-500">Team result</p>
                          <p className="font-semibold text-slate-800">
                            {formatAssessmentScore(projectItem.assessmentSummary.teamFinalScore, "/10")} |{" "}
                            {projectItem.assessmentSummary.teamPassStatus}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500">QA completeness</p>
                          <p className="font-semibold text-slate-800">
                            {projectItem.assessmentSummary.qaEvidenceSummary?.completenessPercent || 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500">CLO at risk</p>
                          <p className="font-semibold text-slate-800">
                            {projectItem.assessmentSummary.cloResults
                              ?.filter((item) => item.status === "not_achieved")
                              .map((item) => item.cloCode)
                              .join(", ") || "None"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!council.projects || council.projects.length === 0) && (
                  <p className="text-slate-500">No project assigned yet.</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {councils.length === 0 && <div className="card">No councils created yet.</div>}
      </div>

      {councilToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4 justify-center">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Delete Defense Council
              </h3>
              <p className="text-sm text-slate-500 mb-2">
                Are you sure you want to delete <strong>{councilToDelete.name}</strong>?
              </p>
              <p className="text-sm text-slate-500 mb-5">
                If this council has assigned projects that are not finalized yet, they will be detached from the council automatically.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  className="btn-outline"
                  onClick={() => setCouncilToDelete(null)}
                >
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDeleteCouncil}>
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilsPage;
