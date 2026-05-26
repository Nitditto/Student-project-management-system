import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BadgeCheck,
  BellOff,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Clock5,
  Eye,
  MessageCircle,
  Settings,
  Trash2,
  User,
} from "lucide-react";
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

const COPY_BY_ROLE = {
  Student: {
    title: "Notifications",
    subtitle: "Stay updated with your project progress and deadlines",
    empty: "No notifications yet.",
  },
  Teacher: {
    title: "Notifications",
    subtitle: "Stay updated with student progress, defense workflow, and review tasks",
    empty: "No notifications yet.",
  },
};

const ICONS = {
  feedback: MessageCircle,
  deadline: Clock5,
  approval: BadgeCheck,
  meeting: Calendar,
  system: Settings,
  attendance: Calendar,
  leave: Calendar,
  defense: BadgeCheck,
  warning: AlertCircle,
  general: User,
};

const getNotificationIcon = (type) => {
  const Icon = ICONS[type];

  if (Icon) {
    const colorMap = {
      feedback: "text-blue-500",
      deadline: "text-red-500",
      approval: "text-green-500",
      meeting: "text-purple-500",
      system: "text-gray-500",
      attendance: "text-cyan-500",
      leave: "text-amber-500",
      defense: "text-indigo-500",
      warning: "text-orange-500",
      general: "text-slate-500",
    };

    return <Icon className={`h-6 w-6 ${colorMap[type] || "text-slate-500"}`} />;
  }

  return (
    <div className="relative flex h-6 w-6 items-center justify-center text-slate-500">
      <User className="absolute h-5 w-5" />
      <ChevronDown className="absolute top-4 h-4 w-4" />
    </div>
  );
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "high":
      return "border-red-200";
    case "medium":
      return "border-yellow-200";
    case "low":
      return "border-green-200";
    default:
      return "border-slate-200";
  }
};

const getTypeBadgeClass = (type) => {
  switch (type) {
    case "feedback":
      return "bg-blue-100 text-blue-800";
    case "deadline":
      return "bg-red-100 text-red-800";
    case "approval":
      return "bg-green-100 text-green-800";
    case "meeting":
      return "bg-purple-100 text-purple-800";
    case "attendance":
      return "bg-cyan-100 text-cyan-800";
    case "leave":
      return "bg-amber-100 text-amber-800";
    case "defense":
      return "bg-indigo-100 text-indigo-800";
    case "warning":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityBadgeClass = (priority) => {
  if (priority === "high") return "badge-rejected";
  if (priority === "medium") return "badge-pending";
  return "badge-approved";
};

const NotificationCenterPage = ({ role = "Student" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState(null);

  const notifications = useSelector((state) => state.notification.list);
  const unreadCount = useSelector((state) => state.notification.unreadCount);
  const highPriorityMessages = useSelector(
    (state) => state.notification.highPriorityMessages,
  );
  const thisWeekNotifications = useSelector(
    (state) => state.notification.thisWeekNotifications,
  );

  const copy = COPY_BY_ROLE[role] || COPY_BY_ROLE.Student;

  useEffect(() => {
    dispatch(getNotifications());
  }, [dispatch]);

  const presentedNotifications = useMemo(
    () => notifications.map(buildNotificationPresentation),
    [notifications],
  );

  const markAsReadHandler = (id) => {
    dispatch(markAsRead(id));
  };

  const markAllAsReadHandler = () => {
    dispatch(markAllAsRead());
  };

  const deleteNotificationHandler = (id) => {
    dispatch(deleteNotification(id));
  };

  const openDetail = (notification) => {
    if (!notification.isRead) {
      dispatch(markAsRead(notification._id));
    }
    setSelectedNotification(notification);
  };

  const openDestination = (notification) => {
    if (!notification) return;
    if (!notification.isRead) {
      dispatch(markAsRead(notification._id));
    }
    setSelectedNotification(null);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const stats = [
    {
      title: "Total",
      value: notifications.length,
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      textColor: "text-blue-600",
      titleColor: "text-blue-800",
      valueColor: "text-blue-900",
      Icon: User,
    },
    {
      title: "Unread",
      value: unreadCount,
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      textColor: "text-red-600",
      titleColor: "text-red-800",
      valueColor: "text-red-900",
      Icon: AlertCircle,
    },
    {
      title: "High Priority",
      value: highPriorityMessages,
      bg: "bg-yellow-50",
      iconBg: "bg-yellow-100",
      textColor: "text-yellow-600",
      titleColor: "text-yellow-800",
      valueColor: "text-yellow-900",
      Icon: Clock,
    },
    {
      title: "This Week",
      value: thisWeekNotifications,
      bg: "bg-green-50",
      iconBg: "bg-green-100",
      textColor: "text-green-600",
      titleColor: "text-green-800",
      valueColor: "text-green-900",
      Icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="card-title">{copy.title}</h1>
              <p className="card-subtitle">{copy.subtitle}</p>
            </div>
            {unreadCount > 0 && (
              <button className="btn-outline btn-small shrink-0" onClick={markAllAsReadHandler}>
                Mark all as read ({unreadCount})
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.title} className={`card rounded-lg p-4 ${stat.bg}`}>
              <div className="flex items-center">
                <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                  <stat.Icon className={`h-5 w-5 ${stat.textColor}`} />
                </div>
                <div className="ml-3 min-w-0">
                  <p className={`text-sm font-medium ${stat.titleColor}`}>{stat.title}</p>
                  <p className={`text-sm font-medium ${stat.valueColor}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {presentedNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`relative rounded-xl border p-4 transition-all ${getPriorityColor(notification.priority)} ${!notification.isRead ? "border-blue-200 bg-blue-50" : "bg-white hover:bg-slate-50 border-slate-200"}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div
                  className="flex min-w-0 flex-1 cursor-pointer gap-4"
                  onClick={() => openDetail(notification)}
                >
                  <div className="mt-1 shrink-0">{getNotificationIcon(notification.type)}</div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <h3
                          className={`font-medium ${notification.isRead ? "text-slate-900" : "text-slate-700"}`}
                        >
                          {notification.title}{" "}
                          {!notification.isRead && (
                            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span>{formatNotificationRelativeTime(notification.createdAt)}</span>
                        <span className={`badge capitalize ${getPriorityBadgeClass(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                    </div>

                    <p className="mb-3 break-words text-sm leading-relaxed text-slate-600">
                      {notification.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge capitalize ${getTypeBadgeClass(notification.type)}`}>
                        {notification.type}
                      </span>
                      {notification.destination && (
                        <span className="badge bg-slate-100 text-slate-700">
                          {notification.destination.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pl-4">
                  <button className="btn-outline btn-small" onClick={() => openDetail(notification)}>
                    Detail
                  </button>
                  {/* {notification.link && (
                    <button
                      className="btn-primary btn-small"
                      onClick={() => openDestination(notification)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Open
                    </button>
                  )} */}
                  {!notification.isRead && (
                    <button
                      className="text-sm text-blue-600 hover:text-blue-500"
                      onClick={() => markAsReadHandler(notification._id)}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotificationHandler(notification._id)}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    <Trash2 className="mr-1 inline h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {presentedNotifications.length === 0 && (
          <div className="py-8 text-center">
            <div className="mb-3 flex items-center justify-center text-slate-600">
              <BellOff className="h-12 w-12" />
            </div>
            <p className="text-slate-500">{copy.empty}</p>
          </div>
        )}
      </div>

      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onOpenDestination={() => openDestination(selectedNotification)}
      />
    </div>
  );
};

export default NotificationCenterPage;
