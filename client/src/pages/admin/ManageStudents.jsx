import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AddStudent from "../../components/modal/AddStudent";
import {
  createStudent,
  getAllUsers,
  getAllProjects,
  updateStudent,
  deleteStudent,
} from "../../store/slices/adminSlice";
import {
  AlertTriangle,
  CheckCircle,
  Plus,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { toggleStudentModal } from "../../store/slices/popupSlice";

const ManageStudents = () => {
  const { users, projects } = useSelector((state) => state.admin);
  const { isCreateStudentModalOpen } = useSelector((state) => state.popup);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
  });
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllUsers());
    dispatch(getAllProjects());
  }, []);

  const students = useMemo(() => {
    const studentUsers = (users || []).filter(
      (user) => user?.role.toLowerCase() === "student",
    );
    return studentUsers.map((student) => {
      const studentProject = (projects || []).find((project) => {
        const leaderId = (project.student?._id || project.student || "").toString();
        const memberIds = (project.members || []).map((m) => (m?._id || m || "").toString());
        return leaderId === student._id.toString() || memberIds.includes(student._id.toString());
      });
      return {
        ...student,
        projectTitle: studentProject?.title || null,
        supervisor: studentProject?.supervisor || null,
        projectStatus: studentProject?.status || null,
      };
    });
  }, [users, projects]);

  const departments = useMemo(() => {
    const set = new Set(
      (students || []).map((s) => s.department).filter(Boolean),
    );
    return Array.from(set);
  }, [students]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      (student.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterDepartment === "all" || student.department === filterDepartment;

    return matchesSearch && matchesFilter;
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
        {/* Header */}
        <div className="card">
          <div className="card-header flex flex-col md:flex-row items-start justify-between md:items-center">
            <div className="">
              <h1 className="card-title">Quản lý sinh viên</h1>
              <p className="card-subtitle">
                Thêm mới, chỉnh sửa và quản lý tài khoản của sinh viên
              </p>
            </div>
            <button
              className="btn btn-primary flex items-center space-x-2 mt-4 md:mt-0"
              onClick={() => dispatch(toggleStudentModal())}
            >
              <Plus className="w-5 h-5" />
              <span>Thêm sinh viên</span>
            </button>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">
                  Tổng số sinh viên
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {students.length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">
                  Đề tài hoàn thành
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {
                    students.filter(
                      (student) => student.projectStatus === "completed",
                    ).length
                  }
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
                <p className="text-sm font-medium text-slate-600">Chưa phân công</p>
                <p className="text-lg font-semibold text-slate-800">
                  {students.filter((student) => !student.supervisor).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tìm kiếm sinh viên
              </label>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                className="input-field w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Lọc theo bộ môn
              </label>
              <select
                className="input-field w-full"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">Tất cả bộ môn</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students table */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Danh sách sinh viên</h2>
          </div>
          <div className="overflow-x-auto">
            {filteredStudents && filteredStudents.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Thông tin sinh viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Bộ môn & Khóa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Giảng viên hướng dẫn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Tên đề tài
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-200">
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
                              <div className="text-sm text-slate-500">
                                MSSV: {student.studentId}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-slate-900">
                              {student.department || "--"}
                            </div>
                            {student.createdAt && (
                              <div className="text-sm text-slate-500">
                                {student.createdAt
                                  ? new Date(student.createdAt).getFullYear()
                                  : "--"}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.supervisor ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-green-800 bg-green-100 text-xs font-medium">
                              {student.supervisor.name || student.supervisor}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-red-800 bg-red-100 text-xs font-medium">
                              {student.projectStatus === "rejected"
                                ? "Bị từ chối"
                                : "Chưa phân công"}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <div className="text-sm text-slate-900">
                              {student.projectTitle}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleEdit(student)}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDelete(student)}
                            >
                              Xóa bỏ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              filteredStudents.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Không tìm thấy sinh viên nào phù hợp.
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
                    Chỉnh sửa thông tin sinh viên
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Họ và tên
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
                      Địa chỉ Email
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
                      Bộ môn / Khoa
                    </label>
                    <select
                      required
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="input-field w-full p-2 border-b border-slate-600 focus:outline-none"
                    >
                      <option value="">Chọn bộ môn...</option>
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
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="btn-danger"
                    >
                      Hủy bỏ
                    </button>
                    <button type="submit" className="btn-primary">
                      Cập nhật
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showDeleteModal && studentToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Xác nhận xóa sinh viên
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Bạn có chắc chắn muốn xóa sinh viên {studentToDelete.name}? Hành động này sẽ không thể hoàn tác.
                  </p>

                  <div className="flex justify-center space-x-3">
                    <button className="btn-secondary" onClick={cancelDelete}>
                      Hủy bỏ
                    </button>
                    <button className="btn-danger" onClick={confirmDelete}>
                      Xóa bỏ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCreateStudentModalOpen && <AddStudent />}
        </div>
      </div>
    </>
  );
};

export default ManageStudents;
