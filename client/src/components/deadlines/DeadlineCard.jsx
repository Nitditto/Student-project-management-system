import React, { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { submitDeadline, unsubmitDeadline } from "../../store/slices/deadlineSlice";
import { UploadCloud, FileText, AlertCircle, CheckCircle2, Clock, XCircle, Trash2, Calendar } from "lucide-react";

const DeadlineCard = ({ deadline }) => {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const isOverdue = deadline.isOverdue;
  const status = deadline.submissionStatus;

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    await dispatch(submitDeadline({ deadlineId: deadline._id, file }));
    setFile(null);
    setLoading(false);
  };

  const handleUnsubmit = async () => {
    setLoading(true);
    await dispatch(unsubmitDeadline(deadline._id));
    setLoading(false);
  };

  const renderStatusBadge = () => {
    if (status === "SUBMITTED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Submitted
        </span>
      );
    }
    if (status === "MISSED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Missed / Late
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3.5 h-3.5 mr-1" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        <Clock className="w-3.5 h-3.5 mr-1" />
        Pending
      </span>
    );
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-slate-900 leading-tight">
          {deadline.title}
        </h3>
        <div className="ml-2 flex-shrink-0">
          {renderStatusBadge()}
        </div>
      </div>
      
      <p className="text-sm text-slate-600 mb-4 flex-grow line-clamp-3">
        {deadline.description}
      </p>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center text-sm">
          <Calendar className="w-4 h-4 mr-2 text-slate-400" />
          <span className="text-slate-500 font-medium mr-2">Due:</span>
          <span className={isOverdue && status !== "SUBMITTED" ? "text-red-600 font-semibold" : "text-slate-800"}>
            {deadline.endDate ? new Date(deadline.endDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"}
          </span>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-100 pt-4">
        {status === "PENDING" && !isOverdue && (
          <div className="space-y-3">
            {!file ? (
              <div>
                <input
                  type="file"
                  id={`file-upload-${deadline._id}`}
                  className="hidden"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
                <label
                  htmlFor={`file-upload-${deadline._id}`}
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-6 h-6 mb-2 text-slate-400" />
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-blue-600">Click to select</span> or drag and drop
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-blue-700 truncate font-medium">
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={clearFile}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <button 
              onClick={handleUpload} 
              disabled={!file || loading} 
              className="btn-primary w-full flex justify-center items-center"
            >
              {loading ? "Uploading..." : "Submit File"}
            </button>
          </div>
        )}

        {status === "SUBMITTED" && !isOverdue && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center mb-1">
                <FileText className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                <a 
                  href={`${import.meta.env.VITE_API_URL}${deadline.submission?.fileUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm text-green-700 font-medium truncate hover:underline"
                >
                  {deadline.submission?.fileName || "Download submitted file"}
                </a>
              </div>
              <p className="text-xs text-green-600 ml-6">
                Submitted on {deadline.submission?.submittedAt ? new Date(deadline.submission.submittedAt).toLocaleDateString() : ""}
              </p>
            </div>
            <button 
              onClick={handleUnsubmit} 
              disabled={loading}
              className="btn-danger w-full flex justify-center items-center py-2"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {loading ? "Canceling..." : "Cancel Submission"}
            </button>
          </div>
        )}

        {isOverdue && status !== "SUBMITTED" && (
          <div className="flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-lg border border-red-100">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Submission Closed</span>
          </div>
        )}

        {isOverdue && status === "SUBMITTED" && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center mb-1">
                <FileText className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
                <a 
                  href={`${import.meta.env.VITE_API_URL}${deadline.submission?.fileUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm text-blue-600 font-medium truncate hover:underline"
                >
                  {deadline.submission?.fileName || "Download submitted file"}
                </a>
              </div>
            </div>
            <div className="flex items-center justify-center p-2 bg-slate-100 text-slate-500 rounded-lg">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs font-medium">Deadline passed - Cannot cancel</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeadlineCard;
