/* eslint-disable no-undef */

// cdns for external data packages
const presetsCdnUrl = ENV__ID_PRESETS_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/@openstreetmap/id-tagging-schema@{presets_version}/';
const ociCdnUrl = ENV__ID_OCI_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/osm-community-index@{version}/';
const wmfSitematrixCdnUrl = ENV__ID_WMF_SITEMATRIX_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/wmf-sitematrix@{version}/';
const nsiCdnUrl = ENV__ID_NSI_CDN_URL
  || 'https://cdn.jsdelivr.net/npm/name-suggestion-index@{version}/';

// api urls and settings
const osmApiConnections = [{
  url: window.HUDHUD_OSM_URL || 'https://www.openstreetmap.org',
  apiUrl: window.HUDHUD_OSM_URL || 'https://api.openstreetmap.org',
  client_id: window.HUDHUD_OSM_CLIENT_ID || 'O3g0mOUuA2WY5Fs826j5tP260qR3DDX7cIIE2R2WWSc',
  client_secret: window.HUDHUD_OSM_CLIENT_SECRET || 'b4aeHD1cNeapPPQTrvpPoExqQRjybit6JBlNnxh62uE'
}, {
  url: window.PUBLIC_OSM_URL || 'https://www.openstreetmap.org',
  apiUrl: window.PUBLIC_OSM_API || 'https://api.openstreetmap.org',
  client_id: window.PUBLIC_OSM_CLIENT_ID || 'O3g0mOUuA2WY5Fs826j5tP260qR3DDX7cIIE2R2WWSc',
  client_secret: window.PUBLIC_OSM_CLIENT_SECRET || 'b4aeHD1cNeapPPQTrvpPoExqQRjybit6JBlNnxh62uE'
}];

// auxiliary OSM services
const taginfoApiUrl = ENV__ID_TAGINFO_API_URL
  || 'https://taginfo.openstreetmap.org/api/4/';
const nominatimApiUrl = ENV__ID_NOMINATIM_API_URL
  || 'https://nominatim.openstreetmap.org/';

// support/donation message on upload success screen
const showDonationMessage = ENV__ID_SHOW_DONATION_MESSAGE !== 'false';

export {
  presetsCdnUrl,
  ociCdnUrl,
  wmfSitematrixCdnUrl,
  nsiCdnUrl,
  osmApiConnections,
  taginfoApiUrl,
  nominatimApiUrl,
  showDonationMessage
};
