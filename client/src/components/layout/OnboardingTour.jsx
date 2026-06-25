import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Play } from "lucide-react";

const getStepsForPage = (pathname, role) => {
  const isStudent = role === "Student";
  const isTeacher = role === "Teacher";

  // 1. PROJECT REGISTRATION FORM (Student)
  if (isStudent && pathname.includes("/submit-proposal")) {
    return [
      {
        target: "#proposal-form-container",
        title: "📝 Đăng Ký Đề Tài Mới",
        content: "Đây là biểu mẫu đăng ký đề tài tốt nghiệp của bạn. Hãy điền đầy đủ các thông tin cần thiết và gửi yêu cầu phê duyệt đến Bộ môn.",
      },
      {
        target: "#proposal-title-input",
        title: "🏷️ Tên Đề Tài Đồ Án",
        content: "Nhập tên đề tài chính xác bằng Tiếng Việt. Nên ghi rõ ràng, ngắn gọn và thể hiện được mục tiêu chính của sản phẩm.",
      },
      {
        target: "#proposal-desc-input",
        title: "📖 Mô Tả Chi Tiết Đề Tài",
        content: "Trình bày tóm tắt nội dung nghiên cứu, công nghệ áp dụng, các phân hệ chức năng cốt lõi và kết quả dự kiến đạt được.",
      },
      {
        target: "#proposal-file-input",
        title: "📎 File Đính Kèm Đề Cương",
        content: "Nếu đã lập sẵn đề cương chi tiết (bản PDF hoặc DOCX), bạn có thể tải đính kèm lên đây để giảng viên tiện đọc và nhận xét.",
      },
      {
        target: "#proposal-realtime-assistant",
        title: "🤖 Trợ Lý Đối Chiếu Thời Gian Thực",
        content: "Một tính năng khoa học và độc đáo: Ngay khi bạn nhập mô tả hoặc tải file lên, hệ thống sẽ chạy đối chiếu nhanh để phát hiện trùng lặp đề tài và gợi ý danh sách giảng viên hướng dẫn có chuyên môn phù hợp nhất!",
      },
      {
        target: "#proposal-submit-btn",
        title: "🚀 Gửi Yêu Cầu Phê Duyệt",
        content: "Bấm nút này để tạo đề xuất đề tài tốt nghiệp. Giảng viên hướng dẫn sẽ nhận được thông báo xét duyệt ngay lập tức.",
      },
    ];
  }

  // 2. UPLOAD FILES PAGE (Student)
  if (isStudent && pathname.includes("/upload-files")) {
    return [
      {
        target: "#upload-tabs-wrapper",
        title: "📂 Phân Loại Tài Liệu",
        content: "Sử dụng Tab để phân loại: 'Tài liệu chung' dùng để chia sẻ file tài nguyên chung cho nhóm và GV, còn 'Bài nộp' dùng để nộp các báo cáo cột mốc chấm điểm.",
      },
      {
        target: "#upload-dropzones-grid",
        title: "📤 Khu Vực Tải File",
        content: "Kéo thả hoặc nhấp để chọn tải lên báo cáo thuyết minh (PDF/DOCX), slide trình chiếu (PPT) hoặc mã nguồn dự án (ZIP). Hệ thống hỗ trợ file lớn lên tới 50MB.",
      },
      {
        target: "#upload-submit-btn",
        title: "✔️ Lưu Tài Liệu",
        content: "Sau khi chọn file, nhấp nút này để chính thức lưu trữ file vào thư mục tài liệu chung của nhóm đồ án.",
      },
      {
        target: "#upload-deadlines-list",
        title: "📅 Theo Dõi Cột Mốc Học Phần",
        content: "Xem danh sách các cột mốc bắt buộc (M1 - M4). Hệ thống hiển thị rõ ràng ngày hết hạn và trạng thái bài nộp (Đã nộp, Nộp trễ, Chưa nộp).",
      },
      {
        target: "#upload-analysis-btn-first",
        title: "🔍 Phân Tích Học Thuật Báo Cáo",
        content: "Với mỗi báo cáo cột mốc đã nộp, nhấp vào đây để xem kết quả kiểm tra trùng lặp văn bản, dự đoán điểm số và xem các khuyến nghị sửa đổi.",
      },
    ];
  }

  // 3. SUBMISSION ANALYSIS PAGE (Student)
  if (isStudent && pathname.includes("/analysis/")) {
    return [
      {
        target: "#analysis-plagiarism-card",
        title: "🛡️ Bộ Đo Trùng Lặp (Plagiarism Meter)",
        content: "Hệ thống đối chiếu và hiển thị mức độ trùng lặp. Bạn có thể xem chi tiết các câu bị nghi ngờ sao chép cùng đường dẫn trực tiếp tới đề tài nguồn để chỉnh sửa cách diễn đạt.",
      },
      {
        target: "#analysis-score-card",
        title: "🏆 Ước Tính Điểm Số Đạt Được",
        content: "Dự đoán điểm số hệ 10 và tự động quy đổi sang GPA hệ 4 cùng Điểm chữ (A, B, C...) tương ứng theo quy chuẩn học thuật của nhà trường.",
      },
      {
        target: "#analysis-clo-breakdown",
        title: "📈 Đánh Giá Chuẩn Đầu Ra (CLO)",
        content: "Xem mức độ hoàn thành chuẩn đầu ra học phần đồ án theo thang 5 bậc kèm theo các diễn giải phân tích logic.",
      },
      {
        target: "#analysis-suggestions-card",
        title: "💡 Đề Xuất Cải Thiện Báo Cáo",
        content: "Tóm tắt các điểm mạnh đã đạt được và liệt kê chi tiết các thiếu sót cần bổ sung (định dạng, trích dẫn nguồn) để bạn tối ưu hóa điểm số đồ án.",
      },
    ];
  }

  // 4. TEACHER PENDING REQUESTS PAGE
  if (isTeacher && pathname.includes("/pending-requests")) {
    return [
      {
        target: "#main-content-container",
        title: "📥 Danh Sách Yêu Cầu Hướng Dẫn",
        content: "Nơi hiển thị các đề tài do sinh viên đăng ký đề xuất mong muốn bạn làm Giảng viên hướng dẫn (GVHD).",
      },
      {
        target: "#main-content-container",
        title: "📝 Phê Duyệt & Phản Hồi",
        content: "Bạn có thể đọc đề cương chi tiết của sinh viên và nhấp Approve để nhận hướng dẫn hoặc Reject kèm phản hồi góp ý để sinh viên chỉnh sửa lại.",
      },
    ];
  }

  // DEFAULT TOUR (DASHBOARD / HOME PAGE)
  return role === "Teacher" ? [
    {
      target: "#sidebar-container",
      title: "🧭 Menu Quản Lý (Sidebar)",
      content: "Thanh menu chính của giảng viên: truy cập trang chủ, xét duyệt yêu cầu hướng dẫn (Pending Requests), quản lý nhóm hướng dẫn (My Supervision) và chấm điểm phản biện.",
    },
    {
      target: "#navbar-help",
      title: "💡 Hướng Dẫn Nghiệp Vụ",
      content: "Trung tâm tra cứu nhanh quy trình học thuật, các câu hỏi thường gặp hoặc xem chi tiết sổ tay hướng dẫn chấm điểm & phản biện.",
    },
    {
      target: "#navbar-notifications",
      title: "🔔 Thông Báo Nghiệp Vụ",
      content: "Cảnh báo tự động khi sinh viên nộp báo cáo cột mốc, yêu cầu duyệt đề tài mới, hoặc thông tin phân công lịch hội đồng bảo vệ.",
    },
    {
      target: "#navbar-profile",
      title: "👤 Hồ Sơ Giảng Viên",
      content: "Cập nhật thông tin liên hệ cá nhân, cấu hình bảo mật tài khoản và đăng xuất ứng dụng.",
    },
    {
      target: "#main-content-container",
      title: "📊 Bảng Điều Khiển Học Thuật",
      content: "Trang chủ hiển thị biểu đồ phân tích bài nộp cột mốc, danh sách sinh viên hướng dẫn và các hạn nộp bài của khoa.",
    },
  ] : [
    {
      target: "#sidebar-container",
      title: "🧭 Menu Điều Hướng (Sidebar)",
      content: "Đây là thanh điều hướng chính. Bạn có thể chuyển nhanh giữa Dashboard, trang Đăng ký đề tài, tải lên báo cáo Cột mốc (Upload Files) và xem Lịch bảo vệ tốt nghiệp.",
    },
    {
      target: "#navbar-qr-scanner",
      title: "📷 Điểm Danh Nhanh bằng QR",
      content: "Chức năng dành riêng cho sinh viên: Bấm vào đây để mở camera và quét mã QR Code điểm danh nhanh trong phòng họp định kỳ với GV hướng dẫn.",
    },
    {
      target: "#navbar-help",
      title: "💡 Trung Tâm Trợ Giúp & Hướng Dẫn",
      content: "Xem nhanh quy trình 7 bước đồ án tốt nghiệp, giải đáp các thắc mắc (Q&A) phổ biến và truy cập sổ tay hướng dẫn chi tiết dành cho bạn.",
    },
    {
      target: "#navbar-notifications",
      title: "🔔 Chuông Thông Báo",
      content: "Nơi nhận các tin nhắn tự động quan trọng như: nhắc nhở hạn nộp báo cáo, lịch họp nhóm từ giảng viên hướng dẫn hoặc điểm số mới.",
    },
    {
      target: "#navbar-profile",
      title: "👤 Tài Khoản Cá Nhân",
      content: "Xem thông tin cá nhân của bạn, thay đổi cấu hình cài đặt hệ thống hoặc thực hiện đăng xuất an toàn.",
    },
    {
      target: "#main-content-container",
      title: "📊 Bảng Điều Khiển Trung Tâm",
      content: "Khu vực hiển thị biểu đồ tiến trình công việc, các cột mốc deadline và thông tin tổng quan của đề tài tốt nghiệp bạn đăng ký.",
    },
  ];
};

