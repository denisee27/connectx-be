export function makeRoomService({ roomRepository }) {
    return {
        async getHighlights() {
            return roomRepository.getHighlights();
        },
        async getPopular() {
            return roomRepository.getPopular();
        },
        async getRoomBySlug(slug) {
            return roomRepository.findBySlug(slug);
        },
        async getRooms(page, limit) {
            return roomRepository.findMany({ page, limit });
        },
    };

}