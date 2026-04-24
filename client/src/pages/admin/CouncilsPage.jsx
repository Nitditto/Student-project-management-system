import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
};

const createMember = (role = "member", weight = 1) => ({
  teacher: "",
  role,
  weight,
});

const CouncilsPage = () => {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [councils, setCouncils] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    defenseDate: "",
    room: "",
    members: [createMember("chairman", 1.5), createMember("secretary", 1)],
  });
  const [assignForms, setAssignForms] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, projectsRes, councilsRes] = await Promise.all([
        axiosInstance.get("/admin/users"),
        axiosInstance.get("/admin/projects"),
        axiosInstance.get("/admin/councils"),
      ]);

      setTeachers(
        (usersRes.data.data?.users || []).filter((user) => user.role === "Teacher"),
      );
      setProjects(projectsRes.data.data?.projects || []);
      setCouncils(councilsRes.data.data?.councils || []);
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
      });
      toast.success("Project assigned to council");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign project");
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

      <div className="card space-y-4">
        <div className="card-header">
          <h2 className="card-title">Create New Defense Council</h2>
          <p className="card-subtitle">
            Chairman and secretary are mandatory. Chairman will assign reviewer later.
          </p>
        </div>

        <input
          className="input"
          placeholder="Council name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <textarea
          className="input min-h-20"
          placeholder="Council description"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="input"
            type="datetime-local"
            value={form.defenseDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, defenseDate: event.target.value }))
            }
          />
          <input
            className="input"
            placeholder="Defense room"
            value={form.room}
            onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
          />
        </div>

        {form.members.map((member, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
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
            <select
              className="input"
              value={member.role}
              onChange={(event) => handleMemberChange(index, "role", event.target.value)}
            >
              <option value="chairman">Chairman</option>
              <option value="secretary">Secretary</option>
              <option value="member">Additional Member</option>
            </select>
            <input
              className="input"
              type="number"
              min="0.1"
              step="0.1"
              value={member.weight}
              onChange={(event) => handleMemberChange(index, "weight", event.target.value)}
              placeholder="Score weight"
            />
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
              <h2 className="card-title">{council.name}</h2>
              <p className="card-subtitle">
                {formatDateTime(council.defenseDate)} | Room: {council.room || "N/A"}
              </p>
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
                      Final weighted score: {projectItem.weightedAverage ?? "N/A"} | Status:{" "}
                      {projectItem.status}
                    </p>
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
    </div>
  );
};

export default CouncilsPage;
