export default {
    async getUpcoming(req, res, next) {
        try {
            const scheduleService = req.scope.resolve('scheduleService');
            const upcoming = await scheduleService.getUpcomingSchedules('5ccd8a7b-e20d-456c-8bad-41d2a6660b1b');
            res.status(200).json({ success: true, data: upcoming });
        } catch (error) {
            next(error);
        }
    },
    async getPast(req, res, next) {
        try {
            const scheduleService = req.scope.resolve('scheduleService');
            const past = await scheduleService.getPastSchedules('5ccd8a7b-e20d-456c-8bad-41d2a6660b1b');
            res.status(200).json({ success: true, data: past });
        } catch (error) {
            next(error);
        }
    },
}