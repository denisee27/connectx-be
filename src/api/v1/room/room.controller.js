export default {
    async getPopular(req, res, next) {
        try {
            const roomService = req.scope.resolve("roomService");
            const rooms = await roomService.getPopular();
            res.status(200).json(rooms);
        } catch (error) {
            next(error);
        }
    },
    async getHighlights(req, res, next) {
        try {
            const roomService = req.scope.resolve("roomService");
            const rooms = await roomService.getHighlights();
            res.status(200).json(rooms);
        } catch (error) {
            next(error);
        }
    },
    async getRoomBySlug(req, res, next) {
        try {
            const roomService = req.scope.resolve("roomService");
            const { slug } = req.params;
            const room = await roomService.getRoomBySlug(slug);
            res.status(200).json(room);
        } catch (error) {
            next(error);
        }
    },
    // Controller
    async getRooms(req, res, next) {
        try {
            const roomService = req.scope.resolve("roomService");
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || "";
            const categoryId = req.query.categoryId;
            const type = req.query.type;
            const rooms = await roomService.getRooms(page, limit);
            res.status(200).json(rooms);
        } catch (error) {
            next(error);
        }
    },
}