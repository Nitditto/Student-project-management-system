import { SupervisorRequest } from "../models/supervisorRequest.js";

export const createRequest = async (requestData) => {
  const existingRequest = await SupervisorRequest.findOne({
    project: requestData.project || null,
    supervisor: requestData.supervisor,
    status: "pending",
  });
  if (existingRequest) {
    throw new Error(
      "You have already sent a request to this supervisor. Please wait for their response.",
    );
  }
  const request = await SupervisorRequest.create(requestData);
  return request.save();
};

export const getAllRequest = async (filters) => {
  const requests = await SupervisorRequest.find(filters)
    .populate("student", "name email")
    .populate("supervisor", "name email")
    .populate({
      path: "project",
      select: "title groupName members projectMode student supervisor status",
      populate: {
        path: "student",
        select: "name email"
      }
    })
    .sort({ createdAt: -1 });
  const total = await SupervisorRequest.countDocuments(filters);

  return { requests, total };
};

export const acceptRequest = async (requestId, supervisorId) => {
  const request = await SupervisorRequest.findById(requestId)
    .populate("student", "name email supervisor project")
    .populate("supervisor", "name email assignedStudents maxStudent")
    .populate({
      path: "project",
      select: "student members supervisor status archiveLocked",
      populate: {
        path: "student",
        select: "name email supervisor project"
      }
    });
  if (!request) {
    throw new Error("Request not found");
  }
  if (request.supervisor._id.toString() !== supervisorId.toString()) {
    throw new Error("Not authorized to accept this request");
  }
  if (request.status !== "pending") {
    throw new Error("Request has already been processed");
  }

  request.status = "approved";
  await request.save();

  // Automatically cancel other pending requests for the same project
  const projectId = request.project?._id || request.project;
  if (projectId) {
    await SupervisorRequest.updateMany(
      {
        project: projectId,
        _id: { $ne: request._id },
        status: "pending"
      },
      {
        $set: { status: "cancelled" }
      }
    );
  }

  return request;
};

export const rejectRequest = async (requestId, supervisorId) => {
  const request = await SupervisorRequest.findById(requestId)
    .populate("student", "name email")
    .populate("supervisor", "name email")
    .populate({
      path: "project",
      populate: {
        path: "student",
        select: "name email"
      }
    });
  if (!request) {
    throw new Error("Request not found");
  }
  if (request.supervisor._id.toString() !== supervisorId.toString()) {
    throw new Error("Not authorized to reject this request");
  }
  if (request.status !== "pending") {
    throw new Error("Request has already been processed");
  }
  request.status = "rejected";
  await request.save();

  return request;
};
