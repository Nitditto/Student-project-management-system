import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { Lock, Unlock, Users, Merge, X } from "lucide-react";

const RegistrationSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    allowGroupProjects: true,
    minGroupSize: 1,
    maxGroupSize: 3,
    preselectPhaseEnabled: true,
    freePickOpen: false,
    proposalSubmissionOpen: true,
    notes: "",
    groupEditLocked: false,
    groupEditLockDate: "",
  });

  // Force Merge Modal states
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [mergeForm, setMergeForm] = useState({
    studentIds: [],
    title: "",
    description: "",
    supervisorId: "",
  });
  const [mergeLoading, setMergeLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, usersRes] = await Promise.all([
        axiosInstance.get("/admin/registration-settings"),
        axiosInstance.get("/admin/users"),
      ]);
      
      const settings = settingsRes.data.data?.settings;
      if (settings) {
        setForm({
          ...settings,
          groupEditLockDate: settings.groupEditLockDate 
            ? new Date(settings.groupEditLockDate).toISOString().slice(0, 16) 
            : "",
        });
      }
      setAllUsers(usersRes.data.data?.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.groupEditLockDate) {
        payload.groupEditLockDate = null;
      }
      await axiosInstance.put("/admin/registration-settings", payload);
      toast.success("Registration settings updated");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update registration settings");
    } finally {
      setSaving(false);
    }
  };

  // Orphan students (Student role, no project)
  const orphanStudents = useMemo(() => {
    return allUsers.filter(u => u.role === "Student" && !u.project);
  }, [allUsers]);

  // Teachers for optional assignment
  const teachers = useMemo(() => {
    return allUsers.filter(u => u.role === "Teacher");
  }, [allUsers]);

  const handleForceMerge = async () => {
    if (mergeForm.studentIds.length === 0) {
      return toast.warning("Select at least one student");
    }
    
    setMergeLoading(true);
    try {
      await axiosInstance.post("/admin/force-merge", {
        studentIds: mergeForm.studentIds,
        title: mergeForm.title || "Admin Assigned Project",
        description: mergeForm.description,
        supervisorId: mergeForm.supervisorId || undefined,
      });
      toast.success("Students successfully merged into a new project");
      setShowMergeModal(false);
      setMergeForm({ studentIds: [], title: "", description: "", supervisorId: "" });
      await loadData(); // Reload to remove them from orphans list
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to force merge students");
    } finally {
      setMergeLoading(false);
    }
  };

  if (loading) {
    return <div className="card">Loading registration settings...</div>;
  }

  const isLocked = form.groupEditLocked || (form.groupEditLockDate && new Date() >= new Date(form.groupEditLockDate));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Project Registration Settings</h1>
          <p className="text-slate-200">
            Configure group mode, phase toggles, and administrative locks.
          </p>
        </div>
        <button
          onClick={() => setShowMergeModal(true)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
        >
          <Merge className="w-5 h-5" />
          Force Merge Students
        </button>
      </div>

      {/* GLOBAL GROUP LOCK CONTROL */}
      <div className={`card border-l-4 ${isLocked ? 'border-l-red-500' : 'border-l-green-500'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {isLocked ? <Lock className="w-5 h-5 text-red-500" /> : <Unlock className="w-5 h-5 text-green-500" />}
              Global Group Edit Lock
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              When locked, students and teachers cannot modify group memberships (no kicking, transferring, splitting, or adding members).
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {isLocked ? 'Currently Locked' : 'Currently Unlocked'}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                checked={form.groupEditLocked}
                onChange={(e) => updateField("groupEditLocked", e.target.checked)}
              />
              <span className="font-semibold text-slate-800">Manual Lock Override</span>
            </label>
            <p className="text-sm text-slate-500 mt-1 pl-8">
              Immediately freeze all groups across the system, regardless of the date below.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              Auto-Lock Date (Optional)
            </label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.groupEditLockDate}
              onChange={(e) => updateField("groupEditLockDate", e.target.value)}
            />
            <p className="text-sm text-slate-500 mt-1">
              Groups will automatically lock after this date and time. Leave blank for manual control only.
            </p>
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <div className="card-header">
          <h2 className="card-title">Registration Policy</h2>
          <p className="card-subtitle">
            These settings define the end-to-end registration flow for the whole semester.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="rounded-lg border border-slate-200 p-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.allowGroupProjects}
              onChange={(event) =>
                updateField("allowGroupProjects", event.target.checked)
              }
            />
            <div>
              <p className="font-medium text-slate-800">Allow Group Projects</p>
              <p className="text-sm text-slate-500">
                When off, every project is individual and group invitations are disabled.
              </p>
            </div>
          </label>

          <label className="rounded-lg border border-slate-200 p-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.proposalSubmissionOpen}
              onChange={(event) =>
                updateField("proposalSubmissionOpen", event.target.checked)
              }
            />
            <div>
              <p className="font-medium text-slate-800">Open Proposal Submission</p>
              <p className="text-sm text-slate-500">
                Students can only create a project proposal when this switch is on.
              </p>
            </div>
          </label>

          <label className="rounded-lg border border-slate-200 p-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.preselectPhaseEnabled}
              onChange={(event) =>
                updateField("preselectPhaseEnabled", event.target.checked)
              }
            />
            <div>
              <p className="font-medium text-slate-800">Enable Teacher Preselection</p>
              <p className="text-sm text-slate-500">
                Teachers can invite a student leader first, then the leader accepts or rejects.
              </p>
            </div>
          </label>

          <label className="rounded-lg border border-slate-200 p-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.freePickOpen}
              onChange={(event) => updateField("freePickOpen", event.target.checked)}
            />
            <div>
              <p className="font-medium text-slate-800">Open Free-Pick Supervisor Phase</p>
              <p className="text-sm text-slate-500">
                Group representatives can browse all supervisors and send requests directly.
              </p>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Minimum Group Size</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.minGroupSize}
              onChange={(event) => updateField("minGroupSize", event.target.value)}
            />
          </div>
          <div>
            <label className="label">Maximum Group Size</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.maxGroupSize}
              onChange={(event) => updateField("maxGroupSize", event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Policy Notes Shown To Users</label>
          <textarea
            className="input min-h-24"
            value={form.notes || ""}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Example: Group representative handles proposal, supervisor request, and defense slot selection."
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 border border-slate-200">
          Teacher capacity is still configured per teacher account in `Manage Teachers`.
          The system checks the whole group size against the selected teacher's remaining capacity.
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button className="btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </div>

      {/* FORCE MERGE MODAL */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowMergeModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Merge className="w-6 h-6 text-blue-600" />
                Force Merge Students
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowMergeModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 pb-4 space-y-6">
              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg border border-blue-100">
                Select orphan students (students without a project) and forcibly group them together. The first student selected will become the leader.
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>1. Select Students ({orphanStudents.length} Available)</span>
                  <span className="text-blue-600 font-normal">{mergeForm.studentIds.length} Selected</span>
                </label>
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-2 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {orphanStudents.length === 0 && (
                    <div className="col-span-full text-center py-4 text-slate-500 text-sm">
                      No unassigned students available.
                    </div>
                  )}
                  {orphanStudents.map((student) => (
                    <label
                      key={student._id}
                      className={`flex items-center gap-3 p-2 rounded border cursor-pointer bg-white transition-colors ${
                        mergeForm.studentIds.includes(student._id) ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={mergeForm.studentIds.includes(student._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMergeForm({ ...mergeForm, studentIds: [...mergeForm.studentIds, student._id] });
                          } else {
                            setMergeForm({ ...mergeForm, studentIds: mergeForm.studentIds.filter(id => id !== student._id) });
                          }
                        }}
                      />
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                        <p className="text-xs text-slate-500 truncate">{student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  2. Project Details
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Project / Group Title (e.g. Admin Assigned Project)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={mergeForm.title}
                    onChange={(e) => setMergeForm({ ...mergeForm, title: e.target.value })}
                  />
                  <textarea
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows="2"
                    value={mergeForm.description}
                    onChange={(e) => setMergeForm({ ...mergeForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  3. Assign Supervisor (Optional)
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  value={mergeForm.supervisorId}
                  onChange={(e) => setMergeForm({ ...mergeForm, supervisorId: e.target.value })}
                >
                  <option value="">-- No Supervisor (Leave Pending) --</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.department})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0 mt-2">
              <button
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                onClick={() => setShowMergeModal(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                disabled={mergeForm.studentIds.length === 0 || mergeLoading}
                onClick={handleForceMerge}
              >
                {mergeLoading ? "Processing..." : `Merge ${mergeForm.studentIds.length} Student(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationSettingsPage;
