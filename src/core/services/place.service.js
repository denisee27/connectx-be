export function makePlaceService({ placeRepository }) {
    return {
        async getCountries() {
            return placeRepository.findCountries();
        },
        async getRegions() {
            return placeRepository.findRegions();
        },
        async getCities() {
            return placeRepository.findCities();
        },
        async getCitiesByCountryId(countryId) {
            return placeRepository.findCitiesByCountryId(countryId);
        },
    };
}