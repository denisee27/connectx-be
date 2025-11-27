import { logger } from "../../../infra/logger/index.js";
import { parseExpiryToMs } from "../../../utils/index.js";

export default {
  async create(req, res, next) {
    try {
      const clientContext = req.clientContext;
      // const id = req.user.userId;
      const conversationService = req.scope.resolve("conversationService");
      const conversations = await conversationService.createConversation(clientContext, 'a001ce6f-8893-474f-b1d0-9e2647193f5e');
      res.status(200).json({
        success: true,
        message: "Conversation Session Created Successfully",
        data: conversations,
      });
    } catch (exception) {
      next(exception);
    }
  },


  async chatting(req, res, next) {
    try {
      const clientContext = req.clientContext;
      const userId = req.user.userId;
      const sessionId = req.params.id;
      const message = req.validated?.body?.message ?? req.body.message;

      const conversationService = req.scope.resolve("conversationService");
      const upstreamStream = await conversationService.streamConversation(
        clientContext,
        userId,
        sessionId,
        message
      );

      return res.status(200).json({
        success: true,
        data: upstreamStream,
      });
    } catch (exception) {
      next(exception);
    }
  },

  async getConversationDetails(req, res, next) {
    try {
      const user = req.user.userId;
      const session = req.params.id;
      const conversationService = req.scope.resolve("conversationService");

      const getAllConversationDetail = await conversationService.getAllConversationDetail(
        user,
        session
      );
      return res.status(200).json({
        success: true,
        data: getAllConversationDetail,
      });
    } catch (exception) {
      next(exception);
    }
  },

  async deleteConversation(req, res, next) {
    try {
      const clientContext = req.clientContext;
      const userId = req.user.userId;
      const sessionId = req.params.id;

      const conversationService = req.scope.resolve("conversationService");
      await conversationService.deleteConversation(clientContext, userId, sessionId);

      return res.status(200).json({
        success: true,
        message: "Conversation deleted successfully",
      });
    } catch (exception) {
      next(exception);
    }
  },
};
