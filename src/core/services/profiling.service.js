import axios from "axios";
import { ValidationError, NotFoundError } from "../errors/httpErrors.js"; import { email } from "zod";

export function makeProfilingService({ questionRepository, preferenceRepository, userRepository, prisma, logger, env }) {
    return {
        async createTemporaryUser(body) {
            const {
                profile,
                preferences,
                answers,
                meetUpPreference,
            } = body;

            if (!profile || !preferences || !answers || !meetUpPreference) {
                throw new ValidationError("Missing required fields");
            }

            logger.info("Creating temporary user with data: %o", profile);

            const city = await prisma.city.findFirst({
                where: { name: { equals: profile.city, mode: "insensitive" } },
                include: { country: true },
            });

            if (!city) {
                throw new NotFoundError(`City '${profile.city}' not found`);
            }

            const role = await prisma.role.findFirst({
                where: { name: "User" },
            });

            if (!role) {
                throw new NotFoundError("Default 'USER' role not found.");
            }

            const newUser = await userRepository.create({
                name: profile.name,
                email: profile.email,
                gender: profile.gender,
                occupation: profile.occupation,
                phoneNumber: profile.phoneNumber,
                bornDate: profile.bornDate,
                cityId: city.id,
                countryId: city.country.id,
                roleId: role.id,
            });

            const tokenPayload = {
                userId: newUser.id,
                email: newUser.email,
                role: role.name
            };

            // Sign Token
            const accessToken = jwt.sign(
                tokenPayload,
                env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const createdPreferences = await Promise.all(
                preferences.map((preference) =>
                    preferenceRepository.create({
                        userId: newUser.id,
                        name: preference,
                    })
                )
            );

            logger.info("Calling matchmaking API");
            const response = await axios.post(env.AI_AGENT_URL + "/user/generate-embedding",
                {
                    "user_id": newUser.id,
                    "preferences": preferences,
                    "personalities": answers,
                    "meetup_preference": meetUpPreference,
                    "city": city.name,
                },
                {
                    headers: {
                        "x-api-key": env.AI_TOKEN,
                        "Content-Type": "application/json" // Opsional tapi good practice
                    }
                });

            const roomIds = response.matches;
            if (!roomIds || roomIds.length === 0) {
                logger.warn("Matchmaking API returned no room IDs");
                return { user: newUser, preferences: createdPreferences, rooms: [] };
            }

            const rooms = await prisma.room.findMany({
                where: {
                    id: { in: roomIds.room_id },
                },
            });

            logger.info("Operation successful");
            return { accessToken, rooms };
        },

        async getQuestions() {
            const allQuestions = await questionRepository.findAll();
            for (let i = allQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
            }
            const questions = allQuestions.slice(0, 50);

            const response = await axios.post(env.AI_AGENT_URL + "/mbti/questions", {
                mbti_questions: questions,
                headers: {
                    "x-api-key": env.AI_TOKEN,
                }
            });

            return response.data;
        },

        async updateProfile(userId, data) {
            const user = await userRepository.update(userId, data);
            if (!user) {
                throw new NotFoundError("User not found");
            }
            return user;
        },

        async getProfile(userId) {
            const user = await userRepository.findById(userId, {
                include: {
                    country: true,
                    city: true,
                },
            });
            if (!user) {
                throw new NotFoundError("User not found");
            }
            return user;
        },
    };
}