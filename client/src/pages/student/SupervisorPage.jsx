import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllSupervisors,
  requestSupervisor,
  fetchProject,
  getSupervisor,
} from "../../store/slices/studentSlice";

import { X } from "lucide-react";

const SupervisorPage = () => {
  const dispatch = useDispatch();
  const { authUser } = useSelector((state) => state.auth);
  const { project, supervisors, supervisor } = useSelector(
    (state) => state.student,
  );

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  useEffect(() => {
    dispatch(fetchAllSupervisors());
    dispatch(fetchProject());
    dispatch(getSupervisor());
  }, [dispatch]);

  const hasSupervisor = useMemo(
    () => !!(supervisor && supervisor._id),
    [supervisor],
  );

  const hasProject = useMemo(() => !!(project && project._id), [project]);

  const formatDeadline = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = date.getDate();
    const j = day % 10;
    const k = day % 100;
    const suffix =
      j === 1 && k !== 11
        ? "st"
        : j === 2 && k !== 12
          ? "nd"
          : j === 3 && k !== 13
            ? "rd"
            : "th";
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  };

  const handleOpenRequest = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setShowRequestModal(true);
  };

  const submitRequest = () => {
    if (!selectedSupervisor) return;
    const message =
      requestMessage?.trim() ||
      `${authUser.name || "Student"} has request ${selectedSupervisor.name} to be their supervisor.`;
    dispatch(
      requestSupervisor({ teacherId: selectedSupervisor._id, message }),
    ).then((res) => {
      if (res.type === "student/requestSupervisor/fulfilled") {
        setShowRequestModal(false);
      }
    });
  };
  return (
    <div className="space-y-6">
      {/* Current Supervisor */}
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Current Supervisor</h1>
          {hasSupervisor && (
            <span className="badge badge-approved">Assigned</span>
          )}
        </div>
        {/* Supervisor Details */}
        {hasSupervisor ? (
          <div className="space-y-6">
            <div className="flex items-start space-x-6">
              <img
                src="/placeholder.jpg"
                alt="Supervisor Avatar"
                className="w-20 h-20 rounded-full object-cover shadow-md"
              />
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {supervisor?.name || "-"}
                  </h3>
                  <p className="text-lg text-slate-600">
                    {supervisor?.department || "-"}
                  </p>
                </div>

                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                        Email
                      </label>
                      <p className="font-medium text-slate-800">
                        {supervisor?.email || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">
                        Expertise
                      </label>
                      <p className="font-medium text-slate-800">
                        {Array.isArray(supervisor?.experties)
                          ? supervisor.experties.join(", ")
                          : supervisor?.experties || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-lg text-slate-600">
              Supervisor not assigned yet.
            </p>
          </div>
        )}
      </div>

      {/* Project details - only show if project exists */}
      {hasProject && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Project Details</h2>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor=""
                    className="text-sm font-medium text-slate-500 uppercase tracking-wide"
                  >
                    Project Title
                  </label>
                  <p className="font-semibold text-lg text-slate-800 mt-1">
                    {project?.title || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                    Status
                  </label>
                  <div className=" mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${project?.status === "approved" ? "bg-green-100 text-green-800" : project?.status === "pending" ? "bg-yellow-100 text-yellow-800" : project?.status === "rejected" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {project?.status || "Invalid"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor=""
                    className="text-sm font-medium text-slate-500 uppercase tracking-wide"
                  >
                    Deadline
                  </label>
                  <p className="font-semibold text-lg text-slate-800 mt-1">
                    {project?.deadline
                      ? formatDeadline(project?.deadline)
                      : "No deadline set"}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor=""
                    className="text-sm font-medium text-slate-500 uppercase tracking-wide"
                  >
                    Created
                  </label>
                  <p className="font-semibold text-lg text-slate-800 mt-1">
                    {project?.createdAt
                      ? formatDeadline(project?.createdAt)
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            {project?.description && (
              <div>
                <label
                  htmlFor=""
                  className="text-sm font-medium text-slate-500 uppercase tracking-wide"
                >
                  Description
                </label>
                <p className="leading-relaxed text-slate-700 mt-2">
                  {project?.description || "-"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No project */}
      {!hasProject && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Project Required</h2>
          </div>
          <div className="p-6 text-center">
            <p className="text-lg text-slate-600">
              You haven't submitted any project yet, so you cannot request a
              supervisor.
            </p>
          </div>
        </div>
      )}

      {/* Available Supervisors | Only when project exists and no supervisor assigned */}
      {hasProject && !hasSupervisor && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Available Supervisors</h2>
            <p className="card-subtitle">
              Browse and request supervisor from available faculty members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {supervisors &&
              supervisors.map((supervisor) => (
                <div
                  key={supervisor._id}
                  className="border-slate-200 border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-600">
                        {supervisor.name || "Anonymous"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">
                        {supervisor.name}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {supervisor.department}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div>
                      <label className="text-sm font-medium text-slate-500">
                        Email
                      </label>
                      <p className="text-xs text-slate-700">
                        {supervisor.email || "-"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">
                        Expertise
                      </span>
                      <span className="text-sm text-slate-700">
                        {Array.isArray(supervisor.experties)
                          ? supervisor.experties.join(", ")
                          : supervisor.experties || "-"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRequest(supervisor)}
                    className="btn btn-primary w-full"
                  >
                    Request Supervisor
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Request modal */}
      {showRequestModal && selectedSupervisor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Request Supervisor
                </h3>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedSupervisor(null);
                    setRequestMessage("");
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-md">
                  <p className="text-sm text-slate-600">
                    {selectedSupervisor.name}
                  </p>
                </div>
                <div className="">
                  <label className="label">Message to Supervisor</label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    className="input  min-h-[120px]"
                    required
                    placeholder="Introduce yourself and explain why you'd life this professor to supervisor your project"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowRequestModal(false);
                      setSelectedSupervisor(null);
                      setRequestMessage("");
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRequest}
                    className="btn-primary"
                    disabled={!requestMessage.trim()}
                  >
                    Send Request
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
