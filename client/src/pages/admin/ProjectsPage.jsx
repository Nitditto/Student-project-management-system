import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  approveProject,
  rejectProject,
  getAllProjects,
  getProject,
} from "../../store/slices/adminSlice";
import {
  Folder,
  AlertTriangle,
  CheckCircle2,
  X,
  FileDown,
  Eye,
  Search,
  Filter,
  User,
} from "lucide-react";
import { downloadProjectFile } from "../../store/slices/projectSlice";

const ProjectsPage = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSupervisor, setFilterSupervisor] = useState("all");
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [reportSearch, setReportSearch] = useState("");

  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentProject, setCurrentProject] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    deadline: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const dispatch = useDispatch();
  const { projects } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(getAllProjects());
  }, [dispatch]);

  const supervisor = useMemo(() => {
    const set = new Set();
    (projects || []).forEach((project) => {
      if (project?.supervisor?.name) {
        set.add(project.supervisor.name);
      }
    });
    return Array.from(set);
  }, [projects]);

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch =
      (project?.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project?.student?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || project?.status === filterStatus;
    const matchesSupervisor =
      filterSupervisor === "all" ||
      project?.supervisor?.name === filterSupervisor;
    return matchesSearch && matchesStatus && matchesSupervisor;
  });

  const files = useMemo(() => {
    return (projects || []).flatMap((project) =>
      (project.files || []).map((f) => ({
        projectId: project._id,
        fileId: f._id,
        originName: f.originalName,
        uploadedAt: f.uploadedAt,
        projectTitle: project.title,
        studentName: project.student?.name,
      })),
    );
  }, [projects]);

  const filteredFiles = files?.filter(
    (file) =>
      (file.originName || "")
        .toLowerCase()
        .includes(reportSearch.toLowerCase()) ||
      (file.projectTitle || "")
        .toLowerCase()
        .includes(reportSearch.toLowerCase()) ||
      (file.studentName || "")
        .toLowerCase()
        .includes(reportSearch.toLowerCase()),
  );

  const handleDownloadFile = async (file) => {
    const res = await dispatch(
      downloadProjectFile({ projectId: file.projectId, fileId: file.fileId }),
    ).then((res) => {
      const { blob } = res.payload;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.originName || "download");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
      }
  };

  const handleStatusChange = async (projectId, newStatus) => {
    if (newStatus === "approved") {
      dispatch(approveProject(projectId)).then((res) => {
        if (approveProject.fulfilled.match(res)) {
          toast.success(t("admin.projects.toastApprove"));
        }
      });
    } else if (newStatus === "rejected") {
      dispatch(rejectProject(projectId)).then((res) => {
        if (rejectProject.fulfilled.match(res)) {
          toast.success(t("admin.projects.toastReject"));
        }
      });
    }
  };

  const projectStats = [
    {
      title: t("admin.projects.total"),
      value: projects.length,
      bg: "bg-blue-100",
      iconColor: "text-blue-600",
      Icon: Folder,
    },
    {
      title: t("admin.projects.pending"),
      value: projects.filter((p) => p.status === "pending").length,
      bg: "bg-orange-100",
      iconColor: "text-orange-600",
      Icon: AlertTriangle,
    },
    {
      title: t("admin.projects.completed"),
      value: projects.filter((p) => p.status === "completed").length,
      bg: "bg-green-100",
      iconColor: "text-green-600",
      Icon: CheckCircle2,
    },
    {
      title: t("admin.projects.rejected"),
      value: projects.filter((p) => p.status === "rejected").length,
      bg: "bg-red-100",
      iconColor: "text-red-600",
      Icon: X,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="card">
          <div className="card-header flex flex-col md:flex-row items-start justify-between md:items-center">
            <div className="">
              <h1 className="card-title">{t("admin.projects.title")}</h1>
              <p className="card-subtitle">
                {t("admin.projects.subtitle")}
              </p>
            </div>
            <button
              className="btn btn-primary flex items-center space-x-2 mt-4 md:mt-0"
              onClick={() => setIsReportsOpen(true)}
            >
              <FileDown className="w-5 h-5" />
              <span>{t("admin.projects.downloadReports")}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {projectStats.map((stat, index) => (
            <div key={index} className="card">
              <div className="flex items-center">
                <div className={`p-3 ${stat.bg} rounded-lg`}>
                  <stat.Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </p>
                  <p className="text-lg font-semibold text-slate-800">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label
                className="block text-sm font-medium text-slate-700 mb-2 
              "
              >
                {t("admin.projects.searchLabel")}
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder={t("admin.projects.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-slate-700 mb-2 
              "
              >
                {t("admin.projects.filterStatus")}
              </label>
              <select
                className="input w-full"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">{t("admin.projects.allProjects")}</option>
                <option value="pending">{t("admin.projects.pendingReview")}</option>
                <option value="approved">{t("admin.projects.approved")}</option>
                <option value="completed">{t("admin.projects.completedProjects")}</option>
                <option value="rejected">{t("admin.projects.rejectedProjects")}</option>
              </select>
            </div>

            <div className="">
              <label
                className="block text-sm font-medium text-slate-700 mb-2 
              "
              >
                {t("admin.projects.filterSupervisor")}
              </label>
              <select
                className="input w-full"
                value={filterSupervisor}
                onChange={(e) => setFilterSupervisor(e.target.value)}
              >
                <option value="all">{t("admin.projects.allSupervisors")}</option>
                {supervisor.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t("admin.projects.listTitle")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("admin.projects.colDetails")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("admin.projects.colStudent")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("admin.projects.colSupervisor")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("admin.projects.colDeadline")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("admin.projects.colStatus")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("admin.projects.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredProjects.map((project) => (
                  <tr key={project._id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {project.title}
                        </div>
                        <div className="text-sm text-slate-500 max-w-xs truncate">
                          {project.description}
                        </div>
                        <div className="text-xs text-slate-400">
                          Due:{" "}
                          {project.deadline && project.deadline.split("T")[0]}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {project?.student?.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        Last Update:{" "}
                        {project?.updatedAt
                          ? new Date(project?.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm text-slate-900 inline-flex items-center px-2.5 py-0.5 rounded-full font-medium">
                        {project.supervisor?.name ? (
                          <span className="bg-green-100 text-green-800">
                            {project.supervisor?.name}
                          </span>
                        ) : (
                          t("student.supervisor.notAssigned")
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-3 whitespace-nowrap">
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex capitalize items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
                      >
                        {project.status === "pending" ? t("student.supervisor.statusPending") : project.status === "approved" ? t("student.supervisor.statusApproved") : project.status === "rejected" ? t("student.supervisor.statusRejected") : project.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={async () => {
                            const res = await dispatch(getProject(project._id));
                            if (!getProject.fulfilled.match(res)) return;
                            const detail = res.payload?.project || res.payload;
                            setCurrentProject(detail);
                            setShowViewModal(true);
                          }}
                          className="btn-primary"
                        >
                          {t("admin.projects.view")}
                        </button>
                        {project.status === "pending" && (
                          <>
                            <button
                              className="btn-secondary"
                              onClick={() =>
                                handleStatusChange(project._id, "approved")
                              }
                            >
                              {t("admin.projects.approve")}
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() =>
                                handleStatusChange(project._id, "rejected")
                              }
                            >
                              {t("admin.projects.reject")}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProjects.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              {t("admin.assign.noStudents")}
            </div>
          )}
        </div>

        {/* View modal */}
        {showViewModal && currentProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("admin.projects.modalTitle")}
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="">
                  <label className="label">{t("student.db.title")}</label>
                  <div className="input bg-slate-50">
                    {currentProject?.title || "-"}
                  </div>
                </div>
                <div className="">
                  <label className="label">{t("admin.projects.desc")}</label>
                  <div className="input bg-slate-50">
                    {currentProject?.description || "-"}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="">
                    <label className="label">{t("admin.projects.student")}</label>
                    <div className="input bg-slate-50">
                      {currentProject?.student?.name || "-"}
                    </div>
                  </div>
                  <div className="">
                    <label className="label">{t("admin.projects.colSupervisor")}</label>
                    <div className="input bg-slate-50">
                      {currentProject?.supervisor?.name || "-"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="">
                    <label className="label">{t("student.db.status")}</label>
                    <div className="input bg-slate-50">
                      {currentProject?.status}
                    </div>
                  </div>
                  <div className="">
                    <label className="label">{t("admin.projects.colDeadline")}</label>
                    <div className="input bg-slate-50">
                      {currentProject?.deadline
                        ? new Date(currentProject.deadline).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="">
                  <label className="label">{t("admin.projects.files")}</label>
                  {(currentProject.files || []).length === 0 ? (
                    <div className="text-slate-500 text-sm">
                      {t("admin.projects.noFiles")}
                    </div>
                  ) : (
                    <ul className="list-disc list-inside text-sm text-slate-700">
                      {currentProject.files.map((file) => (
                        <li key={file._id || file.fileUrl}>
                          {file.originalName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports modal */}
        {isReportsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("admin.db.allFiles")}
                </h3>
                <button
                  onClick={() => setIsReportsOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  className="input w-full"
                  placeholder={t("admin.db.searchFilesPlaceholder")}
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                />
              </div>
              {filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {t("admin.db.noFilesFound")}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFiles.map((file) => (
                    <div
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      key={`${file.projectId}-${file.fileId}`}
                    >
                      <div className="">
                        <div className="font-medium text-slate-800">
                          {file.originName}
                        </div>
                        <div className="text-sm text-slate-500">
                          {file.projectTitle} - {file.studentName}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="btn-outline btn-small whitespace-nowrap ml-4"
                      >
                        {t("admin.db.download")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectsPage;
