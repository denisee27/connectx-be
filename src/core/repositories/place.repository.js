export function makePlaceRepository({ prisma }) {
    return {
        findCountries() {
            return prisma.country.findMany();
        },
        findRegions() {
            return prisma.region.findMany();
        },
        findCities() {
            return prisma.city.findMany();
        },
        findCitiesByCountryId(countryId) {
            return prisma.city.findMany({
                where: { countryId },
            });
        },
    };
}