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
} from "lucide-react";
import { downloadTeacherFile, getFiles } from "../../store/slices/teacherSlice";

const TeacherFiles = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
      student: f.studentName || "-",
      uploadedDate: f.uploadAt || f.createdAt || new Date().toISOString(),
      category,
      projectId: f.projectId || f.project?._id,
      fileId: f._id,
    };
  };

  const files = useMemo(() => {
    return (filesFormStore || []).map(normalizeFile);
  }, [filesFormStore]);

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

  const filteredFiles = files.filter((file) => {
    const matchesType =
      filterType === "all" ? true : file.category === filterType;
    const matchesSearch = file.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesSearch && matchesType;
  });

  const handleDownloadFile = async (file) => {
    const res = await dispatch(
      downloadTeacherFile({ projectId: file.projectId, fileId: file.fileId }),
    ).then((res) => {
      const { blob } = res.payload;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.originalName || "download");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };

  const fileStats = [
    {
      label: "Total Files",
      count: files.length,
      bg: "bg-blue-50",
      text: "text-blue-600",
      value: "text-blue-700",
    },
    {
      label: "Reports",
      count: files.filter((f) => f.category === "report").length,
      bg: "bg-green-50",
      text: "text-green-600",
      value: "text-green-700",
    },
    {
      label: "Presentations",
      count: files.filter((f) => f.category === "presentation").length,
      bg: "bg-orange-50",
      text: "text-orange-600",
      value: "text-orange-700",
    },
    {
      label: "Code Files",
      count: files.filter((f) => f.category === "code").length,
      bg: "bg-purple-50",
      text: "text-purple-600",
      value: "text-purple-700",
    },
    {
      label: "Images",
      count: files.filter((f) => f.category === "image").length,
      bg: "bg-pink-50",
      text: "text-pink-600",
      value: "text-pink-700",
    },
  ];

  const tableHeadData = [
    "File Name",
    "Student",
    "Type",
    "Upload Date",
    "Actions",
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h1 className="card-title">Student Files</h1>
              <p className="card-subtitle">
                Manage files shared with and received from students
              </p>
            </div>
          </div>

          {/* Controller */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input w-96"
              >
                <option value="all">All Files</option>
                <option value="report">Report</option>
                <option value="presentation">Presentation</option>
                <option value="code">Code</option>
                <option value="image">Images</option>
              </select>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files..."
                className="input w-56"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 hover:text-slate-600"}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 hover:text-slate-600"}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* File Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
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

        {/* Files display */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFiles.map((file) => (
              <div key={file.id} className="card">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3">{getFileIcon(file.type)}</div>
                  <h3
                    className="font-medium text-slate-800 truncate w-full"
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">{file.student}</p>
                  <p className="text-xs text-slate-500 mb-1">{file.size}</p>
                  <p className="text-xs text-slate-500 mb-4">
                    {new Date(file.uploadedDate).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="rounded-lg text-white text-lg font-medium w-full flex items-center justify-center py-3 gap-3 bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
                    >
                      <ArrowDownToLine size={22} />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full border border-slate-200 font-semibold">
              <thead className="bg-slate-50 text-slate-700">
                <tr className="">
                  {tableHeadData.map((t) => {
                    return (
                      <th key={t} className="py-3 px-4 text-left font-semibold">
                        {t}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => {
                  return (
                    <tr key={file.id} className="border-t hover:bg-slate-50">
                      <td className="py-3 px-4">
                        {getFileIcon(file.type)}{" "}
                        <span className="font-medium">{file.name}</span>
                      </td>
                      <td className="py-3 px-4">{file.student}</td>
                      <td className="py-3 px-4">{file.type}</td>
                      <td className="py-3 px-4">
                        {new Date(file.uploadedDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="btn-primary btn-small"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default TeacherFiles;
