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
  Loader
} from "lucide-react";
import { toast } from "react-toastify";

const DeadlineSubmissionsPage = () => {
  const { deadlineId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [data, setData] = useState(null);
  
  // Feedback Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackFile, setFeedbackFile] = useState(null);
  const [feedbackFileName, setFeedbackFileName] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/deadline/${deadlineId}/submissions`);
      setData(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deadlineId]);

  const handleOpenFeedbackModal = (record) => {
    setActiveRecord(record);
    setFeedbackText(record.submission?.feedback?.message || "");
    setFeedbackFileName(record.submission?.feedback?.fileName || "");
    setFeedbackFile(null);
    setIsModalOpen(true);
  };

  const handleCloseFeedbackModal = () => {
    setIsModalOpen(false);
    setActiveRecord(null);
    setFeedbackText("");
    setFeedbackFile(null);
    setFeedbackFileName("");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFeedbackFile(file);
      setFeedbackFileName(file.name);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!activeRecord) return;

    setSubmittingFeedback(true);
    const formData = new FormData();
    formData.append("message", feedbackText);
    if (feedbackFile) {
      formData.append("file", feedbackFile);
    }

    try {
      await axiosInstance.post(
        `/deadline/${deadlineId}/submissions/${activeRecord.project._id}/feedback`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success("Feedback submitted successfully");
      fetchData(); // reload
      handleCloseFeedbackModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium animate-pulse">Loading submission tracking details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Failed to load deadline information.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const { deadline, stats, records } = data;
  const isClosed = new Date() > new Date(deadline.endDate);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 transition-all duration-300">
        <button 
          onClick={() => navigate("/teacher/deadlines")}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Deadlines</span>
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-800">{deadline.title}</h1>
              {isClosed ? (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Closed
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p className="text-slate-500 leading-relaxed">{deadline.description}</p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 min-w-[220px]">
            <div className="flex items-center text-sm text-slate-700">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              <span>Start: {new Date(deadline.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div className="flex items-center text-sm text-slate-700">
              <Clock className="w-4 h-4 mr-2 text-red-500" />
              <span>End: {new Date(deadline.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-slate-500 text-sm font-medium">Total Groups</span>
          <span className="text-3xl font-bold text-slate-800 mt-2">{stats.totalGroups}</span>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-emerald-500 text-sm font-medium">On-Time</span>
          <span className="text-3xl font-bold text-emerald-600 mt-2">{stats.submitted}</span>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-yellow-500 text-sm font-medium">Late Submissions</span>
          <span className="text-3xl font-bold text-yellow-600 mt-2">{stats.late}</span>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-red-500 text-sm font-medium">Missing</span>
          <span className="text-3xl font-bold text-red-600 mt-2">{stats.missing}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-blue-500 text-sm font-medium">Pending (Chưa đến hạn)</span>
          <span className="text-3xl font-bold text-blue-600 mt-2">{stats.pending}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Submissions Checklist</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group / Project</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Representative</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted File</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No groups assigned to this deadline.
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const hasFeedback = record.submission?.feedback?.message || record.submission?.feedback?.fileName;
                  return (
                    <tr key={record.project._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{record.project.groupName || "Unnamed Group"}</div>
                        <div className="text-xs text-slate-500 max-w-xs truncate">{record.project.title}</div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-700">{record.project.student?.name || "N/A"}</div>
                        <div className="text-xs text-slate-400">{record.project.student?.email || ""}</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.status === "SUBMITTED" && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> On Time
                          </span>
                        )}
                        {record.status === "LATE" && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200/50 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3.5 h-3.5" /> Late
                          </span>
                        )}
                        {record.status === "MISSED" && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200/50 flex items-center gap-1 w-fit">
                            <XCircle className="w-3.5 h-3.5" /> Missing
                          </span>
                        )}
                        {record.status === "PENDING" && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 flex items-center gap-1 w-fit">
                            <HelpCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {record.submission?.submittedAt ? (
                          new Date(record.submission.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        {record.submission?.fileUrl ? (
                          <a 
                            href={`${import.meta.env.VITE_API_URL}${record.submission.fileUrl}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1 rounded-lg border border-blue-200/40"
                          >
                            <Download className="w-4 h-4" />
                            <span className="max-w-[120px] truncate">{record.submission.fileName || "Download"}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No file submitted</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenFeedbackModal(record)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            hasFeedback
                              ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/50"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{hasFeedback ? "View Feedback" : "Add Feedback"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Modal */}
      {isModalOpen && activeRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Add Feedback & Grade</h3>
                <p className="text-xs text-slate-400 mt-0.5">For {activeRecord.project.groupName || "Group"}</p>
              </div>
              <button
                onClick={handleCloseFeedbackModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitFeedback} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Teacher's Comments (Nhận xét giảng viên)
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-slate-400"
                  placeholder="Type your feedback message here..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Attachment File (Tệp đính kèm phản hồi)
                </label>
                
                {feedbackFileName ? (
                  <div className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50/50 rounded-xl">
                    <div className="flex items-center space-x-2 text-sm text-purple-900 font-medium">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                      <span className="max-w-[200px] truncate">{feedbackFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackFile(null);
                        setFeedbackFileName("");
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-slate-50/50 transition-all text-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">Click to upload feedback file</span>
                    <span className="text-xs text-slate-400 mt-1">PDF, ZIP, DOC, DOCX up to 10MB</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
              
              {activeRecord.submission?.feedback?.fileUrl && !feedbackFile && (
                <div className="flex items-center justify-between p-3 border border-slate-200 bg-slate-50 rounded-xl">
                  <div className="flex items-center space-x-2 text-sm text-slate-700">
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>Existing: {activeRecord.submission.feedback.fileName}</span>
                  </div>
                  <a 
                    href={`${import.meta.env.VITE_API_URL}${activeRecord.submission.feedback.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                  >
                    Download
                  </a>
                </div>
              )}
              
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseFeedbackModal}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium"
                  disabled={submittingFeedback}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:bg-blue-400"
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? "Submitting..." : "Save Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeadlineSubmissionsPage;
