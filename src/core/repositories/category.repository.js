import { getPageData } from '../utils/pagination.js';

/**
 * @typedef {import('@prisma/client').PrismaClient} PrismaClient
 * @typedef {import('@prisma/client').Category} Category
 * @typedef {import('../utils/pagination.js').PageData} PageData
 * @typedef {import('../utils/pagination.js').Pagination} Pagination
 */

export const safeCategorySelect = {
    id: true,
    name: true,
    slug: true,
    icon: true,
    description: true,
    banner: true,
};

/**
 * @param {PrismaClient} prisma
 */
export function makeCategoryRepository(prisma) {
    return {
        /**
         * @param {string} id
         * @returns {Promise<Category | null>}
         */
        findById(id) {
            return prisma.category.findUnique({
                where: { id },
                select: safeCategorySelect,
            });
        },

        /**
         * @param {string} slug
         * @returns {Promise<Category | null>}
         */
        findBySlug(slug) {
            return prisma.category.findUnique({
                where: { slug },
                select: safeCategorySelect,
            });
        },

        /**
         * @returns {Promise<PageData<Category>>}
         */
        async findMany({ page, limit, search }) {
            const where = {
                name: {
                    contains: search,
                    mode: 'insensitive',
                },
            };

            const [categories, total] = await Promise.all([
                prisma.category.findMany({
                    where,
                    select: safeCategorySelect,
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                prisma.category.count({ where }),
            ]);

            return getPageData(categories, total, page, limit);
        },

        /**
         * @param {string} id
         * @returns {Promise<Category>}
         */
        create(data) {
            return prisma.category.create({
                data,
                select: safeCategorySelect,
            });
        },

        /**
         * @param {string} id
         * @returns {Promise<Category>}
         */
        update(id, data) {
            return prisma.category.update({
                where: { id },
                data,
                select: safeCategorySelect,
            });
        },

        /**
         * @param {string} id
         * @returns {Promise<Category>}
         */
        delete(id) {
            return prisma.category.delete({
                where: { id },
                select: safeCategorySelect,
            });
        },
    };
}