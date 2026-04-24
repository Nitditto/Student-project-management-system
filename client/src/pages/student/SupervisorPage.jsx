import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { X } from "lucide-react";

const SupervisorPage = () => {
  const { authUser } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [setupRes, supervisorsRes] = await Promise.all([
        axiosInstance.get("/student/registration-setup"),
        axiosInstance.get("/student/fetch-supervisors"),
      ]);
      setSetup(setupRes.data.data);
      setSupervisors(supervisorsRes.data.data?.supervisors || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load supervisor page");
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

  const openRequest = (supervisor) => {
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

  const respondPreselection = async (preselectionId, action) => {
    try {
      await axiosInstance.post(`/student/preselections/${preselectionId}/${action}`);
      toast.success(`Preselection ${action}ed`);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update preselection");
    }
  };

  if (loading) {
    return <div className="card">Loading supervisor workflow...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Supervisor Selection Workflow</h1>
        <p className="text-violet-100">
          Group representative handles preselection acceptance or free-pick request for the whole team.
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
            Create the project proposal first. Only then can the representative accept a preselection or send a supervisor request.
          </p>
        </div>
      )}

      {project && !isLeader && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Representative-only Action</h2>
          </div>
          <p className="text-slate-600">
            You are a group member. The representative <strong>{project.student?.name}</strong> handles supervisor procedures for the whole team.
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
                  <p className="font-semibold text-slate-800">{item.teacher?.name}</p>
                  <p className="text-sm text-slate-500">{item.teacher?.email}</p>
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
              <p className="text-slate-500">No pending preselection invitations.</p>
            )}
          </div>
        </div>
      )}

      {project && isLeader && !hasSupervisor && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Open Supervisor Request Phase</h2>
            <p className="card-subtitle">
              This section is enabled only after admin opens the free-pick phase.
            </p>
          </div>

          {!canFreePick ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800">
              Free-pick is currently closed. Wait for teacher preselection or ask admin to open the supervisor request phase.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {supervisors.map((supervisor) => {
                const assignedCount = supervisor.assignedStudents?.length || 0;
                const maxCapacity = supervisor.maxStudent || 10;
                return (
                  <div
                    key={supervisor._id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="font-semibold text-slate-800">{supervisor.name}</p>
                    <p className="text-sm text-slate-500">{supervisor.department}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Expertise: {(supervisor.experties || []).join(", ") || "N/A"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Capacity: {assignedCount}/{maxCapacity} students
                    </p>
                    <button
                      className="btn-primary mt-4"
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

      {project?.supervisor && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Assigned Supervisor</h2>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">{project.supervisor.name}</p>
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
                  <p className="font-medium text-slate-800">{selectedSupervisor.name}</p>
                  <p className="text-sm text-slate-500">{selectedSupervisor.email}</p>
                </div>

                <textarea
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  className="input min-h-[120px]"
                  placeholder="Explain why your team wants this teacher to supervise the project."
                />

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button onClick={() => setShowRequestModal(false)} className="btn-outline">
                    Cancel
                  </button>
                  <button onClick={sendSupervisorRequest} className="btn-primary">
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
