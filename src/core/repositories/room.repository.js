import { getPageData } from "../utils/pagination.js";

/**
 * @typedef {import('@prisma/client').PrismaClient} PrismaClient
 * @typedef {import('@prisma/client').Room} Room
 * @typedef {import('../utils/pagination.js').PageData} PageData
 * @typedef {import('../utils/pagination.js').Pagination} Pagination
 */


export const safeRoomSelect = {
    id: true,
    slug: true,
    categoryId: true,
    cityId: true,
    city: true,
    category: true,
    regionId: true,
    type: true,
    title: true,
    description: true,
    datetime: true,
    address: true,
    gmaps: true,
    maxParticipant: true,
    createdById: true,
};

/**
 * @param {PrismaClient} prisma
 */
export function makeRoomRepository({ prisma }) {
    return {
        /**
         * @param {string} id
         * @returns {Promise<Room | null>}
         */
        findById(id) {
            return prisma.room.findUnique({
                where: { id },
                select: safeRoomSelect,
            });
        },

        /**
         * @returns {Promise<Room[]>}
         */
        getHighlights() {
            return prisma.room.findMany({
                take: 6,
                where: {
                    datetime: {
                        gte: new Date(),
                    },
                },
                orderBy: {
                    participants: {
                        _count: 'desc',
                    },
                },
                select: safeRoomSelect,
            });
        },

        /**
         * @param {Pagination} { page, limit, search, categoryId, type }
         * @returns {Promise<PageData<Room>>}
         */
        getPopular() {
            return prisma.room.findMany({
                take: 8,
                orderBy: {
                    participants: {
                        _count: 'desc',
                    },
                },
                // where: {
                //     cityId: {
                //         // contains: userId,
                //         mode: 'insensitive',
                //     },
                // },
                select: safeRoomSelect,
            });
        },

        /**
         * @param {string} slug
         * @returns {Promise<Room | null>}
         */
        findBySlug(slug) {
            return prisma.room.findUnique({
                where: { slug },
                select: safeRoomSelect,
            });
        },

        /**
         * @param {Pagination} { page, limit, search, categoryId, type }
         * @returns {Promise<PageData<Room>>}
         */
        async findMany({ page, limit, search, categoryId, type }) {
            const where = {
                title: {
                    contains: search,
                    mode: 'insensitive',
                },
                categoryId,
                type,
            };

            const [rooms, total] = await Promise.all([
                prisma.room.findMany({
                    where,
                    select: safeRoomSelect,
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                prisma.room.count({ where }),
            ]);

            return getPageData(rooms, total, page, limit);
        },

        /**
         * @param {string} id
         * @returns {Promise<Room>}
         */
        create(data) {
            return prisma.room.create({
                data,
                select: safeRoomSelect,
            });
        },

        /**
         * @param {string} id
         * @returns {Promise<Room>}
         */
        update(id, data) {
            return prisma.room.update({
                where: { id },
                data,
                select: safeRoomSelect,
            });
        },

        /**
         * @param {string} id
         * @returns {Promise<Room>}
         */
        delete(id) {
            return prisma.room.delete({
                where: { id },
                select: safeRoomSelect,
            });
        },

        findUpcoming(userId) {
            return prisma.room.findMany({
                where: {
                    participants: {
                        some: {
                            userId,
                        },
                    },
                    datetime: {
                        gte: new Date(),
                    },
                },
                select: safeRoomSelect,
            });
        },

        findPast(userId) {
            return prisma.room.findMany({
                where: {
                    participants: {
                        some: {
                            userId,
                        },
                    },
                    datetime: {
                        lt: new Date(),
                    },
                },
                select: safeRoomSelect,
            });
        },
    };
}