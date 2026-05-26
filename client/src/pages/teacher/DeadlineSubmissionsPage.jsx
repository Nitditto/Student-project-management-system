import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  MessageSquare,
  Download,
  Upload,
  X,
  Eye,
  CheckCircle,
  Loader,
  FileText,
  FileImage,
  FileCode,
  Users,
  Search,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { toast } from "react-toastify";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getFileType = (fileName = "") => {
  const ext = fileName.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "image";
  if (["pdf"].includes(ext)) return "pdf";
  if (["txt", "html", "css", "js", "jsx", "ts", "tsx", "json", "py", "java", "cpp", "c", "cs", "md", "xml", "yaml", "sh", "sql"].includes(ext))
    return "text";
  if (["docx", "doc", "pptx", "ppt", "xlsx", "xls"].includes(ext)) return "office";
  return "other";
};

const getFileIcon = (fileName = "", cls = "w-5 h-5 flex-shrink-0") => {
  const ext = fileName.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
    return <FileImage className={`${cls} text-indigo-500`} />;
  if (["pdf"].includes(ext)) return <FileText className={`${cls} text-red-500`} />;
  if (["html", "css", "js", "jsx", "ts", "tsx", "json", "py", "java", "cpp", "c", "cs", "md", "xml", "yaml"].includes(ext))
    return <FileCode className={`${cls} text-emerald-500`} />;
  return <FileText className={`${cls} text-blue-500`} />;
};

const getSubmittedFiles = (record) => {
  const list = [];
  const seen = new Set();

  (record?.projectFiles || []).forEach((f) => {
    if (f.fileUrl && !seen.has(f.fileUrl)) {
      list.push(f);
      seen.add(f.fileUrl);
    }
  });
  (record?.submission?.files || []).forEach((f) => {
    if (f.fileUrl && !seen.has(f.fileUrl)) {
      list.push(f);
      seen.add(f.fileUrl);
    }
  });
  if (list.length === 0 && record?.submission?.fileUrl) {
    list.push({
      fileUrl: record.submission.fileUrl,
      fileName: record.submission.fileName,
      uploadedAt: record.submission.submittedAt,
    });
  }
  return list;
};

// Initials avatar helper
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-pink-500", "bg-amber-500", "bg-cyan-500", "bg-rose-500",
];
const avatarColor = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── File Attachment Card (Google Classroom style) ─────────────────────────────

