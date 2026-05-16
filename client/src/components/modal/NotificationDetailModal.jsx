import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  Clock3,
  FileCheck2,
  MessageCircle,
  Settings,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import {
  PRIORITY_META,
  formatNotificationAbsoluteTime,
  formatNotificationRelativeTime,
} from "../../lib/notifications";

const ICONS = {
  message: MessageCircle,
  deadline: Clock3,
  approval: BadgeCheck,
  meeting: Calendar,
  attendance: Calendar,
  leave: FileCheck2,
  defense: ShieldAlert,
  warning: AlertCircle,
  system: Settings,
  general: User,
};

const NotificationDetailModal = ({
  notification,
  onClose,
  onOpenDestination,
}) => {
  if (!notification) return null;

  const priorityMeta =
    PRIORITY_META[notification.priority] || PRIORITY_META.low;
  const Icon = ICONS[notification.typeMeta?.iconKey] || User;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div className="flex items-start gap-3 min-w-0">
            <Icon className="h-5 w-5 mt-1 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h2 className="text-xl font-semibold text-gray-900 truncate">
                  {notification.title}
                </h2>
                <span className="text-xs font-medium text-gray-400">
                  {notification.typeMeta?.label || "General"} •{" "}
                  {priorityMeta.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {formatNotificationRelativeTime(notification.createdAt)} —{" "}
                {formatNotificationAbsoluteTime(notification.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm">
          {/* Summary & Message */}
          <div className="space-y-3">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed pt-2 border-t border-gray-50">
              {notification.message}
            </p>
          </div>

          {/* Structured Details */}
          {notification.details?.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
                Details
              </h3>
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {notification.details.map((detail) => (
                  <div
                    key={`${notification._id}-${detail.label}`}
                    className="flex justify-between border-b border-gray-50 py-1.5"
                  >
                    <span className="text-gray-500">{detail.label}</span>
                    <span className="font-medium text-gray-900">
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Meta */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>
              Status:{" "}
              <span className="font-medium text-gray-700">
                {notification.isRead ? "Read" : "Unread"}
              </span>
            </span>
          </div>

          {/* Action Destination */}
          {notification.destination && (
            <div className="mt-2 p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {notification.destination.label}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {notification.destination.description}
                </p>
              </div>
              <button
                onClick={onOpenDestination}
                className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
              >
                {notification.destination.action} &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
