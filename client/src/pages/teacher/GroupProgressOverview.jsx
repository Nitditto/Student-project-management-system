import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import { 
  ArrowLeft,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Loader,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { toast } from "react-toastify";

const GroupProgressOverview = () => {
  const navigate = useNavigate();
  
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedProject, setSelectedProject] = useState(null);
  const [progressData, setProgressData] = useState(null);

  // Fetch supervised groups
  const fetchGroups = async () => {
    setLoadingProjects(true);
    try {
      const res = await axiosInstance.get("/teacher/assigned-students");
      const students = res.data.data?.students || [];
      
      // Extract unique projects
      const uniqueProjects = [];
      const seenIds = new Set();
      
      students.forEach(student => {
        if (student.project && !seenIds.has(student.project._id)) {
          seenIds.add(student.project._id);
          uniqueProjects.push(student.project);
        }
      });
      
      setProjects(uniqueProjects);
      setFilteredProjects(uniqueProjects);
      
      if (uniqueProjects.length > 0) {
        setSelectedProject(uniqueProjects[0]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load supervised groups");
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch progress for selected group
  const fetchGroupProgress = async (projectId) => {
    setLoadingProgress(true);
    try {
      const res = await axiosInstance.get(`/deadline/projects/${projectId}/progress`);
      setProgressData(res.data.data.progress);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load group progress");
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchGroupProgress(selectedProject._id);
    }
  }, [selectedProject]);

  // Search filtering
  useEffect(() => {
    const results = projects.filter(p => 
      (p.groupName && p.groupName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.student?.name && p.student.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProjects(results);
  }, [searchTerm, projects]);

  const getDaysRemaining = (dueDate) => {
    const diffTime = new Date(dueDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "1 day left";
    return `${diffDays} days left`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div className="space-y-1">
          <button 
            onClick={() => navigate("/teacher/deadlines")}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 font-medium mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Deadlines</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" /> Supervised Group Progress Tracking
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor deadline completion, view files, and manage feedback across all assigned groups
          </p>
        </div>
      </div>

      {loadingProjects ? (
        <div className="flex flex-col justify-center items-center h-[50vh] space-y-4">
          <Loader className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">Loading supervised groups list...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Supervised Groups Found</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            Once you accept student supervisor requests, they will show up here for progress tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Panel: Groups List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[75vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Supervised Groups</h2>
              
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search group or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
              {filteredProjects.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">No matching groups found</p>
              ) : (
                filteredProjects.map((project) => {
                  const isSelected = selectedProject?._id === project._id;
                  return (
                    <button
                      key={project._id}
                      onClick={() => setSelectedProject(project)}
                      className={`w-full text-left p-4 transition-all flex justify-between items-center ${
                        isSelected 
                          ? "bg-blue-50/70 border-l-4 border-blue-600 pl-3" 
                          : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="space-y-1 pr-2 truncate">
                        <div className="font-semibold text-slate-800 truncate">
                          {project.groupName || "Unnamed Group"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{project.title}</div>
                        <div className="text-xs text-slate-400">Owner: {project.student?.name || "N/A"}</div>
                      </div>
                      
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-300"
                      }`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Progress Details */}
          <div className="lg:col-span-2 space-y-6">
            {loadingProgress || !progressData ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm flex flex-col justify-center items-center h-[50vh] space-y-3">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-slate-500 font-medium">Fetching progress metrics...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Progress Stats Summary Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedProject.groupName || "Unnamed Group"}</h2>
                      <p className="text-sm text-slate-500 mt-1">Project: {selectedProject.title}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-3xl font-extrabold text-blue-600">{progressData.percentage}%</span>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Completed</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${progressData.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>0%</span>
                      <span>Total Tasks progress map</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Progress Details Breakdown: Three Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Completed Column */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 px-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-slate-800 text-sm uppercase tracking-wider">Completed ({progressData.completed.length})</span>
                    </div>
                    
                    <div className="space-y-3">
                      {progressData.completed.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 italic">
                          No deadlines completed yet
                        </div>
                      ) : (
                        progressData.completed.map(({ deadline, submission }) => (
                          <div key={deadline._id} className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm space-y-3 transition-shadow hover:shadow-md">
                            <div>
                              <h4 className="font-semibold text-slate-800 text-sm leading-snug">{deadline.title}</h4>
                              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Submitted {new Date(submission.submittedAt || submission.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            
                            {submission.fileUrl && (
                              <a 
                                href={`${import.meta.env.VITE_API_URL}${submission.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/20 text-xs text-emerald-800 transition-colors"
                              >
                                <span className="truncate pr-2 font-medium">{submission.fileName || "Download Attachment"}</span>
                                <Download className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            )}

                            {submission.feedback?.message && (
                              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-xs text-purple-800 space-y-1">
                                <div className="flex items-center gap-1 font-bold">
                                  <MessageSquare className="w-3 h-3 text-purple-600" /> Feedback:
                                </div>
                                <p className="leading-relaxed line-clamp-3">{submission.feedback.message}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Missed Column */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 px-1">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-slate-800 text-sm uppercase tracking-wider">Missed ({progressData.missed.length})</span>
                    </div>
                    
                    <div className="space-y-3">
                      {progressData.missed.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 italic">
                          No missed deadlines!
                        </div>
                      ) : (
                        progressData.missed.map(({ deadline }) => (
                          <div key={deadline._id} className="bg-white border border-red-100 rounded-xl p-4 shadow-sm space-y-2 transition-shadow hover:shadow-md">
                            <h4 className="font-semibold text-slate-800 text-sm leading-snug">{deadline.title}</h4>
                            <div className="text-[10px] text-red-600 font-bold bg-red-50 p-1.5 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Overdue since {new Date(deadline.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Upcoming Column */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 px-1">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-slate-800 text-sm uppercase tracking-wider">Upcoming ({progressData.upcoming.length})</span>
                    </div>
                    
                    <div className="space-y-3">
                      {progressData.upcoming.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 italic">
                          No upcoming deadlines
                        </div>
                      ) : (
                        progressData.upcoming.map(({ deadline }) => (
                          <div key={deadline._id} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm space-y-3 transition-shadow hover:shadow-md">
                            <div>
                              <h4 className="font-semibold text-slate-800 text-sm leading-snug">{deadline.title}</h4>
                              <p className="text-[10px] text-slate-500 mt-1">Due Date: {new Date(deadline.endDate).toLocaleDateString()}</p>
                            </div>
                            
                            <div className="text-[10px] text-blue-700 font-bold bg-blue-50 p-2 rounded flex items-center justify-between">
                              <span>Remaining Time:</span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-200/50 text-blue-800">{getDaysRemaining(deadline.endDate)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupProgressOverview;
