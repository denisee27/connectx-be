import { getPageData } from '../utils/pagination.js';

/**
 * @typedef {import('@prisma/client').PrismaClient} PrismaClient
 * @typedef {import('@prisma/client').Region} Region
 * @typedef {import('../utils/pagination.js').PageData} PageData
 * @typedef {import('../utils/pagination.js').Pagination} Pagination
 */

export const safeRegionSelect = {
    id: true,
    name: true,
};

/**
 * @param {PrismaClient} prisma
 */
export function makeRegionRepository(prisma) {
    return {
        /**
         * @param {string} id
         * @returns {Promise<Region | null>}
         */
        findById(id) {
            return prisma.region.findUnique({
                where: { id },
                select: safeRegionSelect,
            });
        },

        /**
         * @param {string} page
         * @param {string} limit
         * @param {string} search
         * @returns {Promise<PageData<Region>>}
         */
        async findMany({ page, limit, search }) {
            const where = {
                name: {
                    contains: search,
                    mode: 'insensitive',
                },
            };

            const [regions, total] = await Promise.all([
                prisma.region.findMany({
                    where,
                    select: safeRegionSelect,
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                prisma.region.count({ where }),
            ]);

            return getPageData(regions, total, page, limit);
        },

        /**
         * @param {string} id
         * @param {Region} data
         * @returns {Promise<Region>}
         */
        create(data) {
            return prisma.region.create({
                data,
                select: safeRegionSelect,
            });
        },

        /**
         * @param {string} id
         * @param {Region} data
         * @returns {Promise<Region>}
         */
        update(id, data) {
            return prisma.region.update({
                where: { id },
                data,
                select: safeRegionSelect,
            });
        },

        /**
         * @param {string} id
         * @returns {Promise<Region>}
         */
        delete(id) {
            return prisma.region.delete({
                where: { id },
                select: safeRegionSelect,
            });
        },
    };
}