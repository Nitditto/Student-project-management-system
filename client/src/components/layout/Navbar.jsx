import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  Bell,
  Calendar,
  ChevronRight,
  HelpCircle,
  MessageCircle,
  Play,
  Settings,
  ShieldAlert,
  Trash2,
  User,
  X,
} from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import QrScannerModal from "../modal/QrScannerModal";
import NotificationDetailModal from "../modal/NotificationDetailModal";
import {
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "../../store/slices/notificationSlice";
import {
  buildNotificationPresentation,
  formatNotificationRelativeTime,
} from "../../lib/notifications";
import { AiOutlineScan } from "react-icons/ai";

const stepsData = [
  {
    number: "01",
    title: "Đăng ký Đề tài & Xem Thông tin",
    description: "Sử dụng mục Đăng ký đề tài trên hệ thống để điền tên đề tài, mô tả và lập đề cương chi tiết, sau đó theo dõi trạng thái phê duyệt trực tuyến từ GVHD và Bộ môn.",
  },
  {
    number: "02",
    title: "Quản lý Tiến độ & Điểm danh họp",
    description: "Xem kế hoạch công việc tuần, ghi nhận nhật ký thực hiện và sử dụng nút Quét mã QR (cạnh Avatar) trên thanh điều hướng để điểm danh trong các buổi họp định kỳ với GVHD.",
  },
  {
    number: "03",
    title: "Nộp Báo cáo Học phần & Cột mốc",
    description: "Truy cập tính năng 'Nộp bài' (Upload Files) để tải lên các tài liệu báo cáo tiến độ hoặc báo cáo dự thảo dưới dạng file PDF/DOCX (dung lượng tối đa 50MB) theo đúng thời hạn.",
  },
  {
    number: "04",
    title: "Đối chiếu Tài liệu & Xem Phân tích",
    description: "Nhấp vào nút 'Phân tích học thuật' sau khi nộp file để hệ thống tự động đối chiếu cơ sở dữ liệu RAG, dự đoán điểm CLO, kiểm tra trùng lặp và gợi ý các khuyến nghị chỉnh sửa.",
  },
  {
    number: "05",
    title: "Theo dõi Đánh giá từ Giảng viên",
    description: "Truy cập trang chi tiết bài nộp để xem trực tiếp các nhận xét, góp ý chi tiết cùng bảng điểm đánh giá độc lập từ GVHD và Giảng viên phản biện (GVPB).",
  },
  {
    number: "06",
    title: "Nhận Lịch Bảo vệ từ Thông báo",
    description: "Kiểm tra biểu tượng Chuông thông báo (Bell) để nhận thông tin chi tiết về thời gian, phòng bảo vệ, số thứ tự thuyết trình và thành viên Hội đồng đánh giá.",
  },
  {
    number: "07",
    title: "Nộp Báo cáo Chỉnh sửa Hoàn thiện",
    description: "Sau khi bảo vệ trước Hội đồng, thực hiện chỉnh sửa báo cáo theo góp ý và nộp bản PDF đồ án hoàn thiện cuối cùng lên hệ thống để lưu trữ và kết thúc học phần.",
  },
];

const faqData = [
  {
    question: "Điều kiện để được bảo vệ đồ án tốt nghiệp là gì?",
    answer: "Sinh viên cần hoàn thành đủ số tín chỉ tích lũy theo quy định, không bị kỷ luật, hoàn thành đồ án đúng hạn, được GVHD ký đồng ý cho bảo vệ, và tỷ lệ trùng lặp báo cáo (nếu có kiểm tra) nằm trong giới hạn cho phép của khoa (thường dưới 20%).",
  },
  {
    question: "Tỷ lệ trùng lặp báo cáo đồ án được tính như thế nào?",
    answer: "Hệ thống sẽ đối chiếu tự động báo cáo của bạn với cơ sở dữ liệu học thuật và internet. Kết quả trả về gồm tỷ lệ trùng lặp tổng quan và chi tiết từng phần. Nếu vượt quá giới hạn, sinh viên cần chỉnh sửa cách diễn đạt (paraphrase) và trích dẫn nguồn đúng quy chuẩn.",
  },
  {
    question: "Thời gian thuyết trình và chất vấn tại Hội đồng là bao lâu?",
    answer: "Thông thường mỗi sinh viên/nhóm sinh viên có 15-20 phút thuyết trình slide và demo sản phẩm, sau đó là 10-15 phút nghe câu hỏi nhận xét từ GV Phản biện, các thành viên Hội đồng và trả lời trực tiếp.",
  },
  {
    question: "Em cần mang theo những tài liệu gì trong ngày bảo vệ?",
    answer: "Bạn cần chuẩn bị slide trình chiếu (lưu trên USB và gửi trước cho thư ký), poster đồ án (nếu khoa yêu cầu treo), các bản in báo cáo (đã đóng quyển bìa mềm/cứng theo quy chuẩn), và máy tính cá nhân để chạy demo sản phẩm thực tế.",
  },
  {
    question: "Làm thế nào nếu kết quả bảo vệ không đạt yêu cầu?",
    answer: "Nếu điểm số từ hội đồng dưới trung bình hoặc đồ án bị bác bỏ, sinh viên sẽ phải thực hiện chỉnh sửa lớn dưới sự hướng dẫn của GVHD và đăng ký bảo vệ lại ở đợt sau (thường là học kỳ kế tiếp).",
  },
];

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLanguage === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("steps");
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const { authUser } = useSelector((state) => state.auth);
  const notifications = useSelector((state) => state.notification.list);
  const unreadCount = useSelector((state) => state.notification.unreadCount);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!authUser?._id) return undefined;

    dispatch(getNotifications());
    const intervalId = setInterval(() => {
      dispatch(getNotifications());
    }, 30000);

    return () => clearInterval(intervalId);
  }, [authUser?._id, dispatch]);

  const presentedNotifications = useMemo(
    () => notifications.map(buildNotificationPresentation),
    [notifications],
  );
  const topNotifications = presentedNotifications.slice(0, 6);

  const handleLogout = () => {
    dispatch(logout()).then(() => {
      navigate("/login");
    });
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  const getNotificationIcon = (type) => {
    switch (type) {
      case "feedback":
        return <MessageCircle className="h-4 w-4 text-sky-600" />;
      case "attendance":
      case "meeting":
      case "leave":
        return <Calendar className="h-4 w-4 text-cyan-600" />;
      case "defense":
        return <ShieldAlert className="h-4 w-4 text-indigo-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "system":
        return <Settings className="h-4 w-4 text-slate-600" />;
      default:
        return <User className="h-4 w-4 text-slate-600" />;
    }
  };

  const openNotificationDetail = (notification) => {
    if (!notification.isRead) {
      dispatch(markAsRead(notification._id));
    }
    setSelectedNotification(notification);
  };

  const openNotificationDestination = (notification) => {
    if (!notification) return;

    if (!notification.isRead) {
      dispatch(markAsRead(notification._id));
    }

    setSelectedNotification(null);
    setNotificationsOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const notificationsPagePath =
    authUser?.role === "Teacher"
      ? "/teacher/notifications"
      : "/student/notifications";

  return (
    <nav className={`fixed top-0 w-full border-b border-slate-200 bg-white shadow-sm ${
      helpModalOpen || scannerOpen || selectedNotification ? "z-50" : "z-30"
    }`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <button
              id="navbar-mobile-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {sidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            <div className="ml-4 flex items-center" id="navbar-logo">
              <div className="flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="ml-3 hidden sm:block">
                  <h1 className="text-lg font-semibold text-slate-800">
                    {t("app.title")}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition duration-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              title={currentLanguage === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
            >
              <span className={`transition-all duration-300 ${currentLanguage === "vi" ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                VN
              </span>
              <span className="text-slate-300">|</span>
              <span className={`transition-all duration-300 ${currentLanguage === "en" ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                EN
              </span>
            </button>

            <button
              id="navbar-help"
              onClick={() => {
                setHelpModalOpen(true);
                setNotificationsOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={t("nav.help")}
            >
              <HelpCircle className="h-5 w-5" />
            </button>

            <div className="relative" id="navbar-notifications">
              <button
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setProfileDropdownOpen(false);
                }}
                className="relative rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={t("nav.notifications")}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-[1.15rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-[22rem]">
                  <div className="border-b border-slate-200 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {t("nav.notifications")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {unreadCount > 0
                            ? `${unreadCount} ${t("nav.unreadUpdates")}`
                            : t("nav.allCaughtUp")}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                          onClick={() => dispatch(markAllAsRead())}
                        >
                          {t("nav.markAllAsRead")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[28rem] overflow-y-auto">
                    {topNotifications.length > 0 ? (
                      topNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 ${!notification.isRead ? "bg-blue-50/60" : "bg-white"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1 rounded-xl bg-slate-100 p-2">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                className="w-full text-left"
                                onClick={() =>
                                  openNotificationDetail(notification)
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {notification.title}
                                  </p>
                                  {!notification.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                                  {notification.summary}
                                </p>
                                <p className="mt-2 text-xs text-slate-500">
                                  {formatNotificationRelativeTime(
                                    notification.createdAt,
                                  )}
                                </p>
                              </button>
                            </div>
                            <button
                              className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() =>
                                dispatch(deleteNotification(notification._id))
                              }
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        {t("nav.noNotifications")}
                      </div>
                    )}
                  </div>

                  {(authUser?.role === "Student" ||
                    authUser?.role === "Teacher") && (
                    <div className="border-t border-slate-200 p-3">
                      <button
                        className="btn-outline w-full"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate(notificationsPagePath);
                        }}
                      >
                        {t("nav.viewAllNotifications")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {authUser?.role === "Student" && (
              <button
                id="navbar-qr-scanner"
                onClick={() => setScannerOpen(true)}
                title={t("nav.scanQr")}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <AiOutlineScan className="h-6 w-6" />
              </button>
            )}

            <div className="relative" id="navbar-profile">
              <button
                onClick={() => {
                  setProfileDropdownOpen((current) => !current);
                  setNotificationsOpen(false);
                }}
                className="flex items-center space-x-3 rounded-lg p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                  <span className="text-sm font-medium text-white">
                    {getInitials(authUser?.name)}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">
                    {authUser?.name}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    {authUser?.role}
                  </p>
                </div>
                <svg
                  className="h-4 w-4 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="p-2">
                    <div className="border-b border-slate-200 px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">
                        {authUser?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {authUser?.email}
                      </p>
                      <p className="mt-1 text-xs font-medium capitalize text-blue-600">
                        {authUser?.role}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        to={`/${authUser?.role?.toLowerCase() || "student"}/settings`}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-3 text-slate-400" />
                        {t("nav.settings")}
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 py-1">
                      <button
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-3 text-red-400" />
                        {t("nav.signOut")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(profileDropdownOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setProfileDropdownOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}

      {scannerOpen && <QrScannerModal onClose={() => setScannerOpen(false)} />}
      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onOpenDestination={() =>
          openNotificationDestination(selectedNotification)
        }
      />

      {/* Help & Q&A Modal */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setHelpModalOpen(false)}
          />

          {/* Modal content */}
          <div className="relative z-10 w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t("nav.help")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentLanguage === "vi"
                      ? "Thông tin chi tiết từng bước & giải đáp thắc mắc"
                      : "Detailed step-by-step information & FAQs"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6">
              <button
                onClick={() => setActiveTab("steps")}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "steps"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("nav.steps")}
              </button>
              <button
                onClick={() => setActiveTab("faq")}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "faq"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t("nav.faq")}
              </button>
            </div>

            {/* Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "steps" ? (
                <div className="relative border-l-2 border-blue-100 ml-4 pl-6 space-y-8">
                  {stepsData.map((step, idx) => (
                    <div key={idx} className="relative">
                      {/* Step Indicator Dot */}
                      <span className="absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white ring-4 ring-white">
                        {step.number}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          {step.title}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {faqData.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden transition-all duration-200"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="text-sm font-semibold text-slate-800 pr-4">
                            {faq.question}
                          </span>
                          <span
                            className={`transform transition-transform text-slate-400 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 bg-white p-4">
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-medium text-slate-500 text-center sm:text-left">
                {authUser?.role === "Teacher" 
                  ? "🎓 Chúc các thầy cô làm việc hiệu quả và đánh giá chính xác!" 
                  : "🎓 Chúc các bạn chuẩn bị thật tốt và đạt kết quả cao!"}
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setHelpModalOpen(false);
                    // Dispatch custom event to trigger onboarding tour
                    window.dispatchEvent(new CustomEvent("start-onboarding-tour"));
                  }}
                  className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1 w-full sm:w-auto justify-center flex-shrink-0"
                >
                  <Play className="h-3 w-3" />
                  Khám phá giao diện
                </button>
                {(authUser?.role === "Student" || authUser?.role === "Teacher") && (
                  <button
                    onClick={() => {
                      setHelpModalOpen(false);
                      navigate(authUser?.role === "Teacher" ? "/teacher/guide" : "/student/guide");
                    }}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 w-full sm:w-auto justify-center flex-shrink-0"
                  >
                    Xem tài liệu chi tiết
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
