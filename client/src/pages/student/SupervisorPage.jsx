import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { X, Search } from "lucide-react";

const SupervisorPage = () => {
  const { authUser } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [setupRes, supervisorsRes, requestsRes] = await Promise.all([
        axiosInstance.get("/student/registration-setup"),
        axiosInstance.get("/student/fetch-supervisors"),
        axiosInstance.get("/student/my-supervisor-requests"),
      ]);
      setSetup(setupRes.data.data);
      setSupervisors(supervisorsRes.data.data?.supervisors || []);
      setMyRequests(requestsRes.data.data?.requests || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load supervisor page",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const project = setup?.project;
  const settings = setup?.settings;
  const preselections = setup?.preselections || [];
  const pendingPreselections = preselections.filter(
    (item) => item.status === "pending",
  );

  const isLeader = useMemo(
    () => !!project && project.student?._id === authUser?._id,
    [project, authUser],
  );
  const hasSupervisor = useMemo(() => !!project?.supervisor?._id, [project]);
  const canFreePick = !!settings?.freePickOpen && isLeader && !hasSupervisor;

  const pendingRequestsCount = useMemo(() => {
    return myRequests.filter((r) => r.status === "pending").length;
  }, [myRequests]);

  const departments = useMemo(() => {
    const set = new Set();
    supervisors.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [supervisors]);

  const filteredSupervisors = useMemo(() => {
    return supervisors.filter((supervisor) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        supervisor.name.toLowerCase().includes(query) ||
        (supervisor.department || "").toLowerCase().includes(query) ||
        (supervisor.experties || []).some((exp) =>
          exp.toLowerCase().includes(query),
        );

      const matchesDept =
        selectedDept === "all" ||
        (supervisor.department || "").toLowerCase() ===
          selectedDept.toLowerCase();

      const assignedCount = supervisor.assignedStudents?.length || 0;
      const maxCapacity = supervisor.maxStudent || 10;
      const matchesAvailability = !onlyAvailable || assignedCount < maxCapacity;

      return matchesSearch && matchesDept && matchesAvailability;
    });
  }, [supervisors, searchQuery, selectedDept, onlyAvailable]);

  const openRequest = (supervisor) => {
    if (pendingRequestsCount >= 5) {
      toast.warning("You have reached the limit of 5 pending requests. Please cancel a request first.");
      return;
    }
    setSelectedSupervisor(supervisor);
    setRequestMessage("");
    setShowRequestModal(true);
  };

  const sendSupervisorRequest = async () => {
    try {
      await axiosInstance.post("/student/request-supervisor", {
        teacherId: selectedSupervisor._id,
        message:
          requestMessage ||
          `${project?.groupName || project?.title} requests ${selectedSupervisor.name} to supervise the project.`,
      });
      toast.success("Supervisor request sent");
      setShowRequestModal(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this supervisor request?",
      )
    ) {
      return;
    }
    try {
      await axiosInstance.put(
        `/student/cancel-supervisor-request/${requestId}`,
      );
      toast.success("Request cancelled successfully");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel request");
    }
  };

  const respondPreselection = async (preselectionId, action) => {
    try {
      await axiosInstance.post(
        `/student/preselections/${preselectionId}/${action}`,
      );
      toast.success(`Preselection ${action}ed`);
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update preselection",
      );
    }
  };

  if (loading) {
    return <div className="card">Loading supervisor workflow...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Supervisor Selection Workflow
        </h1>
        <p className="text-violet-100">
          Group representative handles preselection acceptance or free-pick
          request for the whole team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Project / Group</p>
          <p className="font-semibold text-slate-800">
            {project?.groupName || project?.title || "No project yet"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Representative</p>
          <p className="font-semibold text-slate-800">
            {project?.student?.name || "N/A"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Current Phase</p>
          <p className="font-semibold text-slate-800">
            {settings?.freePickOpen ? "Free-pick open" : "Preselection first"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Assigned Supervisor</p>
          <p className="font-semibold text-slate-800">
            {project?.supervisor?.name || "Not assigned"}
          </p>
        </div>
      </div>

      {!project && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Project Proposal Required</h2>
          </div>
          <p className="text-slate-600">
            Create the project proposal first. Only then can the representative
            accept a preselection or send a supervisor request.
          </p>
        </div>
      )}

      {project && !isLeader && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Representative-only Action</h2>
          </div>
          <p className="text-slate-600">
            You are a group member. The representative{" "}
            <strong>{project.student?.name}</strong> handles supervisor
            procedures for the whole team.
          </p>
        </div>
      )}

      {project && isLeader && !hasSupervisor && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Teacher Preselection Invitations</h2>
            <p className="card-subtitle">
              Use this section first when free-pick is still closed.
            </p>
          </div>

          <div className="space-y-3">
            {pendingPreselections.map((item) => (
              <div
                key={item._id}
                className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {item.teacher?.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.teacher?.email}
                  </p>
                  {item.note && (
                    <p className="mt-2 text-sm text-slate-600">{item.note}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => respondPreselection(item._id, "accept")}
                  >
                    Accept Preselection
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => respondPreselection(item._id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {pendingPreselections.length === 0 && (
              <p className="text-slate-500">
                No pending preselection invitations.
              </p>
            )}
          </div>
        </div>
      )}

      {project && isLeader && !hasSupervisor && (
        <div className="card">
          <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="card-title">Sent Supervisor Requests</h2>
              <p className="card-subtitle">
                History of supervisor requests sent by your group. You can cancel
                pending requests.
              </p>
            </div>
            <div className="flex items-center">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${pendingRequestsCount >= 5 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                Pending: {pendingRequestsCount}/5
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {myRequests.map((request) => (
              <div
                key={request._id}
                className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {request.supervisor?.name || "Unknown Teacher"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {request.supervisor?.email || ""} -{" "}
                    {request.supervisor?.department || ""}
                  </p>
                  {request.message && (
                    <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded italic">
                      Message: "{request.message}"
                    </p>
                  )}
                  {request.status === "rejected" && request.rejectionReason && (
                    <p className="mt-2 text-sm text-red-650 bg-red-50 p-2 rounded italic">
                      Rejection Reason: "{request.rejectionReason}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                      request.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : request.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : request.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {request.status}
                  </span>
                  {request.status === "pending" && (
                    <button
                      className="btn-outline text-red-600 border-red-200 hover:bg-red-50 px-3 py-1.5 text-xs"
                      onClick={() => handleCancelRequest(request._id)}
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            ))}
            {myRequests.length === 0 && (
              <p className="text-slate-500">No supervisor requests sent yet.</p>
            )}
          </div>
        </div>
      )}

      {project && isLeader && !hasSupervisor && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Open Supervisor Request Phase</h2>
            <p className="card-subtitle">
              This section is enabled only after admin opens the free-pick
              phase.
            </p>
          </div>

          {!canFreePick ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800">
              Free-pick is currently closed. Wait for teacher preselection or
              ask admin to open the supervisor request phase.
            </div>
          ) : (
            <div className="space-y-6">
              {pendingRequestsCount >= 5 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
                  <strong>Notice:</strong> You have reached the maximum limit of 5 pending supervisor requests. 
                  To invite another lecturer, you must first cancel one of your existing pending requests in the "Sent Supervisor Requests" section above.
                </div>
              )}
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                {/* Search query */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Search Teacher
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className="input pl-9 w-full"
                      placeholder="Search by name, department, or expertise..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Department dropdown */}
                <div className="w-full md:w-52">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Department
                  </label>
                  <select
                    className="input w-full"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Availability Checkbox */}
                <div className="flex items-center gap-2 mt-4 md:mt-6">
                  <input
                    type="checkbox"
                    id="onlyAvailable"
                    className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                  />
                  <label
                    htmlFor="onlyAvailable"
                    className="text-sm font-medium text-slate-700 cursor-pointer select-none"
                  >
                    Available only
                  </label>
                </div>
              </div>

              {/* Grid of Supervisors */}
              {filteredSupervisors.length === 0 ? (
                <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  No supervisors matched your search filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSupervisors.map((supervisor) => {
                    const assignedCount =
                      supervisor.assignedStudents?.length || 0;
                    const maxCapacity = supervisor.maxStudent || 10;
                    return (
                      <div
                        key={supervisor._id}
                        className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {supervisor.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {supervisor.department}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            Expertise:{" "}
                            {(supervisor.experties || []).join(", ") || "N/A"}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            Capacity: {assignedCount}/{maxCapacity} students
                          </p>
                        </div>
                        <button
                          className="btn-primary mt-4 w-full"
                          onClick={() => openRequest(supervisor)}
                        >
                          Send Team Request
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {project?.supervisor && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Assigned Supervisor</h2>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">
              {project.supervisor.name}
            </p>
            <p className="text-slate-600">{project.supervisor.email}</p>
            <p className="text-slate-600">{project.supervisor.department}</p>
          </div>
        </div>
      )}

      {showRequestModal && selectedSupervisor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Team Supervisor Request
                </h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="font-medium text-slate-800">
                    {selectedSupervisor.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedSupervisor.email}
                  </p>
                </div>

                <textarea
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  className="input min-h-[120px]"
                  placeholder="Explain why your team wants this teacher to supervise the project."
                />

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendSupervisorRequest}
                    className="btn-primary"
                  >
                    Send Team Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorPage;
