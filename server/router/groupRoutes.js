import express from "express";
import {
  createGroup,
  inviteMember,
  acceptInvitation,
  rejectInvitation,
  removeMember,
  getMyGroup,
  getMyInvitations,
  submitGroup,
} from "../controllers/groupController.js";
import { isAuthenticated, isAuthorized } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create-group",
  isAuthenticated,
  isAuthorized("Student"),
  createGroup
);

router.get(
  "/my-group",
  isAuthenticated,
  isAuthorized("Student"),
  getMyGroup
);

router.get(
  "/my-invitations",
  isAuthenticated,
  isAuthorized("Student"),
  getMyInvitations
);

router.post(
  "/invite-member/:groupId",
  isAuthenticated,
  isAuthorized("Student"),
  inviteMember
);

router.put(
  "/accept-invitation/:invitationId",
  isAuthenticated,
  isAuthorized("Student"),
  acceptInvitation
);

router.put(
  "/reject-invitation/:invitationId",
  isAuthenticated,
  isAuthorized("Student"),
  rejectInvitation
);

router.put(
  "/submit-group/:groupId",
  isAuthenticated,
  isAuthorized("Student"),
  submitGroup
);

router.delete(
  "/remove-member/:groupId/:studentId",
  isAuthenticated,
  isAuthorized("Student"),
  removeMember
);

export default router;