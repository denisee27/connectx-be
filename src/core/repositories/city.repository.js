import { getPageData } from '../utils/pagination.js';

/**
 * @typedef {import('@prisma/client').PrismaClient} PrismaClient
 * @typedef {import('@prisma/client').City} City
 * @typedef {import('../utils/pagination.js').PageData} PageData
 * @typedef {import('../utils/pagination.js').Pagination} Pagination
 */

export const safeCitySelect = {
    id: true,
    name: true,
    countryId: true,
};

/**
 * @param {PrismaClient} prisma
 */
export function makeCityRepository(prisma) {
    return {
        /**
         * @param {string} id
         * @returns {Promise<City | null>}
         */
        findById(id) {
            return prisma.city.findUnique({
                where: { id },
                select: safeCitySelect,
            });
        },

        /**
         * @param {Pagination} page
         * @param {Pagination} limit
         * @param {string} search
         * @param {string} countryId
         * @returns {Promise<PageData<City>>}
         */
        async findMany({ page, limit, search, countryId }) {
            const where = {
                name: {
                    contains: search,
                    mode: 'insensitive',
                },
                countryId,
            };

            const [cities, total] = await Promise.all([
                prisma.city.findMany({
                    where,
                    select: safeCitySelect,
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                prisma.city.count({ where }),
            ]);

            return getPageData(cities, total, page, limit);
        },

        /**
         * @param {string} countryId
         * @param {string} name
         * @returns {Promise<City>}
         */
        create(data) {
            return prisma.city.create({
                data,
                select: safeCitySelect,
            });
        },

        /**
         * @param {string} id
         * @param {string} name
         * @returns {Promise<City>}
         */
        update(id, data) {
            return prisma.city.update({
                where: { id },
                data,
                select: safeCitySelect,
            });
        },

        /**
         * @param {string} id
         * @returns {Promise<City>}
         */
        delete(id) {
            return prisma.city.delete({
                where: { id },
                select: safeCitySelect,
            });
        },
    };
}