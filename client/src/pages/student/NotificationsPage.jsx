import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../../store/slices/notificationSlice";
import {
  MessageCircle,
  Clock5,
  BadgeCheck,
  Calendar,
  Settings,
  User,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  BellOff,
} from "lucide-react";
const NotificationsPage = () => {
  const dispatch = useDispatch();

  const notifications = useSelector((state) => state.notification.list);
  const unreadCount = useSelector((state) => state.notification.unreadCount);
  const highPriorityMessages = useSelector(
    (state) => state.notification.highPriorityMessages,
  );
  const thisWeekNotifications = useSelector(
    (state) => state.notification.thisWeekNotifications,
  );

  useEffect(() => {
    dispatch(getNotifications());
  }, [dispatch]);

  const markAsReadHandler = (id) => {
    dispatch(markAsRead(id));
  };
  const markAllAsReadHandler = () => {
    dispatch(markAllAsRead());
  };
  const deleteNotificationHandler = (id) => {
    dispatch(deleteNotification(id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "feedback":
        return <MessageCircle className="w-6 h-6 text-blue-500" />;
      case "deadline":
        return <Clock5 className="w-6 h-6 text-red-500" />;
      case "approval":
        return <BadgeCheck className="w-6 h-6 text-green-500" />;
      case "meeting":
        return <Calendar className="w-6 h-6 text-purple-500" />;
      case "system":
        return <Settings className="w-6 h-6 text-gray-500" />;
      default:
        return (
          <div className="relative w-6 h-6 text-slate-500 flex items-center justify-center">
            <User className="w-5 h-5 absolute" />
            <ChevronDown className="w-4 h-4 absolute top-4" />
          </div>
        );
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "border-1-red-500";
      case "medium":
        return "border-1-yellow-500";
      case "low":
        return "border-1-green-500";
      default:
        return "border-1-slate-300";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else return date.toLocaleDateString();
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
    <>
      <div className="space-y-6">
        <div className="card">
          {/* Card header */}
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="">
                <h1 className="card-title">Notifications</h1>
                <p className="card-subtitle">
                  Stay updated with your project progress and deadlines
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  className="btn-outline btn-small"
                  onClick={markAllAsReadHandler}
                >
                  Mark all as read ({unreadCount})
                </button>
              )}
            </div>
          </div>

          {/* Notifications stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
              <div key={index} className={`card ${stat.bg} p-4 rounded-lg`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                    <stat.Icon className={`w-5 h-5 ${stat.textColor}`} />
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${stat.titleColor}`}>
                      {stat.title}
                    </p>
                    <p className={`text-sm font-medium ${stat.valueColor}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notification list */}
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`flex relative gap-4 rounded-xl border p-4 transition-all ${getPriorityColor(notification.priority)} ${!notification.isRead ? "bg-blue-50 border-blue-200" : "bg-white hover:bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3
                        className={`font-medium ${notification.isRead ? "text-slate-900" : "text-slate-700"}`}
                      >
                        {notification.title}{" "}
                        {!notification.isRead && (
                          <span className="ml-2 w-2 h-2 bg-blue-50 rounded-full inline-block" />
                        )}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-500">
                          {formatDate(notification.createdAt)}
                        </span>
                        <span
                          className={`badge capitalize ${notification.priority === "high" ? "badge-rejected" : notification.priority === "medium" ? "badge-pending" : "badge-approved"}`}
                        >
                          {notification.priority}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`badge capitalize ${notification.type === "feedback" ? "bg-blue-100 text-blue-800" : notification.type === "deadline" ? "bg-red-100 text-red-800" : notification.type === "approval" ? "bg-green-100 text-green-800" : notification.type === "meeting" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}
                      >
                        {notification.type}
                      </span>
                      <div className="flex items-center space-x-2">
                        {!notification.isRead && (
                          <button
                            className="text-sm text-blue-600 hover:text-blue-500"
                            onClick={() => markAsReadHandler(notification._id)}
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() =>
                            deleteNotificationHandler(notification._id)
                          }
                          className="text-sm text-red-600 hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-3 text-slate-600">
                <BellOff className="w-12 h-12" />
              </div>
              <p className="text-slate-500">No notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;
