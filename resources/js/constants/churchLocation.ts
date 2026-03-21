/** Endereço físico — também usado no mapa embutido. */
export const CHURCH_ADDRESS_LINE = 'R. Cubatão, 48 - Paraíso, São Paulo - SP, 04013-040';

export const CHURCH_MAPS_SEARCH_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CHURCH_ADDRESS_LINE)}`;

/** Embed simples do Google Maps (sem API key). */
export const CHURCH_MAP_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent('R. Cubatão, 48, Paraíso, São Paulo, SP, 04013-040')}&output=embed`;
