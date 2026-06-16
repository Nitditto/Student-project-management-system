import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { AlertTriangle, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { formatAssessmentScore } from "../../lib/assessment";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
};

const formatDateTimeInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const DEFAULT_ROLE_WEIGHTS = {
  chairman: 1.5,
  secretary: 1,
  member: 1,
};

const createMember = (role = "member", weight = DEFAULT_ROLE_WEIGHTS[role] || 1) => ({
  teacher: "",
  role,
  weight,
});

const createEmptyCouncilForm = () => ({
  name: "",
  description: "",
  defenseDate: "",
  room: "",
  members: [createMember("chairman"), createMember("secretary")],
});

const mapCouncilToForm = (council) => ({
  name: council.name || "",
  description: council.description || "",
  defenseDate: formatDateTimeInput(council.defenseDate),
  room: council.room || "",
  members:
    council.members?.map((member) => ({
      teacher: member.teacher?._id || "",
      role: member.role || "member",
      weight: member.weight ?? DEFAULT_ROLE_WEIGHTS[member.role] ?? 1,
    })) || [createMember("chairman"), createMember("secretary")],
});

const getCouncilFormValidationMessage = (form) => {
  if (!form.name.trim()) {
    return "Council name is required";
  }

  if (!Array.isArray(form.members) || form.members.length === 0) {
    return "Council members are required";
  }

  const chairmanCount = form.members.filter((member) => member.role === "chairman").length;
  const secretaryCount = form.members.filter((member) => member.role === "secretary").length;

  if (chairmanCount !== 1) {
    return "Council must have exactly one chairman";
  }

  if (secretaryCount !== 1) {
    return "Council must have exactly one secretary";
  }

  const teacherIds = form.members.map((member) => member.teacher).filter(Boolean);
  if (teacherIds.length !== form.members.length) {
    return "Please select a teacher for every council member";
  }

  if (new Set(teacherIds).size !== teacherIds.length) {
    return "Council members must not contain duplicate teachers";
  }

  return null;
};

