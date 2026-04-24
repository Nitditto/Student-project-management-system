import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AddTeacher from "../../components/modal/AddTeacher";
import { getAllUsers, updateTeacher, deleteTeacher } from "../../store/slices/adminSlice";
import { toggleTeacherModal } from "../../store/slices/popupSlice";
import { BadgeCheck, Users, X, Plus, TriangleAlert, AlertTriangle } from "lucide-react";

const getTeacherCapacity = (teacher, fallback = 36) => {
  if (typeof teacher?.maxStudent === "number") return teacher.maxStudent;
  if (typeof teacher?.maxStudents === "number") return teacher.maxStudents;

  const parsedMaxStudent = Number(teacher?.maxStudent);
  if (!Number.isNaN(parsedMaxStudent) && parsedMaxStudent > 0) {
    return parsedMaxStudent;
  }

  const parsedMaxStudents = Number(teacher?.maxStudents);
  if (!Number.isNaN(parsedMaxStudents) && parsedMaxStudents > 0) {
    return parsedMaxStudents;
  }

  return fallback;
};

const ManageTeachers = () => {
  const { users } = useSelector((state) => state.admin);
  const { isCreateTeacherModalOpen } = useSelector((state) => state.popup);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    experties: "",
    maxStudents: 36,
  });
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllUsers());
  }, []);

  const teachers = useMemo(() => {
    return (users || []).filter(
      (user) => user?.role.toLowerCase() === "teacher",
    );
  }, [users]);

  const departments = useMemo(() => {
    const set = new Set(
      (teachers || []).map((t) => t.department).filter(Boolean),
    );
    return Array.from(set);
  }, [teachers]);

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      (teacher.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (teacher.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterDepartment === "all" || teacher.department === filterDepartment;

    return matchesSearch && matchesFilter;
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeacher(null);
    setFormData({
      name: "",
      email: "",
      department: "",
      experties: "",
      maxStudents: 36,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTeacher) {
      dispatch(updateTeacher({ id: editingTeacher._id, data: formData }));
    }
    handleCloseModal();
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
      experties: Array.isArray(teacher.experties)
        ? teacher.experties[0]
        : teacher.experties,
      maxStudents: getTeacherCapacity(teacher),
    });
    setShowModal(true);
  };

  const handleDelete = (teacher) => {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (teacherToDelete) {
      dispatch(deleteTeacher(teacherToDelete._id));
      setShowDeleteModal(false);
      setTeacherToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTeacherToDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header flex flex-col md:flex-row items-start justify-between md:items-center">
            <div className="">
              <h1 className="card-title">Manage Teachers</h1>
              <p className="card-subtitle">
                Add, edit, and manage teacher accounts
              </p>
            </div>
            <button
              className="btn btn-primary flex items-center space-x-2 mt-4 md:mt-0"
              onClick={() => dispatch(toggleTeacherModal())}
            >
              <Plus className="w-5 h-5" />
              <span>Add New Teacher</span>
            </button>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">
                  Total Teachers
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {teachers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BadgeCheck className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">
                  Assigned Students
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {teachers.reduce(
                    (sum, t) => sum + (t.assignedStudents?.length || 0),
                    0,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TriangleAlert className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">
                  Departments
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {departments.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="card">
          <div className="flex flex-fol md:flex-row gap-4">
            <div className="flex-1">
              <label
                htmlFor=""
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Search Teachers
              </label>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="input-field w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter Status
              </label>
              <select
                className="input-field w-full"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Teachers table */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Teachers List</h2>
          </div>
          <div className="overflow-x-auto">
            {filteredTeachers && filteredTeachers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Teacher Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Expertise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Join Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredTeachers.map((teacher) => {
                    return (
                      <tr key={teacher._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {teacher.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {teacher.email}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-slate-900">
                              {teacher.department || "--"}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {Array.isArray(teacher.experties) &&
                          teacher.experties.length > 0
                            ? teacher.experties.join(", ")
                            : teacher.experties}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <div className="text-sm text-slate-900">
                              {teacher.createdAt
                                ? new Date(teacher.createdAt).toLocaleString()
                                : "--"}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleEdit(teacher)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDelete(teacher)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              filteredTeachers.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No teachers found matching your criteria
                </div>
              )
            )}
          </div>

          {/* Edit Student Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Edit Teacher
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6 " />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input-field w-full p-2 border-b border-slate-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="input-field w-full p-2 border-b border-slate-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      required
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="input-field w-full p-2 border-b border-slate-600 focus:outline-none"
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Software Engineering">
                        Software Engineering
                      </option>
                      <option value="Information Technology">
                        Information Technology
                      </option>
                      <option value="Electronics and Communication">
                        Electronics and Communication
                      </option>
                      <option value="Mechanical Engineering">
                        Mechanical Engineering
                      </option>
                      <option value="Civil Engineering">
                        Civil Engineering
                      </option>
                      <option value="Electrical Engineering">
                        Electrical Engineering
                      </option>
                      <option value="Data Science">Data Science</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Expertise
                    </label>
                    <select
                      required
                      value={formData.experties}
                      onChange={(e) =>
                        setFormData({ ...formData, experties: e.target.value })
                      }
                      className="input-field w-full p-2 border-b border-slate-600 focus:outline-none"
                    >
                      <option value="">Select Area of Expertise</option>
                      <option value="Artificial Intelligence">
                        Artificial Intelligence
                      </option>
                      <option value="Machine Learning">
                        Machine Learning
                      </option>
                      <option value="Data Science">Data Science</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Cloud Computing">Cloud Computing</option>
                      <option value="Software Development">
                        Software Development
                      </option>
                      <option value="Web Development">Web Development</option>
                      <option value="Mobile App Development">
                        Mobile App Development
                      </option>
                      <option value="Database Systems">
                        Database Systems
                      </option>
                      <option value="Computer Networks">
                        Computer Networks
                      </option>
                      <option value="Operating Systems">
                        Operating Systems
                      </option>
                      <option value="Human-Computer Interaction">
                        Human-Computer Interaction
                      </option>
                      <option value="Big Data Analytics">
                        Big Data Analytics
                      </option>
                      <option value="Blockchain Technology">
                        Blockchain Technology
                      </option>
                      <option value="Internet of Things (IoT)">
                        Internet of Things (IoT)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Max Students
                    </label>
                    <input
                      type="number"
                      required
                      max={36}
                      min={1}
                      value={formData.maxStudents}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxStudents: e.target.value,
                        })
                      }
                      className="input-field w-full p-2 border-b border-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="btn-danger"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Update Teacher
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showDeleteModal && teacherToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Delete Teacher
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Are you sure you want to delete{" "}
                    <span className="">
                      {teacherToDelete.name}? This action cannot be undone
                    </span>
                  </p>

                  <div className="flex justify-center space-x-3">
                    <button className="btn-secondary" onClick={cancelDelete}>
                      Cancel
                    </button>
                    <button className="btn-danger" onClick={confirmDelete}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCreateTeacherModalOpen && <AddTeacher />}
        </div>
      </div>
    </>
  );
};

export default ManageTeachers;
