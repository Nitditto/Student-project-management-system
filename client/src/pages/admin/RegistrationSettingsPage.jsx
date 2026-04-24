import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";

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
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/admin/registration-settings");
      setForm(response.data.data?.settings || form);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load registration settings",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
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
      await axiosInstance.put("/admin/registration-settings", form);
      toast.success("Registration settings updated");
      await loadSettings();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update registration settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card">Loading registration settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Project Registration Settings</h1>
        <p className="text-slate-200">
          Configure group mode, preselection phase, and when students can pick supervisors.
        </p>
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

        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          Teacher capacity is still configured per teacher account in `Manage Teachers`.
          The system checks the whole group size against the selected teacher's remaining capacity.
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Registration Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSettingsPage;
