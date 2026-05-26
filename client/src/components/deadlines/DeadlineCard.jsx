import React, { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { submitDeadline, unsubmitDeadline } from "../../store/slices/deadlineSlice";
import { UploadCloud, FileText, AlertCircle, CheckCircle2, Clock, XCircle, Trash2, Calendar, X, Download } from "lucide-react";

const DeadlineCard = ({ deadline }) => {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const isOverdue = deadline.isOverdue;
  const status = deadline.submissionStatus;

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearAllFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    await dispatch(submitDeadline({ deadlineId: deadline._id, files }));
    setFiles([]);
    setLoading(false);
  };

  const handleUnsubmit = async () => {
    setLoading(true);
    await dispatch(unsubmitDeadline(deadline._id));
    setLoading(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderStatusBadge = () => {
    if (status === "SUBMITTED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/40 shadow-sm animate-pulse">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Turned In
        </span>
      );
    }
    if (status === "MISSED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200/40 shadow-sm">
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Missed
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200/40 shadow-sm">
          <AlertCircle className="w-3.5 h-3.5 mr-1" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200/40 shadow-sm">
        <Clock className="w-3.5 h-3.5 mr-1" />
        Assigned
      </span>
    );
  };

  // Helper to extract list of submitted files
  const getSubmittedFiles = () => {
    if (deadline.submission?.files && deadline.submission.files.length > 0) {
      return deadline.submission.files;
    }
    if (deadline.submission?.fileUrl) {
      return [{
        fileUrl: deadline.submission.fileUrl,
        fileName: deadline.submission.fileName || "Submitted File",
        uploadedAt: deadline.submission.submittedAt
      }];
    }
    return [];
  };

  const submittedFiles = getSubmittedFiles();

  return (
    <div className="bg-white hover:bg-slate-50/50 hover:shadow-md transition-all duration-300 p-6 rounded-2xl border border-slate-100 flex flex-col h-full relative group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
          {deadline.title}
        </h3>
        <div className="ml-2 flex-shrink-0">
          {renderStatusBadge()}
        </div>
      </div>
      
      <p className="text-sm text-slate-500 mb-5 flex-grow line-clamp-3 leading-relaxed">
        {deadline.description}
      </p>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <Calendar className="w-4 h-4 mr-2.5 text-blue-500 flex-shrink-0" />
          <span className="text-slate-400 font-semibold mr-2 text-xs uppercase tracking-wider">Due Date:</span>
          <span className={`text-xs font-bold ${isOverdue && status !== "SUBMITTED" ? "text-red-500" : "text-slate-700"}`}>
            {deadline.endDate ? new Date(deadline.endDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"}
          </span>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-100 pt-5 space-y-4">
        {status === "PENDING" && !isOverdue && (
          <div className="space-y-3">
            <div>
              <input
                type="file"
                id={`file-upload-${deadline._id}`}
                className="hidden"
                onChange={handleFileSelect}
                ref={fileInputRef}
                multiple
              />
              <label
                htmlFor={`file-upload-${deadline._id}`}
                className="flex flex-col items-center justify-center w-full py-5 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 hover:border-blue-400 transition-all text-center select-none"
              >
                <div className="flex flex-col items-center justify-center px-4">
                  <UploadCloud className="w-8 h-8 mb-2.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <p className="text-xs text-slate-600 font-semibold">
                    <span className="text-blue-600 hover:underline">Select multiple files</span> or drag-drop
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">PDF, Word, Images, Zip up to 10MB each</p>
                </div>
              </label>
            </div>

            {/* Selected Files Queue */}
            {files.length > 0 && (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-1">
                  <span>Selected ({files.length})</span>
                  <button 
                    onClick={clearAllFiles} 
                    className="text-red-500 hover:text-red-700 hover:underline text-[10px] transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-blue-50/40 hover:bg-blue-50 border border-blue-100/40 rounded-xl transition-all duration-200 group/file">
                    <div className="flex items-center space-x-2.5 overflow-hidden mr-2">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-xs text-blue-800 font-semibold truncate max-w-[150px]" title={f.name}>
                        {f.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({formatFileSize(f.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={handleUpload} 
              disabled={files.length === 0 || loading} 
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                  <span>Turning in...</span>
                </span>
              ) : (
                <span>Turn In ({files.length} files)</span>
              )}
            </button>
          </div>
        )}

        {status === "SUBMITTED" && !isOverdue && (
          <div className="space-y-4">
            <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Submitted Work:</div>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {submittedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white border border-emerald-100/40 rounded-xl group/sub-file">
                    <div className="flex items-center space-x-2 overflow-hidden mr-2">
                      <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs text-slate-700 font-semibold truncate max-w-[160px]" title={f.fileName}>
                        {f.fileName}
                      </span>
                    </div>
                    <a 
                      href={`${import.meta.env.VITE_API_URL}${f.fileUrl}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors flex-shrink-0"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-emerald-600/80 font-medium">
                Submitted on {deadline.submission?.submittedAt ? new Date(deadline.submission.submittedAt).toLocaleDateString([], {dateStyle: 'medium'}) : ""}
              </p>
            </div>
            <button 
              onClick={handleUnsubmit} 
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition-all duration-200 disabled:opacity-50 transform active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {loading ? "Canceling..." : "Cancel Submission"}
            </button>
          </div>
        )}

        {isOverdue && status !== "SUBMITTED" && (
          <div className="flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center">
            <AlertCircle className="w-5 h-5 mr-2.5 flex-shrink-0" />
            <span className="text-sm font-bold">Submission Closed</span>
          </div>
        )}

        {isOverdue && status === "SUBMITTED" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Work:</div>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {submittedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200/50 rounded-xl">
                    <div className="flex items-center space-x-2 overflow-hidden mr-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600 font-semibold truncate max-w-[160px]" title={f.fileName}>
                        {f.fileName}
                      </span>
                    </div>
                    <a 
                      href={`${import.meta.env.VITE_API_URL}${f.fileUrl}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center p-3 bg-slate-100/70 text-slate-400 rounded-xl">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs font-bold">Deadline passed - Cannot edit</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeadlineCard;
