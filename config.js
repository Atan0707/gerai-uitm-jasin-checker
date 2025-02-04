const dotenv = require('dotenv');

dotenv.config();

// List of all gerai
const GERAI_LIST = [
    // Medan Kuliah
    { id: 'gerai3', name: 'Gerai 03 - Gerai Air', location: 'medan_kuliah' },
    { id: 'gerai4', name: 'Gerai 04 - Kedai Cik Siti', location: 'medan_kuliah' },
    { id: 'gerai6', name: 'Gerai 06 - Nasi Ayam/JNZ Beringin', location: 'medan_kuliah' },
    { id: 'gerai7', name: 'Gerai 07 - Kedai Nasi Kerabu', location: 'medan_kuliah' },
    { id: 'gerai8', name: 'Gerai 08 - Kedai Air/ H&K Food', location: 'medan_kuliah' },
    { id: 'gerai9', name: 'Gerai 09 - Abang Man/ Molek Gemilang', location: 'medan_kuliah' },

    // Medan Kolej
    { id: 'gerai11', name: 'Gerai 11 - Kedai Air Belah Kanan', location: 'medan_kolej' },
    { id: 'gerai13', name: 'Gerai 13 - Gerai Masakan Panas', location: 'medan_kolej' },
    { id: 'gerai14', name: 'Gerai 14 - Gerai Western', location: 'medan_kolej' },
    { id: 'gerai15', name: 'Gerai 15 - Gerai Nasi Bujang', location: 'medan_kolej' },
    { id: 'gerai16', name: 'Gerai 16 - Kedai Roti Canai', location: 'medan_kolej' },
    { id: 'gerai17', name: 'Gerai 17 - Kedai Nasi Campur (Cik Aida)', location: 'medan_kolej' },
    { id: 'gerai18', name: 'Gerai 18 - Kedai Nasi Lemak', location: 'medan_kolej' },
    { id: 'gerai19', name: 'Gerai 19 - Kedai Ayam Penyet', location: 'medan_kolej' },
    { id: 'gerai20', name: 'Gerai 20 - Kedai Air Belah Kiri', location: 'medan_kolej' },
    { id: 'gerai23', name: 'Gerai 23 - Kedai Runcit Medan', location: 'medan_kolej' },
    { id: 'gerai24', name: 'Gerai 24 - Kedai Saleh', location: 'medan_kolej' },
    { id: 'gerai25', name: 'Gerai 25 - Kedai waffle', location: 'medan_kolej' },
    { id: 'gerai30', name: 'Gerai 30 - Gerai Ayam Gepuk', location: 'medan_kolej' },

    // PPP
    { id: 'tanjung', name: 'Tanjung', location: 'ppp' },
    // To add a new gerai, just add a new object here
    // { id: 'gerai16', name: 'Gerai 16' },
];

// Operating hours configuration
const OPERATING_HOURS = {
    start: 7,  // 7 AM
    end: 24    // 11.59 PM
};

// Convert comma-separated string of admin IDs to array of numbers
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));

module.exports = {
    GERAI_LIST,
    OPERATING_HOURS,
    ADMIN_IDS
}; 