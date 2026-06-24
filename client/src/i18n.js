import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  vi: {
    translation: {
      "app.title": "Hệ thống Quản lý Đồ án Tốt nghiệp",
      "nav.help": "Quy trình & Hướng dẫn bảo vệ",
      "nav.notifications": "Thông báo",
      "nav.unreadUpdates": "thông báo chưa đọc",
      "nav.allCaughtUp": "Đã xem hết",
      "nav.markAllAsRead": "Đánh dấu tất cả đã đọc",
      "nav.viewAllNotifications": "Xem tất cả thông báo",
      "nav.scanQr": "Quét mã QR điểm danh",
      "nav.settings": "Cài đặt",
      "nav.signOut": "Đăng xuất",
      "nav.steps": "Quy trình 7 bước",
      "nav.faq": "Câu hỏi thường gặp (Q&A)",
      "nav.noNotifications": "Chưa có thông báo nào.",
      "nav.discoverInterface": "Khám phá giao diện",
      "nav.viewDetailedDocs": "Xem tài liệu chi tiết",
      "sidebar.home": "Trang chủ",
      "sidebar.projectRegistration": "Đăng ký đề tài",
      "sidebar.uploadFiles": "Nộp báo cáo",
      "sidebar.myDeadlines": "Lịch nộp bài",
      "sidebar.supervisorFlow": "Thông tin GVHD",
      "sidebar.defenseAttendance": "Bảo vệ & Điểm danh",
      "sidebar.teacherPreselect": "GVHD chọn đề tài",
      "sidebar.pendingRequests": "Yêu cầu chờ duyệt",
      "sidebar.mySupervision": "Đề tài hướng dẫn",
      "sidebar.deadlineManagement": "Quản lý lịch nộp",
      "sidebar.defenseHub": "Hội đồng bảo vệ",
      "sidebar.files": "Quản lý tệp tin",
      "sidebar.manageStudents": "Quản lý sinh viên",
      "sidebar.manageTeachers": "Quản lý giảng viên",
      "sidebar.assignSupervisor": "Phân công hướng dẫn",
      "sidebar.registrationSettings": "Cấu hình đăng ký",
      "sidebar.deadlines": "Đợt nộp bài",
      "sidebar.projects": "Danh sách đề tài",
      "sidebar.councils": "Hội đồng đánh giá",
    }
  },
  en: {
    translation: {
      "app.title": "Final Year Project Management System",
      "nav.help": "Process & Defense Guide",
      "nav.notifications": "Notifications",
      "nav.unreadUpdates": "unread updates",
      "nav.allCaughtUp": "All caught up",
      "nav.markAllAsRead": "Mark all as read",
      "nav.viewAllNotifications": "View All Notifications",
      "nav.scanQr": "Scan attendance QR",
      "nav.settings": "Settings",
      "nav.signOut": "Sign out",
      "nav.steps": "7-step process",
      "nav.faq": "Frequently Asked Questions (FAQ)",
      "nav.noNotifications": "No notifications yet.",
      "nav.discoverInterface": "Explore interface",
      "nav.viewDetailedDocs": "View detailed documents",
      "sidebar.home": "Home",
      "sidebar.projectRegistration": "Project Registration",
      "sidebar.uploadFiles": "Upload Files",
      "sidebar.myDeadlines": "My Deadlines",
      "sidebar.supervisorFlow": "Supervisor Flow",
      "sidebar.defenseAttendance": "Defense & Attendance",
      "sidebar.teacherPreselect": "Teacher Preselect",
      "sidebar.pendingRequests": "Pending Requests",
      "sidebar.mySupervision": "My Supervision",
      "sidebar.deadlineManagement": "Deadline Management",
      "sidebar.defenseHub": "Defense Hub",
      "sidebar.files": "Files",
      "sidebar.manageStudents": "Manage Students",
      "sidebar.manageTeachers": "Manage Teachers",
      "sidebar.assignSupervisor": "Assign Supervisor",
      "sidebar.registrationSettings": "Registration Settings",
      "sidebar.deadlines": "Deadlines",
      "sidebar.projects": "Projects",
      "sidebar.councils": "Councils",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("language") || "vi", // Default to Vietnamese
    fallbackLng: "vi",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