const isElementVisible = (element) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  
  // Check if element is offscreen horizontally (like sidebar container when closed on mobile)
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  
  // Check if element is offscreen vertically
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
  
  return true;
};

const OnboardingTour = ({ userRole, isOpen, onClose }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState(null);
  const resizeTimeoutRef = useRef(null);

  const steps = getStepsForPage(pathname, userRole);

  const updateCoordinates = () => {
    if (!isOpen || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const element = document.querySelector(step.target);

    if (isElementVisible(element)) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setCoords(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoordinates();
    }
  }, [currentStep, isOpen, pathname, userRole]);

  useEffect(() => {
    const handleResize = () => {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(updateCoordinates, 150);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      clearTimeout(resizeTimeoutRef.current);
    };
  }, [currentStep, isOpen, pathname]);

  // Reset steps counter when page changes
  useEffect(() => {
    setCurrentStep(0);
    setCoords(null);
  }, [pathname]);

  useEffect(() => {
    if (isOpen && coords === null) {
      const timer = setTimeout(() => {
        const step = steps[currentStep];
        const element = document.querySelector(step.target);
        const visible = isElementVisible(element);
        
        if (!visible) {
          if (currentStep < steps.length - 1) {
            setCurrentStep((prev) => prev + 1);
          } else {
            handleEndTour();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, coords, currentStep, pathname]);

  const handleEndTour = () => {
    setCurrentStep(0);
    setCoords(null);
    onClose();
  };

  if (!isOpen || steps.length === 0) return null;

  const activeStep = steps[currentStep];

  const getTooltipStyle = () => {
    if (!coords) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        position: "fixed",
      };
    }

    const margin = 16;
    const tooltipWidth = 320;
    const spaceBelow = window.innerHeight - (coords.top + coords.height);
    const spaceAbove = coords.top;
    const spaceRight = window.innerWidth - (coords.left + coords.width);

    let top = coords.top + coords.height + margin;
    let left = Math.max(margin, Math.min(coords.left, window.innerWidth - tooltipWidth - margin));
    let transform = "none";

    if (spaceBelow < 220 && spaceAbove > 220) {
      top = coords.top - 180 - margin;
    }

    if (activeStep.target === "#sidebar-container" && spaceRight > 350) {
      top = coords.top + 80;
      left = coords.left + coords.width + margin;
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform,
      position: "fixed",
    };
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] pointer-events-auto" />

      {coords && (
        <div
          className="fixed rounded-xl border-2 border-blue-500 bg-transparent transition-all duration-300 pointer-events-none z-[9999] shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]"
          style={{
            top: `${coords.top - 6}px`,
            left: `${coords.left - 6}px`,
            width: `${coords.width + 12}px`,
            height: `${coords.height + 12}px`,
          }}
        />
      )}

      <div
        className="z-[9999] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl pointer-events-auto transition-all duration-300"
        style={getTooltipStyle()}
      >
        <div className="flex items-start justify-between gap-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            {activeStep?.title}
          </h4>
          <button
            onClick={handleEndTour}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
          {activeStep?.content}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex gap-1">
            {Array.from({ length: steps.length }).map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? "bg-blue-500 w-4" : "bg-slate-200 w-1.5"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-0.5"
              >
                Tiếp theo
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleEndTour}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 text-xs rounded-xl flex items-center gap-0.5 shadow-sm transition-all"
              >
                Hoàn thành
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
