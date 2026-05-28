import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MessageSquare,
  CheckCircle,
  X,
  Loader,
  Search,
  Users,
  FolderOpen,
  Settings,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Scissors,
  Crown,
  ChevronDown,
  Filter,
  ArrowUpDown,
  ChevronUp,
} from "lucide-react";
import {
  addFeedback,
  getAssignedStudents,
  markComplete,
} from "../../store/slices/teacherSlice";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

const AssignedStudents = () => {
  const [activeTab, setActiveTab] = useState("projects");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    title: "",
    message: "",
    type: "general",
  });

  // Teacher group control states
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(null); // projectId
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [showChangeLeaderModal, setShowChangeLeaderModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [orphanStudents, setOrphanStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [splitMembers, setSplitMembers] = useState([]);
  const [splitTitle, setSplitTitle] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Expand members state
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  // Filters & sort
  const [modeFilter, setModeFilter] = useState("all"); // all, individual, group
  const [sortBy, setSortBy] = useState("date"); // date, size

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getAssignedStudents());
  }, [dispatch]);

  const { assignedStudents, loading, error } = useSelector(
    (state) => state.teacher,
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border border-green-200";
      case "approved":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "rejected":
        return "bg-red-100 text-red-700 border border-red-200";
      default:
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "approved":
        return "In Progress";
      case "waiting_defense":
        return "Waiting Defense";
      default:
        return status
          ? status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")
          : "Pending";
    }
  };

  const handleFeedback = (projectObj) => {
    setSelectedProject(projectObj);
    setFeedbackData({ title: "", message: "", type: "general" });
    setShowFeedbackModal(true);
  };

  const handleMarkComplete = (projectObj) => {
    setSelectedProject(projectObj);
    setShowCompleteModal(true);
  };

  const closeModal = () => {
    setShowFeedbackModal(false);
    setShowCompleteModal(false);
    setShowAddMemberModal(false);
    setShowRemoveMemberModal(false);
    setShowChangeLeaderModal(false);
    setShowSplitModal(false);
    setSelectedProject(null);
    setSelectedStudentId(null);
    setSplitMembers([]);
    setSplitTitle("");
    setFeedbackData({ title: "", message: "", type: "general" });
  };

  const submitFeedback = () => {
    if (selectedProject?._id && feedbackData.title && feedbackData.message) {
      dispatch(
        addFeedback({ projectId: selectedProject._id, feedback: feedbackData }),
      );
      closeModal();
    }
  };

  const confirmMarkComplete = () => {
    if (selectedProject?._id) {
      dispatch(markComplete(selectedProject._id));
      closeModal();
    }
  };

  const toggleExpand = (projectId) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Teacher group control actions
  const openCustomizeAction = async (project, action) => {
    setSelectedProject(project);
    setShowCustomizeMenu(null);
    setSelectedStudentId(null);
    setSplitMembers([]);
    setSplitTitle("");

    if (action === "add") {
      try {
        const res = await axiosInstance.get("/student/group-candidates");
        setOrphanStudents(res.data.data?.students || []);
      } catch {
        setOrphanStudents([]);
      }
      setShowAddMemberModal(true);
    } else if (action === "remove") {
      setShowRemoveMemberModal(true);
    } else if (action === "leader") {
      setShowChangeLeaderModal(true);
    } else if (action === "split") {
      setShowSplitModal(true);
    }
  };

  const handleAddMember = async () => {
    if (!selectedStudentId || !selectedProject) return;
    setActionLoading(true);
    try {
      await axiosInstance.post(
        `/teacher/projects/${selectedProject._id}/add-member`,
        {
          studentId: selectedStudentId,
        },
      );
      toast.success("Student added to project");
      closeModal();
      dispatch(getAssignedStudents());
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedStudentId || !selectedProject) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(
        `/teacher/projects/${selectedProject._id}/remove-member`,
        {
          memberId: selectedStudentId,
        },
      );
      toast.success("Member removed from project");
      closeModal();
      dispatch(getAssignedStudents());
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeLeader = async () => {
    if (!selectedStudentId || !selectedProject) return;
    setActionLoading(true);
    try {
      await axiosInstance.put(
        `/teacher/projects/${selectedProject._id}/change-leader`,
        {
          newLeaderId: selectedStudentId,
        },
      );
      toast.success("Leader changed successfully");
      closeModal();
      dispatch(getAssignedStudents());
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change leader");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSplitProject = async () => {
    if (splitMembers.length === 0 || !selectedProject) return;
    setActionLoading(true);
    try {
      await axiosInstance.post(
        `/teacher/projects/${selectedProject._id}/split`,
        {
          memberIds: splitMembers,
          newTitle: splitTitle,
        },
      );
      toast.success("Project split successfully");
      closeModal();
      dispatch(getAssignedStudents());
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to split project");
    } finally {
      setActionLoading(false);
    }
  };

  // Group students by project
  const projects = useMemo(() => {
    const projectMap = new Map();
    (assignedStudents || []).forEach((student) => {
      const proj = student.project;
      if (!proj) return;
      if (!projectMap.has(proj._id)) {
        projectMap.set(proj._id, {
          ...proj,
          groupMembers: [student],
        });
      } else {
        const existing = projectMap.get(proj._id);
        if (!existing.groupMembers.find((m) => m._id === student._id)) {
          existing.groupMembers.push(student);
        }
      }
    });
    return Array.from(projectMap.values());
  }, [assignedStudents]);

  // Apply filters and sorting
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Mode filter
    if (modeFilter === "individual") {
      result = result.filter((p) => p.projectMode === "individual");
    } else if (modeFilter === "group") {
      result = result.filter((p) => p.projectMode === "group");
    }

    // Sort
    if (sortBy === "size") {
      result.sort(
        (a, b) => (b.groupMembers?.length || 0) - (a.groupMembers?.length || 0),
      );
    } else {
      result.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return dateB - dateA;
      });
    }

    return result;
  }, [projects, modeFilter, sortBy]);

  // For students table
  const filteredStudents = useMemo(() => {
    let result = (assignedStudents || []).filter(
      (student) =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (modeFilter === "individual") {
      result = result.filter((s) => s.project?.projectMode === "individual");
    } else if (modeFilter === "group") {
      result = result.filter((s) => s.project?.projectMode === "group");
    }

    return result;
  }, [assignedStudents, searchTerm, modeFilter]);

  const stats = [
    {
      label: "Total Projects",
      value: projects.length,
      bg: "bg-blue-50",
      text: "text-blue-700",
      sub: "text-blue-600",
    },
    {
      label: "Completed",
      value: projects.filter((p) => p.status === "completed").length,
      bg: "bg-green-50",
      text: "text-green-700",
      sub: "text-green-600",
    },
    {
      label: "In Progress",
      value: projects.filter(
        (p) => p.status === "approved" || p.status === "in_progress",
      ).length,
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      sub: "text-yellow-600",
    },
    {
      label: "Total Students",
      value: assignedStudents?.length || 0,
      bg: "bg-purple-50",
      text: "text-purple-700",
      sub: "text-purple-600",
    },
  ];

  if (loading)
    return <Loader className="animate-spin w-16 h-16 mx-auto mt-12" />;
  if (error)
    return (
      <div className="text-center py-10 text-red-600 font-medium">
        Error loading students
      </div>
    );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">My Supervision</h1>
            <p className="card-subtitle">
              Manage your assigned students and their projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {stats.map((item) => (
              <div className={`${item.bg} rounded-lg p-4`} key={item.label}>
                <p className={`${item.sub} text-sm`}>{item.label}</p>
                <p className={`${item.text} text-2xl font-bold`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs + Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 mt-6 gap-4">
            <div className="flex">
              <button
                className={`px-6 py-3 font-medium text-sm focus:outline-none flex items-center gap-2 ${
                  activeTab === "projects"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setActiveTab("projects")}
              >
                <FolderOpen className="w-4 h-4" />
                Projects View
              </button>
              <button
                className={`px-6 py-3 font-medium text-sm focus:outline-none flex items-center gap-2 ${
                  activeTab === "students"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setActiveTab("students")}
              >
                <Users className="w-4 h-4" />
                Students View
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3 pb-3 md:pb-0">
              <div className="flex items-center gap-1.5 text-sm">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                </select>
              </div>
              {activeTab === "projects" && (
                <div className="flex items-center gap-1.5 text-sm">
                  <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  <select
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date">Latest Updated</option>
                    <option value="size">Group Size ↑</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project) => {
              const isGroup = project.projectMode === "group";
              const isExpanded = expandedProjects.has(project._id);

              return (
                <div
                  className="card hover:shadow-lg transition-all duration-300 flex flex-col"
                  key={project._id}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-slate-800 leading-snug">
                          {project.title || "No project title"}
                        </h3>
                        {/* Mode badge */}
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isGroup
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isGroup ? "Group" : "Individual"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {project.groupName ||
                          (isGroup ? "Group Project" : "Individual Project")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}
                      >
                        {getStatusText(project.status)}
                      </span>

                      {/* Customize Team Button */}
                      <div className="relative">
                        <button
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                          title="Customize Team"
                          onClick={() =>
                            setShowCustomizeMenu(
                              showCustomizeMenu === project._id
                                ? null
                                : project._id,
                            )
                          }
                        >
                          <Settings className="w-4 h-4" />
                        </button>

                        {showCustomizeMenu === project._id && (
                          <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 z-20 py-1">
                            <button
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                              onClick={() =>
                                openCustomizeAction(project, "add")
                              }
                            >
                              <UserPlus className="w-4 h-4 text-green-500" />
                              Add Student
                            </button>
                            {isGroup && (
                              <>
                                <button
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                  onClick={() =>
                                    openCustomizeAction(project, "remove")
                                  }
                                >
                                  <UserMinus className="w-4 h-4 text-orange-500" />
                                  Remove Student
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                  onClick={() =>
                                    openCustomizeAction(project, "leader")
                                  }
                                >
                                  <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                  Change Leader
                                </button>
                              </>
                            )}
                            {isGroup && project.groupMembers.length >= 3 && (
                              <>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                  onClick={() =>
                                    openCustomizeAction(project, "split")
                                  }
                                >
                                  <Scissors className="w-4 h-4 text-purple-500" />
                                  Split Group
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="mb-6 flex-1">
                    {isGroup ? (
                      <div className="mt-3 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => toggleExpand(project._id)}
                          className="w-full text-left px-4 py-2.5 bg-slate-100/50 hover:bg-slate-100 flex justify-between items-center transition-colors"
                        >
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Group Members ({project.groupMembers.length})
                          </span>
                          <span className="text-slate-500 flex items-center gap-1 text-xs font-bold">
                            {isExpanded ? (
                              <>
                                Hide <ChevronUp className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                View Details <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                            {project.groupMembers.map((member) => {
                              const memberIsLeader =
                                project.student === member._id ||
                                project.student?._id === member._id;
                              return (
                                <div
                                  key={member._id}
                                  className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                                      {member.name?.charAt(0) || "M"}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-slate-800 flex items-center gap-2">
                                        {member.name}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        {member.email}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    {memberIsLeader ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                        <Crown className="w-3.5 h-3.5" />
                                        Leader
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        Member
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                          Student
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {project.groupMembers.map((member) => (
                            <div
                              key={member._id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              <span className="font-medium text-xs">
                                {member.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 mt-auto">
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-all"
                      onClick={() => navigate("/teacher/files")}
                    >
                      <FolderOpen className="w-4 h-4" />
                      Workspace
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all"
                      onClick={() => handleFeedback(project)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Feedback
                    </button>
                    <button
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all ${
                        project.status === "completed"
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                      disabled={project.status === "completed"}
                      onClick={() => handleMarkComplete(project)}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="col-span-full card text-center py-12 text-slate-500">
                No projects found matching your filters.
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-lg font-semibold text-slate-800">
                All Supervised Students
              </h2>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600 uppercase tracking-wider">
                    <th className="p-4 rounded-tl-lg">Student Info</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Project Role</th>
                    <th className="p-4">Project Title</th>
                    <th className="p-4">Mode</th>
                    <th className="p-4 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const isLeader =
                      student.project?.student === student._id ||
                      student.project?.student?._id === student._id;
                    const mode = student.project?.projectMode;
                    return (
                      <tr
                        key={student._id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {student.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">
                              {student.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <a
                            href={`mailto:${student.email}`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {student.email}
                          </a>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isLeader
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {isLeader ? "Leader" : "Member"}
                          </span>
                        </td>
                        <td
                          className="p-4 text-sm text-slate-600 max-w-xs truncate"
                          title={student.project?.title}
                        >
                          {student.project?.title || "-"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mode === "group"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {mode === "group" ? "Group" : "Individual"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-8 text-center text-slate-500"
                      >
                        No students found matching your search and filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== EXISTING MODALS ===== */}

        {/* Feedback Modal */}
        {showFeedbackModal && selectedProject && (
          <div
            className="fixed inset-0 bg-black backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                  Provide Feedback
                </h2>
                <button
                  className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">
                      Project
                    </span>
                    <span className="text-slate-800 font-medium">
                      {selectedProject.title || "No title"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">
                      Team
                    </span>
                    <span className="text-slate-800">
                      {selectedProject.groupMembers
                        .map((m) => m.name)
                        .join(", ")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Feedback Title
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="E.g., Review for Milestone 1"
                    value={feedbackData.title}
                    type="text"
                    onChange={(e) =>
                      setFeedbackData({
                        ...feedbackData,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Feedback Type
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                    value={feedbackData.type}
                    onChange={(e) =>
                      setFeedbackData({ ...feedbackData, type: e.target.value })
                    }
                  >
                    <option value="general">General Note</option>
                    <option value="positive">Positive / Praise</option>
                    <option value="negative">Needs Improvement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Feedback Message
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                    placeholder="Write your detailed feedback here..."
                    rows={4}
                    value={feedbackData.message}
                    onChange={(e) =>
                      setFeedbackData({
                        ...feedbackData,
                        message: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-medium rounded-lg"
                  disabled={!feedbackData.title || !feedbackData.message}
                  onClick={submitFeedback}
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Modal */}
        {showCompleteModal && selectedProject && (
          <div
            className="fixed inset-0 bg-black backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                  Confirm Completion
                </h2>
                <button
                  className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold text-yellow-800 mb-1">
                      Project
                    </span>
                    <span className="text-yellow-900">
                      {selectedProject.title || "No title"}
                    </span>
                  </div>
                  <div className="flex flex-col mt-3">
                    <span className="font-semibold text-yellow-800 mb-1">
                      Team
                    </span>
                    <span className="text-yellow-900">
                      {selectedProject.groupMembers
                        .map((m) => m.name)
                        .join(", ")}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-slate-600 mb-8 font-medium">
                Are you sure you want to mark this project as completed?
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg flex justify-center items-center gap-2"
                  onClick={confirmMarkComplete}
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== TEACHER GROUP CONTROL MODALS ===== */}

        {/* Add Member Modal */}
        {showAddMemberModal && selectedProject && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-green-500" />
                  Add Student to Project
                </h2>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-1">
                Project: <strong>{selectedProject.title}</strong>
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Select an unassigned student to add:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {orphanStudents.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">
                    No unassigned students available.
                  </p>
                )}
                {orphanStudents.map((s) => (
                  <label
                    key={s._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStudentId === s._id
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addStudent"
                      checked={selectedStudentId === s._id}
                      onChange={() => setSelectedStudentId(s._id)}
                    />
                    <div>
                      <p className="font-medium text-slate-800">{s.name}</p>
                      <p className="text-sm text-slate-500">{s.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                  disabled={!selectedStudentId || actionLoading}
                  onClick={handleAddMember}
                >
                  {actionLoading ? "Adding..." : "Add Member"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Member Modal */}
        {showRemoveMemberModal && selectedProject && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserMinus className="w-5 h-5 text-orange-500" />
                  Remove Student from Project
                </h2>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Project: <strong>{selectedProject.title}</strong>
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedProject.groupMembers
                  .filter((m) => {
                    const leaderId =
                      selectedProject.student?._id || selectedProject.student;
                    return m._id !== leaderId;
                  })
                  .map((m) => (
                    <label
                      key={m._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStudentId === m._id
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="removeMember"
                        checked={selectedStudentId === m._id}
                        onChange={() => setSelectedStudentId(m._id)}
                      />
                      <div>
                        <p className="font-medium text-slate-800">{m.name}</p>
                        <p className="text-sm text-slate-500">{m.email}</p>
                      </div>
                    </label>
                  ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  disabled={!selectedStudentId || actionLoading}
                  onClick={handleRemoveMember}
                >
                  {actionLoading ? "Removing..." : "Remove Member"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Leader Modal */}
        {showChangeLeaderModal && selectedProject && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                  Change Leader
                </h2>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Project: <strong>{selectedProject.title}</strong>
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedProject.groupMembers
                  .filter((m) => {
                    const leaderId =
                      selectedProject.student?._id || selectedProject.student;
                    return m._id !== leaderId;
                  })
                  .map((m) => (
                    <label
                      key={m._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStudentId === m._id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="newLeader"
                        checked={selectedStudentId === m._id}
                        onChange={() => setSelectedStudentId(m._id)}
                      />
                      <div>
                        <p className="font-medium text-slate-800">{m.name}</p>
                        <p className="text-sm text-slate-500">{m.email}</p>
                      </div>
                    </label>
                  ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={!selectedStudentId || actionLoading}
                  onClick={handleChangeLeader}
                >
                  {actionLoading ? "Changing..." : "Assign as Leader"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split Project Modal */}
        {showSplitModal && selectedProject && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-purple-500" />
                  Split Project
                </h2>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Original: <strong>{selectedProject.title}</strong>
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Select members to move to the new project. The remaining members
                stay in the original.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Project Title
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                  placeholder={`${selectedProject.title} (Split)`}
                  value={splitTitle}
                  onChange={(e) => setSplitTitle(e.target.value)}
                />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Move these members to the new project:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedProject.groupMembers.map((m) => (
                  <label
                    key={m._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      splitMembers.includes(m._id)
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={splitMembers.includes(m._id)}
                      onChange={() => {
                        setSplitMembers((prev) =>
                          prev.includes(m._id)
                            ? prev.filter((id) => id !== m._id)
                            : [...prev, m._id],
                        );
                      }}
                    />
                    <div>
                      <p className="font-medium text-slate-800">{m.name}</p>
                      <p className="text-sm text-slate-500">{m.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              {splitMembers.length > 0 &&
                splitMembers.length < selectedProject.groupMembers.length && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg text-sm text-purple-800 border border-purple-200">
                    <strong>Original:</strong>{" "}
                    {selectedProject.groupMembers
                      .filter((m) => !splitMembers.includes(m._id))
                      .map((m) => m.name)
                      .join(", ")}{" "}
                    → <strong>New:</strong>{" "}
                    {selectedProject.groupMembers
                      .filter((m) => splitMembers.includes(m._id))
                      .map((m) => m.name)
                      .join(", ")}
                  </div>
                )}
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  disabled={
                    splitMembers.length === 0 ||
                    splitMembers.length >=
                      selectedProject.groupMembers.length ||
                    actionLoading
                  }
                  onClick={handleSplitProject}
                >
                  {actionLoading ? "Splitting..." : "Split Project"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AssignedStudents;
