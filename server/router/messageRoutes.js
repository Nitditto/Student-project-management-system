import express from "express";
import { getChatHistory, saveMessage, getChatPartners, unsendMessage, deleteMessage, reactMessage } from "../controllers/messageController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/partners", isAuthenticated, getChatPartners);
router.get("/:user1Id/:user2Id", isAuthenticated, getChatHistory);
router.post("/", isAuthenticated, saveMessage);
router.post("/react/:messageId", isAuthenticated, reactMessage);
router.delete("/unsend/:messageId", isAuthenticated, unsendMessage);
router.delete("/delete/:messageId", isAuthenticated, deleteMessage);

export default router;
