const fs = require('fs');
const path = require('path');
const Fuse = require('fuse.js');

const DATA_DIR = path.join(__dirname, '../JSON');

const FILES = {
    shortages: 'layer5_shortages.json',
    suspicious: 'layer6_suspicious_drugs.json',
    medicines: 'active_db.json'
};

let dataCache = {
    shortages: [],
    suspicious: [],
    medicines: []
};

let conditionMap = new Map();
let fuses = {
    // medicines: null, // Removed monolithic index
    shortages: null,
    suspicious: null,
    partitions: {} // {'A': FuseInstance, 'B': FuseInstance, ..., 'OTHER': FuseInstance}
};

// Raw partition arrays — exposed so search.js can build targeted per-salt Fuse indexes
let partitionData = {}; // {'A': [...items], 'B': [...items], ...}

function createConditionMap(data) {
    console.log("Building Condition Map...");
    const map = new Map();
    data.forEach(item => {
        if (item.layer1_reviews && item.layer1_reviews.conditions) {
            item.layer1_reviews.conditions.forEach(cond => {
                const cleanCond = cond.trim().toLowerCase();
                if (!map.has(cleanCond)) {
                    map.set(cleanCond, []);
                }
                map.get(cleanCond).push(item);
            });
        }
    });
    console.log(`Condition Map built with ${map.size} unique conditions.`);
    return map;
}

function initFuses() {
    console.log("Initializing Search Indices...");

    // 1. Partition Medicines
    console.log("Partitioning medicines data...");
    const partitions = { 'OTHER': [] };
    // Initialize A-Z
    for (let i = 65; i <= 90; i++) {
        partitions[String.fromCharCode(i)] = [];
    }

    dataCache.medicines.forEach(item => {
        const name = item.product_name || "";
        const firstChar = name.trim().charAt(0).toUpperCase();
        if (partitions[firstChar]) {
            partitions[firstChar].push(item);
        } else {
            partitions['OTHER'].push(item);
        }
    });

    console.log("Creating Partitioned Fuse Indices...");
    for (const [key, items] of Object.entries(partitions)) {
        partitionData[key] = items; // Store raw arrays for cross-partition salt search
        if (items.length > 0) {
            fuses.partitions[key] = new Fuse(items, {
                keys: ['product_name', 'salt_composition', '_clean_salt', '_clean_product'],
                includeScore: true,
                threshold: 0.4
            });
        }
    }
    console.log(`Created ${Object.keys(fuses.partitions).length} medicine partitions.`);

    // 2. Shortages (Keep global as it's small ~2k items)
    if (dataCache.shortages.length > 0) {
        fuses.shortages = new Fuse(dataCache.shortages, {
            keys: ['Generic Name', 'Presentation'],
            includeScore: true,
            threshold: 0.4
        });
    }

    // 3. Suspicious (Keep global as it's small ~30 items)
    if (dataCache.suspicious.length > 0) {
        fuses.suspicious = new Fuse(dataCache.suspicious, {
            keys: ['Name of Drugs/medical device/cosmetics'],
            includeScore: true,
            threshold: 0.4
        });
    }
    console.log("All Search Indices Ready.");
}

function loadData() {
    console.log('Loading data files...');
    try {
        const loadFile = (filename) => {
            const filePath = path.join(DATA_DIR, filename);
            if (!fs.existsSync(filePath)) {
                console.warn(`Warning: File ${filename} not found at ${filePath}`);
                return [];
            }
            const rawData = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(rawData);

            // Normalize keys (trim whitespace)
            return data.map(item => {
                const newItem = {};
                for (let key in item) {
                    newItem[key.trim()] = item[key];
                }
                return newItem;
            });
        };

        dataCache.shortages = loadFile(FILES.shortages);
        console.log(`Loaded ${dataCache.shortages.length} shortage records.`);

        dataCache.suspicious = loadFile(FILES.suspicious);
        console.log(`Loaded ${dataCache.suspicious.length} suspicious drug records.`);

        dataCache.medicines = loadFile(FILES.medicines);
        console.log(`Loaded ${dataCache.medicines.length} medicine reviews records.`);

        // Build Optimizations
        conditionMap = createConditionMap(dataCache.medicines);
        initFuses();

        console.log('All data loaded and indexed successfully.');
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

function getData() {
    return dataCache;
}

function getConditionMap() {
    return conditionMap;
}

function getFuses() {
    return fuses;
}

function getPartitionData() {
    return partitionData;
}

module.exports = {
    loadData,
    getData,
    getConditionMap,
    getFuses,
    getPartitionData
};