const FieldBlock = ({ label, hint, children }) => (
  <div className="space-y-2">
    <div>
      <label className="label text-sm font-semibold text-slate-700">{label}</label>
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
  const [form, setForm] = useState(createEmptyCouncilForm);
  const [assignForms, setAssignForms] = useState({});
  const [councilToDelete, setCouncilToDelete] = useState(null);
  const [editingCouncilId, setEditingCouncilId] = useState(null);

  // States for Search, Filter, Pagination, and Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dateDesc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

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

  const removeMember = (index) => {
    setForm((current) => ({
      ...current,
      members: current.members.filter((_, memberIndex) => memberIndex !== index),
    }));
  };

  const resetForm = () => {
    setForm(createEmptyCouncilForm());
    setEditingCouncilId(null);
    setIsFormModalOpen(false);
  };

  const startEditingCouncil = (council) => {
    setEditingCouncilId(council._id);
    setForm(mapCouncilToForm(council));
    setIsFormModalOpen(true);
  };

  const isTeacherSelectedInOtherMember = (memberIndex, teacherId) =>
    form.members.some(
      (member, currentIndex) =>
        currentIndex !== memberIndex && member.teacher && member.teacher === teacherId,
    );

  const isRoleTakenInOtherMember = (memberIndex, role) =>
    role !== "member" &&
    form.members.some(
      (member, currentIndex) => currentIndex !== memberIndex && member.role === role,
    );

  const saveCouncil = async () => {
    const validationMessage = getCouncilFormValidationMessage(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      if (editingCouncilId) {
        await axiosInstance.put(`/admin/councils/${editingCouncilId}`, form);
        toast.success("Council updated");
      } else {
        await axiosInstance.post("/admin/councils", form);
        toast.success("Council created");
      }

      resetForm();
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingCouncilId ? "Failed to update council" : "Failed to create council"),
      );
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

  // Search, Filter & Sort Handlers
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleTrackFilterChange = (value) => {
    setTrackFilter(value);
    setCurrentPage(1);
  };

  const handleSortByChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Filtered and Sorted Councils
  const filteredCouncils = useMemo(() => {
    let result = [...councils];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((council) => {
        const nameMatch = council.name?.toLowerCase().includes(term);
        const descMatch = council.description?.toLowerCase().includes(term);
        const roomMatch = council.room?.toLowerCase().includes(term);

        // Members match
        const membersMatch = council.members?.some((m) =>
          m.teacher?.name?.toLowerCase().includes(term)
        );

        // Projects match
        const projectsMatch = council.projects?.some((p) =>
          p.project?.groupName?.toLowerCase().includes(term) ||
          p.project?.title?.toLowerCase().includes(term)
        );

        return nameMatch || descMatch || roomMatch || membersMatch || projectsMatch;
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((council) => {
        const projCount = council.projects?.length || 0;
        if (projCount === 0) {
          return statusFilter === "unassigned";
        }

        const allDone = council.projects.every((p) => p.status === "done");
        if (allDone) {
          return statusFilter === "completed";
        } else {
          return statusFilter === "pending";
        }
      });
    }

    // Track filter
    if (trackFilter !== "all") {
      result = result.filter((council) => {
        return council.projects?.some((p) => {
          const track = p.projectTrack || p.project?.projectTrack || "capstone";
          return track === trackFilter;
        });
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "dateAsc") {
        return new Date(a.defenseDate || 0) - new Date(b.defenseDate || 0);
      }
      if (sortBy === "dateDesc") {
        return new Date(b.defenseDate || 0) - new Date(a.defenseDate || 0);
      }
      if (sortBy === "nameAsc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "nameDesc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      return 0;
    });

    return result;
  }, [councils, searchTerm, statusFilter, trackFilter, sortBy]);

  const totalPages = Math.ceil(filteredCouncils.length / itemsPerPage);

  const paginatedCouncils = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCouncils.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCouncils, currentPage, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (loading) {
    return <div className="card text-center py-8">Loading councils...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Block with Create Button */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-lg p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Defense Council Setup</h1>
          <p className="text-indigo-100">
            Admin creates the council, assigns chairman and secretary, then attaches approved-completed projects.
          </p>
        </div>
        <button
          className="bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all duration-200 shrink-0"
          onClick={() => {
            resetForm();
            setIsFormModalOpen(true);
          }}
        >
          Create Council
        </button>
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

      {/* Main List Section */}
      <div className="space-y-4">
        {/* Search, Filter & Sort Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by council name, room, member name, or assigned project..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Filtering attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-2/3">
              <div className="relative">
                <select
                  className="input pr-8 appearance-none w-full"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed (Done)</option>
                  <option value="pending">Pending (In Progress)</option>
                  <option value="unassigned">Unassigned</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <Filter className="h-4 w-4" />
                </div>
              </div>

              <div className="relative">
                <select
                  className="input pr-8 appearance-none w-full"
                  value={trackFilter}
                  onChange={(e) => handleTrackFilterChange(e.target.value)}
                >
                  <option value="all">All Tracks</option>
                  <option value="capstone">Capstone</option>
                  <option value="research">Research</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <Filter className="h-4 w-4" />
                </div>
              </div>

              <div className="relative">
                <select
                  className="input pr-8 appearance-none w-full"
                  value={sortBy}
                  onChange={(e) => handleSortByChange(e.target.value)}
                >
                  <option value="dateDesc">Date (Newest)</option>
                  <option value="dateAsc">Date (Oldest)</option>
                  <option value="nameAsc">Name (A-Z)</option>
                  <option value="nameDesc">Name (Z-A)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <Filter className="h-4 w-4" />
                </div>
              </div>

              <div className="relative">
                <select
                  className="input pr-8 appearance-none w-full"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <Filter className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Councils Cards List */}
        <div className="space-y-4">
          {paginatedCouncils.map((council) => (
            <div
              key={council._id}
              className={`card ${editingCouncilId === council._id ? "ring-2 ring-blue-200" : ""}`}
            >
              <div className="card-header">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="card-title">{council.name}</h2>
                    <p className="card-subtitle">
                      {formatDateTime(council.defenseDate)} | Room: {council.room || "N/A"}
                    </p>
                    {council.description && (
                      <p className="text-sm text-slate-500 mt-1 max-w-2xl">{council.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="btn-outline"
                      onClick={() => startEditingCouncil(council)}
                    >
                      Edit Council
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => setCouncilToDelete(council)}
                    >
                      Delete Council
                    </button>
                  </div>
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

          {paginatedCouncils.length === 0 && (
            <div className="card text-center py-8 text-slate-500">
              No councils found matching your search or filters.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCouncils.length)}</span> to{" "}
              <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredCouncils.length)}</span> of{" "}
              <span className="font-semibold text-slate-700">{filteredCouncils.length}</span> councils
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                    currentPage === page
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog Modal (Create / Edit Council) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCouncilId ? "Edit Defense Council" : "Create New Defense Council"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {editingCouncilId
                    ? "Update council information and members. Member changes are blocked after scoring starts."
                    : "Chairman and secretary are mandatory. Chairman will assign reviewer later."}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
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

              <div className="space-y-4">
                <p className="font-semibold text-slate-700">Council Members</p>
                {form.members.map((member, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50"
                  >
                    <div className="md:col-span-3 border-b border-slate-200 pb-2 flex items-start justify-between gap-3">
                      <div>
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
                      {member.role === "member" && (
                        <button
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                          onClick={() => removeMember(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <FieldBlock label="Teacher" hint="Select the teacher for this council position.">
                      <select
                        className="input"
                        value={member.teacher}
                        onChange={(event) => handleMemberChange(index, "teacher", event.target.value)}
                      >
                        <option value="">Select teacher</option>
                        {teachers.map((teacher) => (
                          <option
                            key={teacher._id}
                            value={teacher._id}
                            disabled={isTeacherSelectedInOtherMember(index, teacher._id)}
                          >
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
                        <option
                          value="chairman"
                          disabled={isRoleTakenInOtherMember(index, "chairman")}
                        >
                          Chairman
                        </option>
                        <option
                          value="secretary"
                          disabled={isRoleTakenInOtherMember(index, "secretary")}
                        >
                          Secretary
                        </option>
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
              </div>

              <div className="flex gap-3 pt-2">
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
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl shrink-0">
              <button className="btn-outline" onClick={resetForm}>
                Cancel
              </button>
              <button className="btn-primary px-6" onClick={saveCouncil}>
                {editingCouncilId ? "Update Council" : "Create Council"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {councilToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
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
