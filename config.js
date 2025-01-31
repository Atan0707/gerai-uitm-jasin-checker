// List of all gerai
const GERAI_LIST = [
    { id: 'gerai11', name: 'Gerai 11 - Kedai Air Belah Kanan' },
    // { id: 'gerai12', name: 'Gerai 12' },
    { id: 'gerai13', name: 'Gerai 13 - Gerai Masakan Panas' },
    { id: 'gerai14', name: 'Gerai 14 - Gerai Western' },
    { id: 'gerai15', name: 'Gerai 15 - Gerai Nasi Bujang' },
    { id: 'gerai16', name: 'Gerai 16 - Kedai Roti Canai' },
    { id: 'gerai17', name: 'Gerai 17 - Kedai Nasi Campur (Cik Aida)' },
    { id: 'gerai18', name: 'Gerai 18 - Kedai Nasi Lemak' },
    { id: 'gerai19', name: 'Gerai 19 - Kedai Ayam Penyet' },
    { id: 'gerai20', name: 'Gerai 20 - Kedai Air Belah Kiri' },
    { id: 'gerai23', name: 'Gerai 23 - Kedai Runcit Medan' },
    // To add a new gerai, just add a new object here
    // { id: 'gerai16', name: 'Gerai 16' },
];

// Operating hours configuration
const OPERATING_HOURS = {
    start: 7,  // 7 AM
    end: 24    // 11.59 PM
};

module.exports = {
    GERAI_LIST,
    OPERATING_HOURS
}; 