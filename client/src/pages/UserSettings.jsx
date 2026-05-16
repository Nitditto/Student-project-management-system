import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateProfile, changePassword } from "../store/slices/authSlice";
import { User, Mail, Building2, BookOpen, ShieldCheck, Save, Lock, Eye, EyeOff, ChevronDown, X } from "lucide-react";

const DEPARTMENTS = [
  "Computer Science",
  "Software Engineering",
  "Information Technology",
  "Electronics and Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Data Science",
];

const EXPERTISE_OPTIONS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Data Science",
  "Cybersecurity",
  "Cloud Computing",
  "Software Development",
  "Web Development",
  "Mobile App Development",
  "Database Systems",
  "Computer Networks",
  "Operating Systems",
  "Human-Computer Interaction",
  "Big Data Analytics",
  "Blockchain Technology",
  "Internet of Things (IoT)",
];

const UserSettings = () => {
  const dispatch = useDispatch();
  const { authUser, isUpdatingProfile, isUpdatingPassword } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    name: authUser?.name || "",
    department: authUser?.department || "",
    experties: authUser?.experties || [],
  });

  const [expertiseDropdownOpen, setExpertiseDropdownOpen] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleInfoChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      department: formData.department,
    };
    // Only send experties for Teacher role
    if (authUser?.role === "Teacher") {
      payload.experties = formData.experties;
    }
    await dispatch(updateProfile(payload));
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    try {
      await dispatch(changePassword(passwordData)).unwrap();
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      // Error already shown via toast
    }
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information and security preferences.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="card">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-semibold text-white">
              {getInitials(authUser?.name)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {authUser?.name}
            </h2>
            <p className="text-sm text-slate-500">{authUser?.email}</p>
            <span className="badge badge-approved mt-1.5 capitalize">
              {authUser?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Personal Information
          </h2>
          <p className="card-subtitle">
            Update your basic details. Email and role cannot be changed.
          </p>
        </div>

        <form onSubmit={handleSaveInfo} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInfoChange}
                  required
                  className="input pl-9"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={authUser?.email || ""}
                  disabled
                  className="input pl-9 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Email cannot be changed.
              </p>
            </div>

            {/* Department — Student & Teacher only */}
            {authUser?.role !== "Admin" && (
            <div>
              <label className="label">Department</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInfoChange}
                  className="input pl-9 appearance-none"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            )}

            {/* Expertise — Only for Teachers */}
            {authUser?.role === "Teacher" && (
              <div>
                <label className="label">Expertise</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExpertiseDropdownOpen(!expertiseDropdownOpen)}
                    className="input pl-9 pr-9 text-left flex items-center"
                  >
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <span className={formData.experties.length === 0 ? "text-slate-400" : "text-slate-800"}>
                      {formData.experties.length === 0
                        ? "Select expertise areas"
                        : `${formData.experties.length} selected`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${expertiseDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {expertiseDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {EXPERTISE_OPTIONS.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.experties.includes(opt)}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                experties: e.target.checked
                                  ? [...prev.experties, opt]
                                  : prev.experties.filter((v) => v !== opt),
                              }));
                            }}
                            className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected tags */}
                {formData.experties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.experties.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              experties: prev.experties.filter((v) => v !== tag),
                            }))
                          }
                          className="hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isUpdatingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            Security & Password
          </h2>
          <p className="card-subtitle">
            Update your password to keep your account secure.
          </p>
        </div>

        <form onSubmit={handleSavePassword} className="space-y-5">
          <div className="max-w-md space-y-4">
            {/* Current Password */}
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Enter current password"
                  required
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Repeat new password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-start pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="btn-secondary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSettings;
