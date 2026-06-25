import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentDeadlines } from "../../store/slices/deadlineSlice";
import DeadlineCard from "../../components/deadlines/DeadlineCard";
import { CalendarClock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

const DeadlinesPage = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { deadlines, loading } = useSelector((state) => state.deadline);
  
  const [activeTab, setActiveTab] = useState("list"); // 'list', 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    dispatch(fetchStudentDeadlines());
  }, [dispatch]);

  const total = deadlines.length;
  const completed = deadlines.filter(d => d.submissionStatus === "SUBMITTED").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isAtRisk = percent < 40 && total > 0;

  // Calendar Helpers
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay(); 
    // Shift Sunday (0) to 7, so Monday is 1, Tuesday is 2...
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    
    const days = [];
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i + 1),
        isCurrentMonth: false
      });
    }
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const totalSlots = days.length <= 35 ? 35 : 42;
    const nextDaysNeeded = totalSlots - days.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getDayDeadlines = (date) => {
    return deadlines.filter(d => {
      if (!d.endDate) return false;
      const dDate = new Date(d.endDate);
      return dDate.getDate() === date.getDate() &&
             dDate.getMonth() === date.getMonth() &&
             dDate.getFullYear() === date.getFullYear();
    });
  };

  const getDotColorClass = (dayDeadlines) => {
    if (dayDeadlines.length === 0) return "";
    const allSubmitted = dayDeadlines.every(d => d.submissionStatus === "SUBMITTED");
    if (allSubmitted) return "bg-emerald-500";
    const anyOverdue = dayDeadlines.some(d => d.isOverdue || d.submissionStatus === "MISSED");
    if (anyOverdue) return "bg-red-500";
    return "bg-orange-500";
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const displayedDeadlines = selectedDate
    ? deadlines.filter(d => {
        if (!d.endDate) return false;
        const dDate = new Date(d.endDate);
        return dDate.getDate() === selectedDate.getDate() &&
               dDate.getMonth() === selectedDate.getMonth() &&
               dDate.getFullYear() === selectedDate.getFullYear();
      })
    : deadlines;

  const calendarDays = getCalendarDays();
  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex flex-col md:flex-row items-start justify-between md:items-center">
          <div>
            <h1 className="card-title flex items-center">
              <CalendarClock className="w-6 h-6 mr-2 text-blue-600" />
              {t("student.deadlines.headerTitle")}
            </h1>
            <p className="card-subtitle">
              {t("student.deadlines.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "list"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {t("student.deadlines.listTab")}
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "calendar"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {t("student.deadlines.calendarTab")}
        </button>
      </div>

      {/* TAB CONTENT: LIST VIEW */}
      {activeTab === "list" && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="card border-t-4 border-t-blue-500">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t("student.deadlines.progressTitle")}</h3>
            
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">
                {t("student.deadlines.completedOf", { completed, total })}
              </span>
              <span className={`text-sm font-bold ${isAtRisk ? 'text-red-600' : 'text-blue-600'}`}>
                {percent}%
              </span>
            </div>
            
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${isAtRisk ? 'bg-red-500' : 'bg-blue-600'}`}
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            
            {isAtRisk ? (
              <div className="flex items-start text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 mt-4">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>{t("student.deadlines.atRiskWarning")}</p>
              </div>
            ) : total > 0 && percent === 100 ? (
              <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 mt-4">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>{t("student.deadlines.completedSuccess")}</p>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card h-64 animate-pulse flex flex-col">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6 mb-6"></div>
                  <div className="mt-auto h-10 bg-slate-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : deadlines.length === 0 ? (
            <div className="card text-center py-12">
              <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">{t("student.deadlines.noDeadlinesFound")}</h3>
              <p className="text-slate-500">{t("student.deadlines.noDeadlinesDesc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
              {deadlines.map((dl) => (
                <DeadlineCard key={dl._id} deadline={dl} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CALENDAR VIEW */}
      {activeTab === "calendar" && (
        <div className="w-full space-y-6">
          {/* Calendar Card */}
          <div className="card p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {t("student.deadlines.calendarTab")}
              </h3>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 shadow-sm">
                <button 
                  onClick={handlePrevMonth} 
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 hover:text-blue-600 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center capitalize">
                  {currentMonth.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", { month: "long", year: "numeric" })}
                </span>
                <button 
                  onClick={handleNextMonth} 
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 hover:text-blue-600 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div>{t("student.deadlines.mon")}</div>
              <div>{t("student.deadlines.tue")}</div>
              <div>{t("student.deadlines.wed")}</div>
              <div>{t("student.deadlines.thu")}</div>
              <div>{t("student.deadlines.fri")}</div>
              <div>{t("student.deadlines.sat")}</div>
              <div>{t("student.deadlines.sun")}</div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((dayObj, idx) => {
                const dayDeadlines = getDayDeadlines(dayObj.date);
                const hasDeadlines = dayDeadlines.length > 0;
                const isSelected = selectedDate && 
                                   dayObj.date.getDate() === selectedDate.getDate() &&
                                   dayObj.date.getMonth() === selectedDate.getMonth() &&
                                   dayObj.date.getFullYear() === selectedDate.getFullYear();
                const isToday = dayObj.date.getDate() === today.getDate() &&
                                dayObj.date.getMonth() === today.getMonth() &&
                                dayObj.date.getFullYear() === today.getFullYear();
                
                return (
                  <div 
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDate(null);
                      } else {
                        setSelectedDate(dayObj.date);
                      }
                    }}
                    className={`min-h-[120px] flex flex-col justify-between rounded-xl cursor-pointer hover:bg-blue-50/30 hover:border-blue-300 transition-all duration-150 p-2 border relative select-none ${
                      dayObj.isCurrentMonth ? "text-slate-800 bg-white" : "text-slate-300 bg-slate-50/20"
                    } ${
                      isSelected 
                        ? "bg-blue-50/70 border-blue-400 text-blue-700 font-semibold shadow-sm" 
                        : isToday 
                          ? "bg-slate-100 border-slate-350 text-slate-900 shadow-sm" 
                          : "border-slate-100"
                    }`}
                  >
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md self-start ${
                      isToday ? "bg-blue-600 text-white font-bold" : "text-slate-500 font-semibold bg-slate-50"
                    }`}>
                      {dayObj.date.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit" })}
                    </span>

                    {hasDeadlines && (
                      <div className="flex flex-col gap-1 w-full mt-2 overflow-hidden">
                        {dayDeadlines.slice(0, 3).map((dl) => {
                          let badgeBg = "bg-blue-50 text-blue-800 border-blue-200";
                          if (dl.submissionStatus === "SUBMITTED") {
                            badgeBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
                          } else if (dl.isOverdue || dl.submissionStatus === "MISSED") {
                            badgeBg = "bg-rose-50 text-rose-800 border-rose-200";
                          }
                          const dueTime = dl.endDate ? new Date(dl.endDate).toLocaleTimeString(i18n.language === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" }) : "";
                          const badgeText = dueTime ? `${dueTime} - ${dl.title}` : dl.title;
                          return (
                            <div 
                              key={dl._id} 
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border truncate text-left w-full ${badgeBg}`}
                              title={`${dl.title} (${t("student.upload.due", { date: dueTime })})`}
                            >
                              {badgeText}
                            </div>
                          );
                        })}
                        {dayDeadlines.length > 3 && (
                          <div className="text-[9px] text-slate-400 font-bold pl-1.5">
                            {t("student.deadlines.otherDeadlines", { count: dayDeadlines.length - 3 })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details Panel */}
          {selectedDate && (
            <div className="card p-6 space-y-4 border-l-4 border-l-blue-500 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-blue-500" />
                  {t("student.deadlines.dateTitle", { date: selectedDate.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US"), count: displayedDeadlines.length })}
                </h4>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                >
                  {t("student.deadlines.closeFilter")}
                </button>
              </div>

              {displayedDeadlines.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  {t("student.deadlines.noDeadlinesOnDate")}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayedDeadlines.map((dl) => (
                    <DeadlineCard key={dl._id} deadline={dl} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeadlinesPage;
