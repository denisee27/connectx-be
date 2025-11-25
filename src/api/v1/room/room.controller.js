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
    async getRooms(req, res, next) {
        try {
            const roomService = req.scope.resolve("roomService");
            const { page = 1, limit = 10 } = req.query;
            const rooms = await roomService.getRooms(page, limit);
            res.status(200).json(rooms);
        } catch (error) {
            next(error);
        }
    },
}