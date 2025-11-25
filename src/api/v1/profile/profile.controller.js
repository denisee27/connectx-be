export default {
    async getProfile(req, res, next) {
        try {
            const profileService = req.scope.resolve("profileService");

            const profile = await profileService.findProfileById('8dfcaf0d-7051-467f-8443-f2cd4594cb38');
            res.status(200).json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    },
    async updateProfile(req, res, next) {
        try {
            const { body } = req;
            const errors = await validate(updateProfileSchema, body);
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            res.status(200).json({ success: true, message: 'ok' });
        } catch (error) {
            next(error);
        }
    }

}