import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowDownToLine,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  LayoutGrid,
  List,
  Users,
  ChevronLeft,
} from "lucide-react";
import { downloadTeacherFile, getFiles } from "../../store/slices/teacherSlice";

const TeacherFiles = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null); // Quản lý nhóm đang chọn

  const dispatch = useDispatch();
  const filesFormStore = useSelector((state) => state.teacher.files) || [];

  useEffect(() => {
    dispatch(getFiles());
  }, [dispatch]);

  const deriveTypeFormatName = (name) => {
    if (!name) return "Other";
    const parts = name.split(".");
    return (parts[parts.length - 1] || "").toLowerCase();
  };

  const normalizeFile = (f) => {
    const type = deriveTypeFormatName(f.originalName) || f.fileType || "other";
    let category = "other";

    if (["pdf", "doc", "docx"].includes(type)) category = "report";
    else if (["ppt", "pptx"].includes(type)) category = "presentation";
    else if (
      [
        "zip",
        "rar",
        "7z",
        "js",
        "ts",
        "py",
        "java",
        "c",
        "cpp",
        "html",
        "css",
      ].includes(type)
    )
      category = "code";
    else if (["jpg", "jpeg", "png", "avif", "gif"].includes(type))
      category = "image";

    return {
      id: f._id,
      name: f.originalName,
      type: type.toUpperCase(),
      size: f.size || "-",
      student: f.studentName || "Unknown Student", // Default name nếu thiếu
      uploadedDate: f.uploadAt || f.createdAt || new Date().toISOString(),
      category,
      projectId: f.projectId || f.project?._id,
      fileId: f._id,
      groupName: f.groupName || null,
      projectTitle: f.projectTitle || null,
    };
  };

  const files = useMemo(() => {
    return (filesFormStore || []).map(normalizeFile);
  }, [filesFormStore]);

  // Nhóm files theo từng Nhóm dự án (Group) / Đề tài
  const filesByGroup = useMemo(() => {
    const grouped = {};
    files.forEach((file) => {
      const groupKey = file.projectId || file.groupName || `Student: ${file.student}`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(file);
    });
    return grouped;
  }, [files]);

  // Lấy danh sách nhóm từ object đã nhóm
  const groupList = useMemo(() => {
    return Object.keys(filesByGroup).map((groupKey) => {
      const groupFiles = filesByGroup[groupKey];
      const firstFile = groupFiles[0];
      return {
        key: groupKey,
        name: firstFile.groupName || "Individual Project",
        projectTitle: firstFile.projectTitle || "Untitled Project",
        studentName: firstFile.student || "Unknown Student",
        files: groupFiles,
        fileCount: groupFiles.length,
      };
    });
  }, [filesByGroup]);

  // Lọc các nhóm khi tìm kiếm ở màn hình chính
  const filteredGroups = groupList.filter((g) =>
    (g.name + " " + g.projectTitle + " " + g.studentName)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Lọc files khi đã chọn một nhóm cụ thể
  const currentGroupFiles = selectedGroup
    ? filesByGroup[selectedGroup] || []
    : [];

  const filteredFiles = currentGroupFiles.filter((file) => {
    const matchesType = filterType === "all" ? true : file.category === filterType;
    const matchesSearch = file.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesSearch && matchesType;
  });

  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return <FileText className="w-8 h-8 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-8 h-8 text-blue-500" />;
      case "ppt":
      case "pptx":
        return <FileSpreadsheet className="w-8 h-8 text-orange-500" />;
      case "zip":
      case "rar":
        return <FileArchive className="w-8 h-8 text-yellow-500" />;
      default:
        return <File className="w-8 h-8 text-slate-500" />;
    }
  };

  const handleDownloadFile = async (file) => {
    await dispatch(
      downloadTeacherFile({ projectId: file.projectId, fileId: file.fileId })
    ).then((res) => {
      const { blob } = res.payload;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.name || "download");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };

  // Tính toán Stats dựa trên màn hình hiện tại đang xem
  const filesToStat = selectedGroup ? currentGroupFiles : files;
  const fileStats = [
    {
      label: "Total Files",
      count: filesToStat.length,
      bg: "bg-blue-50",
      text: "text-blue-600",
      value: "text-blue-700",
    },
    {
      label: "Reports",
      count: filesToStat.filter((f) => f.category === "report").length,
      bg: "bg-green-50",
      text: "text-green-600",
      value: "text-green-700",
    },
    {
      label: "Presentations",
      count: filesToStat.filter((f) => f.category === "presentation").length,
      bg: "bg-orange-50",
      text: "text-orange-600",
      value: "text-orange-700",
    },
    {
      label: "Code Files",
      count: filesToStat.filter((f) => f.category === "code").length,
      bg: "bg-purple-50",
      text: "text-purple-600",
      value: "text-purple-700",
    },
    {
      label: "Images",
      count: filesToStat.filter((f) => f.category === "image").length,
      bg: "bg-pink-50",
      text: "text-pink-600",
      value: "text-pink-700",
    },
  ];

  const filesTableHeadData = ["File Name", "Type", "Upload Date", "Actions"];
  const groupsTableHeadData = ["Group / Student", "Project Title", "Total Files", "Actions"];

  // Handle back to group list
  const handleBackToGroups = () => {
    setSelectedGroup(null);
    setFilterType("all");
    setSearchTerm("");
  };

  const currentSelectedGroupName = selectedGroup
    ? groupList.find((g) => g.key === selectedGroup)?.name || "Group Files"
    : "";

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedGroup && (
                  <button
                    onClick={handleBackToGroups}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    title="Back to groups list"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div>
                  <h1 className="card-title">
                    {selectedGroup ? `${currentSelectedGroupName}'s Files` : "Groups Directory"}
                  </h1>
                  <p className="card-subtitle">
                    {selectedGroup
                      ? "Manage files uploaded by this student group"
                      : "Select a group to view their uploaded files"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controller */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {/* Chỉ hiện dropdown phân loại file khi đang xem chi tiết học sinh */}
              {selectedGroup && (
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input w-48 sm:w-64"
                >
                  <option value="all">All Files</option>
                  <option value="report">Report</option>
                  <option value="presentation">Presentation</option>
                  <option value="code">Code</option>
                  <option value="image">Images</option>
                </select>
              )}

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={selectedGroup ? "Search files..." : "Search groups..."}
                className="input w-full sm:w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-slate-100 hover:text-slate-600"
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-slate-100 hover:text-slate-600"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {/* Nếu đang xem danh sách Nhóm, hiện Total Groups */}
            {!selectedGroup && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-indigo-600">Total Groups</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {groupList.length}
                </p>
              </div>
            )}
            {fileStats.map((stat, index) => (
              <div key={index} className={`${stat.bg} p-4 rounded-lg`}>
                <p className={`text-sm ${stat.text}`}>{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.value}`}>
                  {stat.count}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* =============== XỬ LÝ RENDER THEO MÀN HÌNH =============== */}
        
        {/* MÀN HÌNH 1: DANH SÁCH NHÓM */}
        {!selectedGroup && (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "card overflow-x-auto"}>
            {viewMode === "grid" ? (
              filteredGroups.map((group) => (
                <div key={group.key} className="card hover:shadow-md transition-all duration-200 cursor-pointer border border-transparent hover:border-blue-200 flex flex-col justify-between" onClick={() => setSelectedGroup(group.key)}>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3">
                      <Users className="w-12 h-12 text-blue-500 bg-blue-50 p-2.5 rounded-2xl" />
                    </div>
                    <h3 className="font-bold text-slate-800 truncate w-full mb-1 text-base">
                      {group.name === "Individual Project" ? group.studentName : group.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate w-full mb-2 px-2" title={group.projectTitle}>
                      {group.projectTitle}
                    </p>
                    <p className="text-[11px] text-slate-400 mb-3 truncate w-full">
                      Student: {group.studentName}
                    </p>
                  </div>
                  <div className="flex flex-col items-center w-full">
                    <span className="text-xs font-semibold mb-4 bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                      {group.fileCount} uploaded file(s)
                    </span>
                    <button className="text-blue-600 font-bold w-full flex items-center justify-center py-2 gap-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-xs">
                      <File className="w-4 h-4" />
                      View Files
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <table className="min-w-full border border-slate-200">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {groupsTableHeadData.map((t) => (
                      <th key={t} className="py-3 px-4 text-left font-semibold">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => (
                    <tr key={group.key} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedGroup(group.key)}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Users className="w-6 h-6 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800 text-sm block">
                              {group.name === "Individual Project" ? group.studentName : group.name}
                            </span>
                            <span className="text-xs text-slate-500">{group.studentName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm max-w-xs truncate" title={group.projectTitle}>
                        {group.projectTitle}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600">
                          {group.fileCount} files
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroup(group.key);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-2.5 py-1.5 rounded-lg"
                        >
                          View Files
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredGroups.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500">
                No groups found.
              </div>
            )}
          </div>
        )}

        {/* MÀN HÌNH 2: CHI TIẾT FILES CỦA NHÓM ĐƯỢC CHỌN */}
        {selectedGroup && (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "card overflow-x-auto"}>
            {viewMode === "grid" ? (
              filteredFiles.map((file) => (
                <div key={file.id} className="card flex flex-col justify-between h-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3">{getFileIcon(file.type)}</div>
                    <h3 className="font-medium text-slate-800 truncate w-full text-sm" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-1 mt-1">{file.size}</p>
                    <p className="text-xs text-slate-500 mb-4">
                      {new Date(file.uploadedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="rounded-lg text-white text-sm font-medium w-full flex items-center justify-center py-2 gap-2 bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <ArrowDownToLine size={16} />
                    Download
                  </button>
                </div>
              ))
            ) : (
              <table className="min-w-full border border-slate-200">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {filesTableHeadData.map((t) => (
                      <th key={t} className="py-3 px-4 text-left font-semibold">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="border-t hover:bg-slate-50">
                      <td className="py-3 px-4 flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <span className="font-medium truncate max-w-xs text-sm" title={file.name}>
                          {file.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 text-sm">{file.type}</td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {new Date(file.uploadedDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium transition-colors text-xs"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredFiles.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500">
                No files found for this criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default TeacherFiles;