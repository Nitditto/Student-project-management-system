import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  downloadFile,
  fetchProject,
  uploadFiles,
} from "../../store/slices/studentSlice";
import { fetchStudentDeadlines } from "../../store/slices/deadlineSlice";
import {
  Archive,
  File,
  FileText,
  FileCode,
  FilePlus,
  FolderOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  MessageSquare,
  HelpCircle,
  Eye,
  AlertTriangle
} from "lucide-react";

const UploadFiles = () => {
  const dispatch = useDispatch();

  const { project, files } = useSelector((state) => state.student);
  const { deadlines } = useSelector((state) => state.deadline);

  const [activeTab, setActiveTab] = useState("general"); // "general" or "submissions"
  const [selectedFiles, setSelectedFiles] = useState([]);

  const reportRef = useRef(null);
  const presRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProject());
    dispatch(fetchStudentDeadlines());
  }, [dispatch]);

  const handleFilePick = (e) => {
    const list = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...list]);
    e.target.value = "";
  };

  const handleUpload = (e) => {
    if (selectedFiles.length === 0) return;
    dispatch(uploadFiles({ projectId: project?._id, files: selectedFiles }));
    setSelectedFiles([]);
  };

  const removeSelected = (name) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return <File className="w-5 h-5 text-slate-500" />;
    const extension = fileName.split(".").pop().toLowerCase();
    const Icon = ({ className }) => <File className={className} />;
    const color =
      extension === "pdf"
        ? "text-red-500"
        : ["doc", "docx"].includes(extension)
          ? "text-blue-500"
          : ["ppt", "pptx"].includes(extension)
            ? "text-orange-500"
            : "text-slate-500";
    return <Icon className={`w-5 h-5 ${color}`} />;
  };

  const handleDownloadFile = async (file) => {
    if (!project?._id || !file?._id) return;
    await dispatch(
      downloadFile({ projectId: project._id, fileId: file._id }),
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

  const generalFiles = (project?.files || []).filter(
    (f) => f.fileCategory === "General" || !f.fileCategory
  );

  return (
    <>
      <div className="space-y-6">
        {/* Beautiful Tabs Header */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-4 rounded-t-2xl shadow-sm">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-4 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 outline-none ${activeTab === "general"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <FolderOpen className="w-4 h-4" />
            Tài liệu chung (General Files)
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`pb-4 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 outline-none ${activeTab === "submissions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <Calendar className="w-4 h-4" />
            Bài nộp (Deadline Submissions)
          </button>
        </div>

        {activeTab === "general" ? (
          <>
            <div className="card">
              <div className="card-header">
                <h1 className="card-title">Upload Project Files</h1>
                <p className="card-subtitle">
                  Upload your project documents including reports, presentations,
                  and code files.
                </p>
              </div>

              {/* Upload section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <div className="mb-4">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-slate-800">
                    Report
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Upload your project report (PDF, DOC)
                  </p>
                  <button
                    className="btn-outline cursor-pointer"
                    onClick={() => reportRef.current.click()}
                  >
                    Choose File
                  </button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFilePick}
                    ref={reportRef}
                    multiple
                  />
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <div className="mb-4">
                    <Archive className="w-12 h-12 text-slate-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-slate-800">
                    Presentation
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Upload your project presentation (PPT, PPTX, PDF)
                  </p>
                  <button
                    className="btn-outline cursor-pointer"
                    onClick={() => presRef.current.click()}
                  >
                    Choose File
                  </button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".ppt,.pptx,.pdf"
                    onChange={handleFilePick}
                    ref={presRef}
                    multiple
                  />
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <div className="mb-4">
                    <FileCode className="w-12 h-12 text-slate-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-slate-800">
                    Code Files
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Upload your source code (ZIP, RAR)
                  </p>
                  <button
                    className="btn-outline cursor-pointer"
                    onClick={() => codeRef.current.click()}
                  >
                    Choose File
                  </button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".zip,.rar,.tar,.gz"
                    onChange={handleFilePick}
                    ref={codeRef}
                    multiple
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button className="btn-primary" onClick={handleUpload}>
                  Upload Selected Files
                </button>
              </div>
            </div>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Ready to Upload</h2>
                </div>
                <div className="space-y-3">
                  {selectedFiles.map((file, index) => {
                    return (
                      <div
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                        key={`${file.name}-${index}`}
                      >
                        <div className="flex items-center space-x-4">
                          {getFileIcon(file.name)}
                          <div className="">
                            <p className="text-slate-800 font-medium">
                              {file.name}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <span>
                                {(file.size / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="btn-danger btn-small"
                          onClick={() => removeSelected(file.name)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General Uploaded Files list */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Uploaded General Files</h2>
                <p className="card-subtitle">Manage your shared resource and general files</p>
              </div>

              {generalFiles.length === 0 ? (
                <div className="text-center py-6">
                  <FilePlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No general files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generalFiles.map((file) => (
                    <div
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      key={file._id || file.fileUrl}
                    >
                      <div className="flex items-center space-x-4">
                        {getFileIcon(file.originalName)}
                        <div className="">
                          <p className="font-medium text-slate-800">
                            {file.originalName}
                          </p>
                          <div className="flex items-center space-x-4 text-slate-600">
                            <span>{file.fileType || "File"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          className="btn-outline btn-small"
                          onClick={() => handleDownloadFile(file)}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Tab 2: Deadline Submissions */
          <div className="space-y-4">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Deadline Submissions Tracker</h2>
                <p className="card-subtitle">Verify your submitted files and check supervisor feedback</p>
              </div>

              {/* General Project Feedback Section */}
              {project?.feedback && project.feedback.length > 0 && (
                <div className="mb-6 mx-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
                  <h3 className="text-sm font-extrabold text-purple-900 flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    Past General Feedback
                  </h3>
                  <div className="space-y-3">
                    {project.feedback.map((fb, idx) => (
                      <div key={idx} className="bg-white/80 p-3 rounded-xl border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fb.type === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                            fb.type === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {fb.type === 'positive' ? 'Positive' : fb.type === 'negative' ? 'Needs Revision' : 'General'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-bold mb-0.5">{fb.title}</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{fb.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deadlines.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100/50">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No deadlines active for your project supervisor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deadlines.map((dl) => {
                    const submission = dl.submission;
                    const hasFeedback = submission?.feedback?.message || submission?.feedback?.fileName;

                    return (
                      <div key={dl._id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
                        {/* Deadline Header */}
                        <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-800 text-base">{dl.title}</h3>
                            <p className="text-xs text-slate-500">{dl.description}</p>
                          </div>

                          <div className="flex items-center space-x-2 text-xs font-semibold">
                            <span className="text-slate-500">Due: {new Date(dl.endDate).toLocaleDateString()}</span>

                            {dl.submissionStatus === "SUBMITTED" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                              </span>
                            )}
                            {dl.submissionStatus === "LATE" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-0.5">
                                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Late
                              </span>
                            )}
                            {dl.submissionStatus === "MISSED" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-0.5">
                                <XCircle className="w-3.5 h-3.5" /> Missed
                              </span>
                            )}
                            {dl.submissionStatus === "PENDING" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-0.5">
                                <Clock className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submission Details */}
                        <div className="p-4 space-y-4">
                          {submission && (submission.status === "SUBMITTED" || submission.status === "LATE") ? (
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/50">
                              <div className="flex items-center space-x-3">
                                {getFileIcon(submission.fileName)}
                                <div>
                                  <p className="font-medium text-slate-800 text-sm">{submission.fileName}</p>
                                  <p className="text-[10px] text-slate-400">
                                    Submitted on: {new Date(submission.submittedAt || submission.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {(() => {
                                const matchedFile = (project?.files || []).find(
                                  f => f.fileCategory === "Submission" && f.deadlineId?.toString() === dl._id.toString()
                                );

                                if (matchedFile) {
                                  return (
                                    <button
                                      onClick={() => handleDownloadFile(matchedFile)}
                                      className="btn-outline btn-small flex items-center space-x-1"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </button>
                                  );
                                }

                                return (
                                  <a
                                    href={`${import.meta.env.VITE_API_URL || ""}${submission.fileUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-outline btn-small flex items-center space-x-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View File</span>
                                  </a>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200">
                              <HelpCircle className="w-4 h-4 text-slate-400" />
                              <span>No files submitted for this deadline yet. Please submit on the deadlines notice page.</span>
                            </div>
                          )}

                          {/* Teacher Feedback Block */}
                          {hasFeedback && (
                            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
                              <div className="flex items-center space-x-1 text-purple-900 font-bold text-sm">
                                <MessageSquare className="w-4 h-4 text-purple-700" />
                                <span>Teacher's Feedback Review</span>
                              </div>

                              {submission.feedback.message && (
                                <p className="text-slate-700 text-sm leading-relaxed">{submission.feedback.message}</p>
                              )}

                              {submission.feedback.fileUrl && (
                                <div className="flex items-center justify-between p-2.5 bg-white border border-purple-200 rounded-lg">
                                  <div className="flex items-center space-x-2 text-xs font-semibold text-purple-950">
                                    {getFileIcon(submission.feedback.fileName)}
                                    <span className="max-w-[250px] truncate">{submission.feedback.fileName}</span>
                                  </div>
                                  <a
                                    href={`${import.meta.env.VITE_API_URL || ""}${submission.feedback.fileUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1 text-xs font-bold text-purple-700 hover:text-purple-900"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download Feedback File</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UploadFiles;
