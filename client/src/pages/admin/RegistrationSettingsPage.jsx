import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";
import { Lock, Unlock, Users, Merge, X } from "lucide-react";

const RegistrationSettingsPage = () => {
  const { t } = useTranslation();
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
      toast.success(t("admin.reg.toastSaveSuccess"));
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || t("admin.reg.toastSaveFailed"));
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
      return toast.warning(t("admin.reg.toastSelectOne"));
    }
    
    setMergeLoading(true);
    try {
      await axiosInstance.post("/admin/force-merge", {
        studentIds: mergeForm.studentIds,
        title: mergeForm.title || "Admin Assigned Project",
        description: mergeForm.description,
        supervisorId: mergeForm.supervisorId || undefined,
      });
      toast.success(t("admin.reg.toastMergeSuccess"));
      setShowMergeModal(false);
      setMergeForm({ studentIds: [], title: "", description: "", supervisorId: "" });
      await loadData(); // Reload to remove them from orphans list
    } catch (error) {
      toast.error(error.response?.data?.message || t("admin.reg.toastMergeFailed"));
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
          <h1 className="text-2xl font-bold mb-2">{t("admin.reg.title")}</h1>
          <p className="text-slate-200">
            {t("admin.reg.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowMergeModal(true)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
        >
          <Merge className="w-5 h-5" />
          {t("admin.reg.forceMergeBtn")}
        </button>
      </div>

      {/* GLOBAL GROUP LOCK CONTROL */}
      <div className={`card border-l-4 ${isLocked ? 'border-l-red-500' : 'border-l-green-500'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {isLocked ? <Lock className="w-5 h-5 text-red-500" /> : <Unlock className="w-5 h-5 text-green-500" />}
              {t("admin.reg.lockTitle")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t("admin.reg.lockSubtitle")}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {isLocked ? t("admin.reg.locked") : t("admin.reg.unlocked")}
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
              <span className="font-semibold text-slate-800">{t("admin.reg.manualLock")}</span>
            </label>
            <p className="text-sm text-slate-500 mt-1 pl-8">
              {t("admin.reg.manualLockDesc")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {t("admin.reg.autoLockDate")}
            </label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.groupEditLockDate}
              onChange={(e) => updateField("groupEditLockDate", e.target.value)}
            />
            <p className="text-sm text-slate-500 mt-1">
              {t("admin.reg.autoLockDesc")}
            </p>
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <div className="card-header">
          <h2 className="card-title">{t("admin.reg.policyTitle")}</h2>
          <p className="card-subtitle">
            {t("admin.reg.policySubtitle")}
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
              <p className="font-medium text-slate-800">{t("admin.reg.allowGroups")}</p>
              <p className="text-sm text-slate-500">
                {t("admin.reg.allowGroupsDesc")}
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
              <p className="font-medium text-slate-800">{t("admin.reg.openSubmission")}</p>
              <p className="text-sm text-slate-500">
                {t("admin.reg.openSubmissionDesc")}
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
              <p className="font-medium text-slate-800">{t("admin.reg.enablePreselect")}</p>
              <p className="text-sm text-slate-500">
                {t("admin.reg.enablePreselectDesc")}
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
              <p className="font-medium text-slate-800">{t("admin.reg.openFreePick")}</p>
              <p className="text-sm text-slate-500">
                {t("admin.reg.openFreePickDesc")}
              </p>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">{t("admin.reg.minSize")}</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.minGroupSize}
              onChange={(event) => updateField("minGroupSize", event.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("admin.reg.maxSize")}</label>
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
          <label className="label">{t("admin.reg.notes")}</label>
          <textarea
            className="input min-h-24"
            value={form.notes || ""}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder={t("admin.reg.notesPlaceholder")}
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 border border-slate-200">
          {t("admin.reg.capacityNote")}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button className="btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? `${t("student.proposal.submitting")}...` : t("admin.reg.saveSettings")}
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
                {t("admin.reg.modalMergeTitle")}
              </h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowMergeModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 pb-4 space-y-6">
              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg border border-blue-100">
                {t("admin.reg.mergeIntro")}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>{t("admin.reg.selectStudents", { count: orphanStudents.length })}</span>
                  <span className="text-blue-600 font-normal">{t("admin.reg.selectedCount", { count: mergeForm.studentIds.length })}</span>
                </label>
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-2 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {orphanStudents.length === 0 && (
                    <div className="col-span-full text-center py-4 text-slate-500 text-sm">
                      {t("admin.reg.noOrphans")}
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
                  {t("admin.reg.projDetails")}
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={t("admin.reg.projTitlePlaceholder")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={mergeForm.title}
                    onChange={(e) => setMergeForm({ ...mergeForm, title: e.target.value })}
                  />
                  <textarea
                    placeholder={t("admin.reg.projDescPlaceholder")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows="2"
                    value={mergeForm.description}
                    onChange={(e) => setMergeForm({ ...mergeForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {t("admin.reg.assignSupervisor")}
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  value={mergeForm.supervisorId}
                  onChange={(e) => setMergeForm({ ...mergeForm, supervisorId: e.target.value })}
                >
                  <option value="">{t("admin.reg.noSupervisorOption")}</option>
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
                {t("admin.students.cancel")}
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                disabled={mergeForm.studentIds.length === 0 || mergeLoading}
                onClick={handleForceMerge}
              >
                {mergeLoading ? `${t("student.proposal.submitting")}...` : t("admin.reg.mergeConfirm", { count: mergeForm.studentIds.length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationSettingsPage;
