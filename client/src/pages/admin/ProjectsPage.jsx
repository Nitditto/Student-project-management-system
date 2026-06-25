import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
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
          toast.success("Phê duyệt đề tài thành công");
        }
      });
    } else if (newStatus === "rejected") {
      dispatch(rejectProject(projectId)).then((res) => {
        if (rejectProject.fulfilled.match(res)) {
          toast.success("Từ chối đề tài thành công");
        }
      });
    }
  };

  const projectStats = [
    {
      title: "Tổng số đề tài",
      value: projects.length,
      bg: "bg-blue-100",
      iconColor: "text-blue-600",
      Icon: Folder,
    },
    {
      title: "Đề tài chờ duyệt",
      value: projects.filter((p) => p.status === "pending").length,
      bg: "bg-orange-100",
      iconColor: "text-orange-600",
      Icon: AlertTriangle,
    },
    {
      title: "Đề tài hoàn thành",
      value: projects.filter((p) => p.status === "completed").length,
      bg: "bg-green-100",
      iconColor: "text-green-600",
      Icon: CheckCircle2,
    },
    {
      title: "Đề tài bị từ chối",
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
              <h1 className="card-title">Quản lý đề tài</h1>
              <p className="card-subtitle">
                Xem, phê duyệt, từ chối đề tài và quản lý báo cáo của sinh viên
              </p>
            </div>
            <button
              className="btn btn-primary flex items-center space-x-2 mt-4 md:mt-0"
              onClick={() => setIsReportsOpen(true)}
            >
              <FileDown className="w-5 h-5" />
              <span>Tải tất cả báo cáo</span>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tìm kiếm đề tài
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="Tìm kiếm theo tên đề tài hoặc sinh viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Lọc theo trạng thái
              </label>
              <select
                className="input w-full"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="rejected">Đã từ chối</option>
              </select>
            </div>

            <div className="">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Lọc theo giảng viên hướng dẫn
              </label>
              <select
                className="input w-full"
                value={filterSupervisor}
                onChange={(e) => setFilterSupervisor(e.target.value)}
              >
                <option value="all">Tất cả giảng viên</option>
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
            <h2 className="card-title">Danh sách đề tài tốt nghiệp</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Thông tin đề tài
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sinh viên thực hiện
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Giảng viên hướng dẫn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Hạn nộp đồ án
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Thao tác
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
                          Hạn chót: {project.deadline && project.deadline.split("T")[0]}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {project?.student?.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        Cập nhật cuối:{" "}
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
                          "Chưa phân công"
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
                        {project.status === "pending" ? "Chờ duyệt" : project.status === "approved" ? "Đã duyệt" : project.status === "rejected" ? "Bị từ chối" : project.status}
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
                          Xem chi tiết
                        </button>
                        {project.status === "pending" && (
                          <>
                            <button
                              className="btn-secondary"
                              onClick={() =>
                                handleStatusChange(project._id, "approved")
                              }
                            >
                              Duyệt đề tài
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() =>
                                handleStatusChange(project._id, "rejected")
                              }
                            >
                              Từ chối
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
              Không có đề tài nào phù hợp.
            </div>
          )}
        </div>

        {/* View modal */}
        {showViewModal && currentProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Chi tiết đề tài tốt nghiệp
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
                  <label className="label">Tên đề tài</label>
                  <div className="input bg-slate-50">
                    {currentProject?.title || "-"}
                  </div>
                </div>
                <div className="">
                  <label className="label">Mô tả đề tài</label>
                  <div className="input bg-slate-50">
                    {currentProject?.description || "-"}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="">
                    <label className="label">Sinh viên thực hiện</label>
                    <div className="input bg-slate-50">
                      {currentProject?.student?.name || "-"}
                    </div>
                  </div>
                  <div className="">
                    <label className="label">Giảng viên hướng dẫn</label>
                    <div className="input bg-slate-50">
                      {currentProject?.supervisor?.name || "-"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="">
                    <label className="label">Trạng thái</label>
                    <div className="input bg-slate-50">
                      {currentProject?.status}
                    </div>
                  </div>
                  <div className="">
                    <label className="label">Hạn nộp đồ án</label>
                    <div className="input bg-slate-50">
                      {currentProject?.deadline
                        ? new Date(currentProject.deadline).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="">
                  <label className="label">Tệp báo cáo đã nộp</label>
                  {(currentProject.files || []).length === 0 ? (
                    <div className="text-slate-500 text-sm">
                      Chưa nộp tệp nào
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
                  Tất cả tệp báo cáo
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
                  placeholder="Tìm kiếm tệp theo tên hoặc đề tài..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                />
              </div>
              {filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Không tìm thấy tệp nào phù hợp.
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
                        Tải xuống
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
