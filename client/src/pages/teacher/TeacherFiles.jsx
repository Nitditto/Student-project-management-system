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
  UserCircle
} from "lucide-react";
import { downloadTeacherFile, getFiles } from "../../store/slices/teacherSlice";

const TeacherFiles = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null); // Thêm state quản lý học sinh đang chọn

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
    };
  };

  const files = useMemo(() => {
    return (filesFormStore || []).map(normalizeFile);
  }, [filesFormStore]);

  // Nhóm files theo từng học sinh
  const filesByStudent = useMemo(() => {
    const grouped = {};
    files.forEach((file) => {
      if (!grouped[file.student]) {
        grouped[file.student] = [];
      }
      grouped[file.student].push(file);
    });
    return grouped;
  }, [files]);

  // Lấy danh sách học sinh từ object đã nhóm
  const studentList = useMemo(() => {
    return Object.keys(filesByStudent).map((studentName) => ({
      name: studentName,
      files: filesByStudent[studentName],
      fileCount: filesByStudent[studentName].length,
    }));
  }, [filesByStudent]);

  // Lọc học sinh (khi ở màn hình danh sách học sinh)
  const filteredStudents = studentList.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lọc files (khi đã chọn 1 học sinh cụ thể)
  const currentStudentFiles = selectedStudent
    ? filesByStudent[selectedStudent] || []
    : [];

  const filteredFiles = currentStudentFiles.filter((file) => {
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
    const res = await dispatch(
      downloadTeacherFile({ projectId: file.projectId, fileId: file.fileId })
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

  // Tính toán Stats dựa trên màn hình hiện tại đang xem
  const filesToStat = selectedStudent ? currentStudentFiles : files;
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
  const studentsTableHeadData = ["Student Name", "Total Files", "Actions"];

  // Handle back to student list
  const handleBackToStudents = () => {
    setSelectedStudent(null);
    setFilterType("all");
    setSearchTerm("");
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedStudent && (
                  <button
                    onClick={handleBackToStudents}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    title="Back to students list"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div>
                  <h1 className="card-title">
                    {selectedStudent ? `${selectedStudent}'s Files` : "Students Directory"}
                  </h1>
                  <p className="card-subtitle">
                    {selectedStudent
                      ? "Manage files uploaded by this student"
                      : "Select a student to view their files"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controller */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {/* Chỉ hiện dropdown phân loại file khi đang xem chi tiết học sinh */}
              {selectedStudent && (
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
                placeholder={selectedStudent ? "Search files..." : "Search students..."}
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
            {/* Nếu đang xem danh sách HS, thay vì total files ta có thể hiện Total Students */}
            {!selectedStudent && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-indigo-600">Total Students</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {studentList.length}
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
        
        {/* MÀN HÌNH 1: DANH SÁCH HỌC SINH */}
        {!selectedStudent && (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "card overflow-x-auto"}>
            {viewMode === "grid" ? (
              filteredStudents.map((student) => (
                <div key={student.name} className="card hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-200" onClick={() => setSelectedStudent(student.name)}>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3">
                      <UserCircle className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="font-medium text-slate-800 truncate w-full mb-1">
                      {student.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4 bg-slate-100 px-3 py-1 rounded-full">
                      {student.fileCount} uploaded file(s)
                    </p>
                    <button className="text-blue-600 font-medium w-full flex items-center justify-center py-2 gap-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
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
                    {studentsTableHeadData.map((t) => (
                      <th key={t} className="py-3 px-4 text-left font-semibold">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.name} className="border-t hover:bg-slate-50">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <UserCircle className="w-6 h-6 text-slate-400" />
                        <span className="font-medium">{student.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-sm text-slate-600">
                          {student.fileCount} files
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedStudent(student.name)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Files
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredStudents.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500">
                No students found.
              </div>
            )}
          </div>
        )}

        {/* MÀN HÌNH 2: CHI TIẾT FILES CỦA HỌC SINH ĐƯỢC CHỌN */}
        {selectedStudent && (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "card overflow-x-auto"}>
            {viewMode === "grid" ? (
              filteredFiles.map((file) => (
                <div key={file.id} className="card">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3">{getFileIcon(file.type)}</div>
                    <h3 className="font-medium text-slate-800 truncate w-full" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-1 mt-1">{file.size}</p>
                    <p className="text-xs text-slate-500 mb-4">
                      {new Date(file.uploadedDate).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="rounded-lg text-white text-base font-medium w-full flex items-center justify-center py-2.5 gap-2 bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <ArrowDownToLine size={20} />
                      Download
                    </button>
                  </div>
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
                        <span className="font-medium truncate max-w-xs" title={file.name}>
                          {file.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">{file.type}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(file.uploadedDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium transition-colors"
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