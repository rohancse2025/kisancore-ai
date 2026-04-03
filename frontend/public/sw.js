const CACHE_NAME = 'kisancore-v1';
const OFFLINE_URLS = [
  '/',
  '/crops',
  '/scan', 
  '/iot',
  '/market',
  '/chat'
];

const OFFLINE_DATA = {
  cropRecommendation: {
    'high_N_high_moisture': 'Rice',
    'low_N_dry': 'Cotton', 
    'medium_N_medium': 'Wheat',
    'high_N_low_moisture': 'Maize',
    'low_N_high_moisture': 'Jute',
  },
  soilTips: {
    acidic: 'Add lime to increase pH to 6-7.5',
    alkaline: 'Add sulfur to reduce pH',
    low_nitrogen: 'Apply urea fertilizer 50kg/acre',
    dry: 'Irrigate immediately - soil moisture critical',
    wet: 'Stop irrigation and improve drainage'
  },
  irrigationRules: {
    below30: 'Turn ON irrigation immediately',
    between30_60: 'Moderate irrigation needed',
    above60: 'No irrigation needed today'
  },
  diseaseTips: {
    'Tomato Early Blight': 'Apply Mancozeb 2.5g/L',
    'Potato Late Blight': 'Apply Cymoxanil 3g/L',
    'Rice Blast': 'Apply Tricyclazole 0.6g/L',
    'Wheat Rust': 'Apply Propiconazole 1ml/L'
  }
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => 
      cache.addAll(OFFLINE_URLS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data === 'GET_OFFLINE_DATA') {
    event.source.postMessage(OFFLINE_DATA);
  }
});
