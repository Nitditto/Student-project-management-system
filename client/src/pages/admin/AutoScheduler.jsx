import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { 
  Play, 
  Trash2, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  BookOpen, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  X 
} from "lucide-react";

const AutoScheduler = () => {
  const [loading, setLoading] = useState(true);
  const [solving, setSolving] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);

  // Input Data pools
  const [projects, setProjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Config parameters
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [rooms, setRooms] = useState(["Phòng 401", "Phòng 402"]);
  const [newRoom, setNewRoom] = useState("");
  
  // Date time slots config
  const [timeSlots, setTimeSlots] = useState([
    { startAt: "2026-06-22T08:00", endAt: "2026-06-22T11:30" },
    { startAt: "2026-06-22T13:30", endAt: "2026-06-22T17:00" },
    { startAt: "2026-06-23T08:00", endAt: "2026-06-23T11:30" }
  ]);
  const [newSlot, setNewSlot] = useState({ startAt: "", endAt: "" });

  const loadPoolData = async () => {
    setLoading(true);
    try {
      const [projRes, teachRes] = await Promise.all([
        axiosInstance.get("/admin/projects"),
        axiosInstance.get("/admin/users")
      ]);

      // Keep only approved projects that aren't finalized yet
      const projectsList = projRes.data?.data?.projects || [];
      const activeProjects = projectsList.filter(
        p => ["approved", "in_progress", "created", "pending"].includes(p.status) && !p.councilId
      );
      setProjects(activeProjects);
      
      // Select all active teachers
      const usersList = teachRes.data?.data?.users || [];
      const activeTeachers = usersList.filter(t => t.isActive && t.role === "Teacher");
      setTeachers(activeTeachers);

      // Pre-select all by default to make it easy
      setSelectedProjectIds(activeProjects.map(p => p._id));
      setSelectedTeacherIds(activeTeachers.map(t => t._id));
    } catch (error) {
      toast.error("Failed to load scheduler resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoolData();
  }, []);

  // Poll job status if a job is running
  useEffect(() => {
    let interval;
    if (jobId && solving) {
      interval = setInterval(async () => {
        try {
          const res = await axiosInstance.get(`/scheduler/jobs/${jobId}`);
          const job = res.data.data;
          setJobData(job);

          if (job.status === "completed") {
            setSolving(false);
            setJobId(null);
            toast.success("Schedule generated successfully!");
            loadPoolData(); // Reload pools to reflect assignments
          } else if (job.status === "failed") {
            setSolving(false);
            setJobId(null);
            toast.error(job.error || "Optimization job failed.");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, solving]);

  // Handler: Add classroom
  const handleAddRoom = () => {
    if (newRoom.trim() && !rooms.includes(newRoom.trim())) {
      setRooms([...rooms, newRoom.trim()]);
      setNewRoom("");
    }
  };

  // Handler: Delete classroom
  const handleRemoveRoom = (roomToRemove) => {
    setRooms(rooms.filter(r => r !== roomToRemove));
  };

  // Handler: Add time slot
  const handleAddSlot = () => {
    if (newSlot.startAt && newSlot.endAt) {
      if (new Date(newSlot.startAt) >= new Date(newSlot.endAt)) {
        toast.error("End date must be after start date.");
        return;
      }
      setTimeSlots([...timeSlots, newSlot]);
      setNewSlot({ startAt: "", endAt: "" });
    }
  };

  // Handler: Delete time slot
  const handleRemoveSlot = (indexToRemove) => {
    setTimeSlots(timeSlots.filter((_, idx) => idx !== indexToRemove));
  };

  // Handler: Toggle project selection
  const handleToggleProject = (id) => {
    setSelectedProjectIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  // Handler: Toggle teacher selection
  const handleToggleTeacher = (id) => {
    setSelectedTeacherIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  // Run solver
  const handleRunScheduler = async () => {
    if (selectedProjectIds.length === 0) {
      toast.error("Please select at least one project to schedule.");
      return;
    }
    if (selectedTeacherIds.length < 3) {
      toast.error("Need at least 3 teachers to form a council.");
      return;
    }
    if (rooms.length === 0) {
      toast.error("Please add at least one classroom.");
      return;
    }
    if (timeSlots.length === 0) {
      toast.error("Please add at least one time slot.");
      return;
    }

    setSolving(true);
    setJobData(null);
    try {
      const payload = {
        projectIds: selectedProjectIds,
        teacherIds: selectedTeacherIds,
        rooms,
        timeSlots: timeSlots.map(s => ({
          startAt: new Date(s.startAt),
          endAt: new Date(s.endAt)
        })),
        solverType: "genetic_algorithm",
        populationSize: 100,
        generations: 200
      };

      const res = await axiosInstance.post("/scheduler/jobs", payload);
      if (res.data.success) {
        setJobId(res.data.data.jobId);
        toast.info("Background solver started.");
      }
    } catch (error) {
      setSolving(false);
      toast.error(error.response?.data?.message || "Failed to start scheduling.");
    }
  };

  // Publish councils draft
  const handlePublishSchedule = async () => {
    if (!jobData || !jobData._id) return;
    try {
      await axiosInstance.post(`/scheduler/jobs/${jobData._id}/apply`);
      toast.success("Schedule published successfully!");
      setJobData(null);
      loadPoolData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish schedule.");
    }
  };

  // Discard draft
  const handleDiscardSchedule = async () => {
    if (!jobData || !jobData._id) return;
    if (!window.confirm("Are you sure you want to discard this generated draft? This will revert all project states.")) return;
    
    try {
      await axiosInstance.delete(`/scheduler/jobs/${jobData._id}`);
      toast.info("Draft discarded successfully.");
      setJobData(null);
      loadPoolData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to discard draft.");
    }
  };

  if (loading) {
    return <div className="card">Loading scheduler configuration pool...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Automated Defense Scheduler</h1>
          <p className="text-blue-100 text-sm">
            Leverage genetic algorithms to optimize council assignments, slots, and classroom locations while avoiding teacher overbookings.
          </p>
        </div>
        <button
          onClick={handleRunScheduler}
          disabled={solving}
          className="btn-primary bg-white text-blue-700 hover:bg-blue-50 border-0 shadow-lg px-6 py-3 flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
        >
          {solving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Solving...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              Run Optimization
            </>
          )}
        </button>
      </div>

      {/* Solver status loader */}
      {solving && (
        <div className="card bg-blue-50 border border-blue-200 p-6 flex items-center justify-center space-y-4 flex-col text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Solver Thread Active</h3>
            <p className="text-slate-600 text-sm max-w-md mt-1">
              Delegated to background worker thread. Optimization logic is iterating over chromosomes to satisfy constraints.
            </p>
          </div>
          {jobData && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 animate-pulse">
              Status: {jobData.status}...
            </span>
          )}
        </div>
      )}

      {/* Results panel if complete */}
      {jobData && jobData.status === "completed" && (
        <div className="card border-2 border-emerald-500/30 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Draft Schedule Generated</h2>
                <p className="text-xs text-slate-500">
                  Execution Time: {jobData.result?.executionTimeMs}ms | Fitness: {jobData.result?.fitnessScore}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePublishSchedule} className="btn-primary">
                Publish Schedule
              </button>
              <button onClick={handleDiscardSchedule} className="btn-outline border-red-200 text-red-700 hover:bg-red-50">
                Discard Drafts
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Generated Councils Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobData.result?.generatedCouncils?.map((council, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 text-sm">{council.name}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-semibold uppercase">
                      Draft
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(council.defenseDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {council.room}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Members</p>
                    <div className="flex flex-wrap gap-1.5">
                      {council.members?.map((m, midx) => (
                        <span key={midx} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded">
                          {m.role === "chairman" ? "Chairman: " : m.role === "secretary" ? "Secretary: " : "Member: "}
                          {teachers.find(t => t._id === m.teacher)?.name || m.teacher}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Projects ({council.projects?.length})</p>
                    <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded p-1 max-h-36 overflow-y-auto">
                      {council.projects?.map((p, pidx) => (
                        <div key={pidx} className="py-2 px-2 text-xs text-slate-700 first:pt-0 last:pb-0">
                          {pidx + 1}. {projects.find(proj => proj._id === p.project)?.title || p.project}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main configuration pools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Setup parameters */}
        <div className="space-y-6 lg:col-span-1">
          {/* Classrooms */}
          <div className="card space-y-4">
            <div className="card-header border-b border-slate-100 pb-3">
              <h2 className="card-title text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                Available Rooms
              </h2>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input py-1.5 text-sm"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder="E.g., Phòng 302"
              />
              <button onClick={handleAddRoom} className="btn-primary py-1.5 px-3 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rooms.map((room) => (
                <span key={room} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                  {room}
                  <button onClick={() => handleRemoveRoom(room)} className="text-slate-400 hover:text-red-500 font-bold text-[10px]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {rooms.length === 0 && <p className="text-xs text-slate-400">No rooms added yet.</p>}
            </div>
          </div>

          {/* Time Slots */}
          <div className="card space-y-4">
            <div className="card-header border-b border-slate-100 pb-3">
              <h2 className="card-title text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Time Slots (Sessions)
              </h2>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-500">Start Time</label>
                  <input
                    type="datetime-local"
                    className="input py-1 px-2 text-xs"
                    value={newSlot.startAt}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, startAt: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-slate-500">End Time</label>
                  <input
                    type="datetime-local"
                    className="input py-1 px-2 text-xs"
                    value={newSlot.endAt}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, endAt: e.target.value }))}
                  />
                </div>
              </div>
              <button onClick={handleAddSlot} className="btn-outline w-full py-1.5 text-xs flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" />
                Add Time Slot
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {timeSlots.map((slot, index) => (
                <div key={index} className="py-2.5 flex justify-between items-center text-xs text-slate-700">
                  <div>
                    <p className="font-semibold">{new Date(slot.startAt).toLocaleDateString()}</p>
                    <p className="text-slate-500">
                      {new Date(slot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => handleRemoveSlot(index)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {timeSlots.length === 0 && <p className="text-xs text-slate-400 py-2">No slots added yet.</p>}
            </div>
          </div>
        </div>

        {/* Right Columns: Resource Selectors */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects Select Table */}
          <div className="card space-y-4">
            <div className="card-header border-b border-slate-100 pb-3 flex justify-between items-center">
              <h2 className="card-title text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                Unassigned Projects ({selectedProjectIds.length}/{projects.length})
              </h2>
              <button 
                onClick={() => setSelectedProjectIds(selectedProjectIds.length === projects.length ? [] : projects.map(p => p._id))}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Toggle All
              </button>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-10">Select</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {projects.map((proj) => (
                    <tr 
                      key={proj._id} 
                      className={`hover:bg-slate-50 cursor-pointer ${selectedProjectIds.includes(proj._id) ? "bg-blue-50/30" : ""}`}
                      onClick={() => handleToggleProject(proj._id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.includes(proj._id)}
                          onChange={() => handleToggleProject(proj._id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{proj.title}</td>
                      <td className="px-4 py-3 text-slate-500">{proj.supervisor?.name || "N/A"}</td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-slate-400">
                        No unscheduled projects available. All projects are either in draft status or already assigned to a council.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teachers Select Table */}
          <div className="card space-y-4">
            <div className="card-header border-b border-slate-100 pb-3 flex justify-between items-center">
              <h2 className="card-title text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                Available Teachers ({selectedTeacherIds.length}/{teachers.length})
              </h2>
              <button 
                onClick={() => setSelectedTeacherIds(selectedTeacherIds.length === teachers.length ? [] : teachers.map(t => t._id))}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Toggle All
              </button>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-10">Select</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Expertise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {teachers.map((teacher) => (
                    <tr 
                      key={teacher._id} 
                      className={`hover:bg-slate-50 cursor-pointer ${selectedTeacherIds.includes(teacher._id) ? "bg-blue-50/30" : ""}`}
                      onClick={() => handleToggleTeacher(teacher._id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTeacherIds.includes(teacher._id)}
                          onChange={() => handleToggleTeacher(teacher._id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{teacher.name}</td>
                      <td className="px-4 py-3 text-slate-500">{teacher.department || "General"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {teacher.experties?.slice(0, 3).map((exp, expIdx) => (
                            <span key={expIdx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {exp}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                        No active teachers found in the system database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoScheduler;