const FileCard = ({ file, deadlineId, groupId, navigate }) => {
  const fileType = getFileType(file.fileName);
  const fullUrl = `${import.meta.env.VITE_API_URL || ""}${file.fileUrl}`;

  const typeLabel = {
    pdf: "PDF",
    image: "Image",
    text: "Code / Text",
    office: "Office Doc",
    other: "File",
  }[fileType];

  const typeBg = {
    pdf: "bg-red-50 text-red-600 border-red-200",
    image: "bg-indigo-50 text-indigo-600 border-indigo-200",
    text: "bg-emerald-50 text-emerald-600 border-emerald-200",
    office: "bg-blue-50 text-blue-600 border-blue-200",
    other: "bg-slate-50 text-slate-600 border-slate-200",
  }[fileType];

  return (
    <div
      onClick={() =>
        navigate(
          `/teacher/deadlines/submissions/preview?deadlineId=${deadlineId}&groupId=${groupId}&fileUrl=${encodeURIComponent(file.fileUrl)}`
        )
      }
      className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200 active:scale-[0.98]"
      title={`Open ${file.fileName} in Online Reader`}
    >
      {/* Thumbnail area */}
      <div className="h-28 bg-slate-50 flex items-center justify-center border-b border-slate-100 group-hover:bg-blue-50/30 transition-colors">
        {fileType === "image" ? (
          <img
            src={fullUrl}
            alt={file.fileName}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {getFileIcon(file.fileName, "w-10 h-10")}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBg}`}>
              {typeLabel}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow text-xs font-bold text-blue-700">
            <Eye className="w-3.5 h-3.5" />
            Open Reader
          </div>
        </div>
      </div>

      {/* Info area */}
      <div className="p-3 space-y-1">
        <p className="text-xs font-bold text-slate-800 truncate" title={file.fileName}>
          {file.fileName}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : "—"}
          </span>
          <a
            href={fullUrl}
            download={file.fileName}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const DeadlineSubmissionsPage = () => {
  const { deadlineId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Tab state: "instructions" | "student-work"
  const [activeTab, setActiveTab] = useState("student-work");

  // Left sidebar selection
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState("");


  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/deadline/${deadlineId}/submissions`);
      const d = res.data.data;
      setData(d);
      // Default selection: first group
      if (!selectedGroupId && d.records?.length > 0) {
        setSelectedGroupId(d.records[0].project._id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineId]);

  // ── Derived data ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 animate-pulse font-medium">Loading submissions…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">Failed to load deadline data.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const { deadline, stats, records } = data;
  const isClosed = new Date() > new Date(deadline.endDate);

  // Categorise records for sidebar
  const graded = records.filter(
    (r) => r.submission?.feedback?.message || r.submission?.feedback?.fileName
  );
  const turnedIn = records.filter(
    (r) =>
      (r.status === "SUBMITTED" || r.status === "LATE") &&
      !(r.submission?.feedback?.message || r.submission?.feedback?.fileName)
  );
  const assigned = records.filter(
    (r) => r.status === "PENDING" || r.status === "MISSED"
  );

  const filterBySearch = (list) =>
    list.filter((r) =>
      (r.project.groupName || r.project.student?.name || "")
        .toLowerCase()
        .includes(sidebarSearch.toLowerCase())
    );

  // Selected record for right panel
  const selectedRecord = records.find((r) => r.project._id === selectedGroupId) || null;
  const selectedFiles = selectedRecord ? getSubmittedFiles(selectedRecord) : [];
  const hasFeedback =
    selectedRecord?.submission?.feedback?.message ||
    selectedRecord?.submission?.feedback?.fileName;

  // ── Sidebar student row ───────────────────────────────────────────────────

  const SidebarRow = ({ record, accent }) => {
    const name = record.project.groupName || record.project.student?.name || "Group";
    const isActive = selectedGroupId === record.project._id;
    const hasFb =
      record.submission?.feedback?.message || record.submission?.feedback?.fileName;

    return (
      <button
        onClick={() => setSelectedGroupId(record.project._id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${isActive
          ? "bg-blue-50 border border-blue-200/60"
          : "hover:bg-slate-50 border border-transparent"
          }`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full ${avatarColor(name)} text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 shadow-sm`}
        >
          {getInitials(name)}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold truncate ${isActive ? "text-blue-900" : "text-slate-700"}`}>
            {name}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {record.project.student?.email || ""}
          </p>
        </div>

        {/* Status pip */}
        {hasFb ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        ) : record.status === "SUBMITTED" || record.status === "LATE" ? (
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        ) : record.status === "MISSED" ? (
          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
        )}
      </button>
    );
  };

  // ── Section helper for sidebar ────────────────────────────────────────────

  const SidebarSection = ({ label, count, accent, records: list }) => {
    const filtered = filterBySearch(list);
    if (filtered.length === 0) return null;
    return (
      <div className="mb-2">
        <div className={`px-3 py-1.5 flex items-center gap-2`}>
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${accent}`}>
            {label}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500`}>
            {filtered.length}
          </span>
        </div>
        <div className="space-y-0.5 px-1">
          {filtered.map((r) => (
            <SidebarRow key={r.project._id} record={r} accent={accent} />
          ))}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0 flex flex-col h-[calc(100vh-80px)] bg-slate-50">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 pt-5 pb-0 flex-shrink-0 shadow-sm">
        <button
          onClick={() => navigate("/teacher/deadlines")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deadlines
        </button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900">{deadline.title}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${isClosed
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700 animate-pulse"
                  }`}
              >
                {isClosed ? (
                  <><XCircle className="w-3 h-3" /> Closed</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3" /> Active</>
                )}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Start: {new Date(deadline.startDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                Due: {new Date(deadline.endDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </span>
            </p>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 border-b-0">
          {[
            { id: "instructions", label: "Instructions", icon: BookOpen },
            { id: "student-work", label: "Student work", icon: ClipboardList },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Instructions ────────────────────────────────────────────── */}
      {activeTab === "instructions" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Description card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-3">Assignment Description</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {deadline.description || "No description provided."}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Groups", value: stats.totalGroups, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
                { label: "On Time", value: stats.submitted, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
                { label: "Late", value: stats.late, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
                { label: "Missing", value: stats.missing, color: "text-red-700", bg: "bg-red-50 border-red-200" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
                  <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
                  <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Student Work ────────────────────────────────────────────── */}
      {activeTab === "student-work" && (
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* ─── LEFT SIDEBAR ─────────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-sm">

            {/* Search */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search students…"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Top mini stats */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 flex-shrink-0">
              {[
                { label: "Turned in", value: turnedIn.length + graded.length, color: "text-blue-600" },
                { label: "Graded", value: graded.length, color: "text-emerald-600" },
                { label: "Assigned", value: assigned.length, color: "text-slate-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center py-2.5 px-1">
                  <span className={`text-lg font-extrabold ${color}`}>{value}</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto py-2 px-1">
              <SidebarSection
                label="Turned in"
                records={turnedIn}
                accent="text-blue-500"
              />
              <SidebarSection
                label="Graded"
                records={graded}
                accent="text-emerald-600"
              />
              <SidebarSection
                label="Assigned / Missing"
                records={assigned}
                accent="text-slate-500"
              />
              {records.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">No groups assigned.</p>
              )}
            </div>
          </div>

          {/* ─── RIGHT WORKSPACE ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
            {!selectedRecord ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-slate-400">
                <Users className="w-14 h-14 text-slate-300" />
                <p className="text-base font-bold text-slate-600">Select a group</p>
                <p className="text-sm">Click on a student group in the sidebar to view their submissions.</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">

                {/* Group header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full ${avatarColor(
                        selectedRecord.project.groupName || selectedRecord.project.student?.name || ""
                      )} text-white font-extrabold text-sm flex items-center justify-center shadow`}
                    >
                      {getInitials(
                        selectedRecord.project.groupName || selectedRecord.project.student?.name || ""
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-base">
                        {selectedRecord.project.groupName || "Unnamed Group"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedRecord.project.student?.name || ""} ·{" "}
                        {selectedRecord.project.student?.email || ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {selectedRecord.status === "SUBMITTED" && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> On Time
                      </span>
                    )}
                    {selectedRecord.status === "LATE" && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Late
                      </span>
                    )}
                    {selectedRecord.status === "MISSED" && (
                      <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Missing
                      </span>
                    )}
                    {selectedRecord.status === "PENDING" && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                    {/* Feedback button */}
                    <button
                      onClick={() =>
                        navigate(
                          `/teacher/deadlines/submissions/preview?deadlineId=${deadlineId}&groupId=${selectedRecord.project._id}`
                        )
                      }
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${hasFeedback
                        ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {hasFeedback ? "View Feedback" : "Add Feedback"}
                    </button>
                  </div>
                </div>

                {/* Submitted attachments */}
                {selectedRecord.submission?.submittedAt && (
                  <p className="text-xs text-slate-400 font-medium -mb-2 px-1">
                    Submitted on{" "}
                    {new Date(selectedRecord.submission.submittedAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}

                {selectedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl border border-slate-200 gap-3 text-slate-400">
                    <FileText className="w-12 h-12 text-slate-300" />
                    <p className="text-base font-bold text-slate-600">No files submitted</p>
                    <p className="text-sm">This group has not uploaded any files yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedFiles.map((file, idx) => (
                      <FileCard
                        key={idx}
                        file={file}
                        deadlineId={deadlineId}
                        groupId={selectedRecord.project._id}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                )}

                {/* Existing feedback preview */}
                {hasFeedback && (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
                    <p className="text-xs font-extrabold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Feedback from Teacher
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedRecord.submission.feedback.message}
                    </p>
                    {selectedRecord.submission.feedback.fileName && (
                      <div className="mt-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <a
                          href={`${import.meta.env.VITE_API_URL || ""}${selectedRecord.submission.feedback.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-purple-700 hover:underline"
                        >
                          {selectedRecord.submission.feedback.fileName}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeadlineSubmissionsPage;
