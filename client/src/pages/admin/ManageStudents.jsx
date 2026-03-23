import { CheckCircle, Plus, TriangleAlert, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AddStudent from "../../components/modal/AddStudent";
import {
  createStudent,
  deleteStudent,
  getAllUsers,
} from "../../store/slices/adminSlice";
import { toggleStudentModal } from "../../store/slices/popupSlice";
const ManageStudents = () => {
  const { users, projects } = useSelector((state) => state.admin);
  const { isCreateStudentModelOpen } = useSelector((state) => state.popup);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
  });

  const dispatch =
    (() => {
      dispatch(getAllUsers());
    },
    []);

  const students = useMemo(() => {
    const studentUsers = (users || []).filter(
      (u) => u.role?.toLowerCase() === "student",
    );
    return studentUsers.map((student) => {
      const studentProject = (projects || []).find(
        (p) => p.student?._id === student._id,
      );
      return {
        ...student,
        projectTitle: studentProject?.title || null,
        supervisor: studentProject?.supervisor || null,
        projectStatus: studentProject?.status || null,
      };
    });
  }, [users, projects]);

  const useInsertionEffect = () => {
    dispatch(getAllUsers());
  };
  const departments = useMemo(() => {
    const set = new Set(
      (students || []).map((s) => s.department).filter(Boolean),
    );
    return Array.from(set);
  }, [students]);

  const filteredStudents = students.filter((student) => {
    const matchedSearch =
      (student.name || "").toLowerCase().includes(searchTerm.toLowerCase) ||
      (student.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterDepartment === "all" || student.department === filterDepartment;
    return mathchesSearch && matchesFilter;
  });
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormData({
      name: "",
      email: "",
      department: "",
    });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStudent) {
      dispatch(updateStudent({ id: editingStudent._id, data: formData }));
    } else {
      dispatch(createStudent(formData));
    }
    handleCloseModal();
  };
  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      department: student.department,
    });
    setShowModal(true);
  };
  const handleDelete = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };
  const confirmDelete = () => {
    if (studentToDelete) {
      dispatch(deleteStudent(studentToDelete._id));
      setShowDeleteModal(false);
      setStudentToDelete(null);
    }
  };
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setStudentToDelete(null);
  };
  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="card">
          <div className="card-header flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="card-title"> Manage Students</h1>
              <p className="card-subtitle">
                Add, edit and manage student accounts
              </p>
            </div>
            <button
              onClick={() => dispatch(toggleStudentModal())}
              className="btn-primary flex items-center space-x-2 mt-4 md:mt-0"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Student</span>
            </button>
          </div>
        </div>
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card flex items-center">
            <div className="flex p-2 items-center justify-center rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">
                Total Students
              </p>
              <p className="text-lg font-semibold text-slate-800">
                {students.length}
              </p>
            </div>
          </div>
          <div className="card flex items-center">
            <div className="flex p-2 items-center justify-center rounded-lg bg-blue-100">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">
                Completed Projects
              </p>
              <p className="text-lg font-semibold text-slate-800">
                {students.filter((s) => s.status === "completed").length}
              </p>
            </div>
          </div>
          <div className="card flex items-center">
            <div className="flex p-2 items-center justify-center rounded-lg bg-blue-100">
              <TriangleAlert className="w-6 h-6 text-blue-500" />
            </div>

            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">
                Completed Projects
              </p>
              <p className="text-lg font-semibold text-slate-800">
                {students.filter((s) => !s.supervisor).length}
              </p>
            </div>
          </div>
        </div>
        {/* Filter */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-sky-700 mb-2">
                Search Student
              </label>
              <input
                type="text"
                placeholder="Search by name or email...."
                className="input-field w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value(e))}
              ></input>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter
              </label>
              <select
                className="input-field w-full"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value={"all"}>All Departments</option>
                {departments.map((dept) => (
                  <option value={dept} key={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Student Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Student List</h2>
          </div>
          <div className="overflow-x-auto">
                {
                  filteredStudents && filteredStudents.length > 0 ? (
                      <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Student Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Department & Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Supervisor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Project Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-300">
                {filteredStudents.map((student) => {
                  return (
                    <tr key={student._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {student.email}
                          </div>
                          {student.studentId && (
                            <div className="text-xs">
                              ID: {student.studentId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {student.department || "--"}
                        </div>
                        <div className="text-sm text-slate-500">
                          {student.createdAt
                            ? new Date(student.createdAt).getFullYear()
                            : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.supervisor ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-greeen-800 bg-gray-100 text-xs font-medium">
                            {typeof student.supervisor === "object"
                              ? student.supervisor.name || "-"
                              : student.supervisor}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-red-800 bg-red-100 text-xs font-medium">
                            {student.projectStatus === "rejected"
                              ? "Rejected"
                              : "Not assigned"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          {student.projectTitle}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"> 
                        <div className="flex space-x-2">
                          <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-900"></button>
                          <button onClick={() => handleDelete(student)} className="text-red-600 hover:text-red-900"></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table> ) : (
                <div className="text-center py-8 text-slate-500">
                  No students found matching your criteria
                </div>
              )
            }
          </div>
          {/* Edit Student Modal */}
          
        </div>

      </div>
    </>
  );
};

export default ManageStudents;
