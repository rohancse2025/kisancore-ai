/**
 * Rule-based crop recommendation system for offline use.
 * Covers 20+ Indian crops based on NPK, pH, Temperature, and Rainfall.
 */

export interface OfflineCropResult {
  crop: string;
  confidence: number;
  reason: string;
  water_needed: string;
  best_season: string;
  profit_potential: string;
}

export function recommendCropOffline(
  N: number, P: number, K: number,
  temp: number, humidity: number,
  ph: number, rainfall: number
): OfflineCropResult {
  
  // ── RICE (High water, warm) ──────────────────────────────
  if (rainfall > 200 && temp > 25 && humidity > 70 && ph > 5.5 && ph < 7) {
    return { 
      crop: 'Rice', confidence: 90, 
      reason: 'High rainfall and humidity are perfect for water-loving rice.',
      water_needed: 'Very High', best_season: 'Kharif', profit_potential: 'Medium' 
    };
  }

  // ── COFFEE (Cooler, high rain) ──────────────────────────
  if (rainfall > 150 && temp < 25 && temp > 15 && humidity > 60) {
    return { 
      crop: 'Coffee', confidence: 85, 
      reason: 'Cooler temperatures and consistent rainfall suit plantation crops.',
      water_needed: 'High', best_season: 'Perennial', profit_potential: 'High' 
    };
  }

  // ── COTTON (Warm, low rain, high NPK) ────────────────────
  if (rainfall < 80 && temp > 25 && N > 40 && P > 40 && K > 40) {
    return { 
      crop: 'Cotton', confidence: 85, 
      reason: 'Warm climate and low rainfall prevent pest issues for cotton.',
      water_needed: 'Moderate', best_season: 'Kharif', profit_potential: 'High' 
    };
  }

  // ── WHEAT (Moderate water, cool) ─────────────────────────
  if (temp < 25 && temp > 10 && rainfall > 50 && rainfall < 150 && N > 50) {
    return { 
      crop: 'Wheat', confidence: 90, 
      reason: 'Cool Rabi conditions with moderate moisture are ideal for wheat.',
      water_needed: 'Moderate', best_season: 'Rabi', profit_potential: 'Medium' 
    };
  }

  // ── MAIZE (Versatile, moderate) ──────────────────────────
  if (temp > 20 && temp < 32 && rainfall > 60 && rainfall < 120) {
    return { 
      crop: 'Maize', confidence: 85, 
      reason: 'Balanced NPK and moderate weather support healthy maize growth.',
      water_needed: 'Moderate', best_season: 'Kharif/Rabi', profit_potential: 'Medium' 
    };
  }

  // ── BAJRA / MILLETS (Hot, dry) ──────────────────────────
  if (temp > 28 && rainfall < 60) {
    return { 
      crop: 'Bajra (Millet)', confidence: 88, 
      reason: 'Extremely drought-resistant; thrives in hot, dry sandy soils.',
      water_needed: 'Low', best_season: 'Kharif', profit_potential: 'Medium' 
    };
  }

  // ── JOWAR (Warm, moderate water) ─────────────────────────
  if (temp > 25 && rainfall > 40 && rainfall < 100) {
    return { 
      crop: 'Jowar (Sorghum)', confidence: 82, 
      reason: 'Thrives in warm weather with minimal water requirements.',
      water_needed: 'Low', best_season: 'Kharif', profit_potential: 'Medium' 
    };
  }

  // ── GROUNDNUT (Moderate rain, sandy soil) ───────────────
  if (rainfall > 50 && rainfall < 100 && temp > 22 && P > 30) {
    return { 
      crop: 'Groundnut', confidence: 80, 
      reason: 'Light soil and moderate moisture help pod development.',
      water_needed: 'Moderate', best_season: 'Kharif', profit_potential: 'High' 
    };
  }

  // ── SOYBEAN (High Nitrogen, warm) ────────────────────────
  if (N > 40 && temp > 22 && temp < 30 && rainfall > 60 && rainfall < 150) {
    return { 
      crop: 'Soybean', confidence: 84, 
      reason: 'Moderate rainfall and warm nights favor soybean oil content.',
      water_needed: 'Moderate', best_season: 'Kharif', profit_potential: 'High' 
    };
  }

  // ── GRAPES (High Potassium, warm) ────────────────────────
  if (K > 60 && temp > 25 && humidity < 50 && rainfall < 50) {
    return { 
      crop: 'Grapes', confidence: 80, 
      reason: 'Dry weather and high potassium ensure sweet, high-quality fruit.',
      water_needed: 'Moderate', best_season: 'Rabi', profit_potential: 'Very High' 
    };
  }

  // ── BANANA (High rain, hot, high K) ──────────────────────
  if (rainfall > 180 && temp > 25 && K > 70) {
    return { 
      crop: 'Banana', confidence: 85, 
      reason: 'Tropical heat, high moisture, and potassium-rich soil suit banana.',
      water_needed: 'Very High', best_season: 'Perennial', profit_potential: 'High' 
    };
  }

  // ── MANGO (Warm, dry during flowering) ───────────────────
  if (temp > 24 && rainfall > 100 && rainfall < 200 && humidity < 60) {
    return { 
      crop: 'Mango', confidence: 82, 
      reason: 'Dry winter for flowering and warm summer for ripening is ideal.',
      water_needed: 'Moderate', best_season: 'Perennial', profit_potential: 'High' 
    };
  }

  // ── ORANGE / CITRUS (Moderate) ───────────────────────────
  if (temp > 15 && temp < 30 && rainfall > 60 && rainfall < 120 && ph > 5.5 && ph < 7.5) {
    return { 
      crop: 'Orange', confidence: 78, 
      reason: 'Subtropical conditions with well-drained soil are best for citrus.',
      water_needed: 'Moderate', best_season: 'Perennial', profit_potential: 'High' 
    };
  }

  // ── POMEGRANATE (Arid, hot) ─────────────────────────────
  if (temp > 25 && rainfall < 60 && humidity < 40) {
    return { 
      crop: 'Pomegranate', confidence: 86, 
      reason: 'Requires dry heat and low humidity to prevent fungal issues.',
      water_needed: 'Low', best_season: 'Perennial', profit_potential: 'High' 
    };
  }

  // ── LENTIL / CHANA (Cool, dry) ──────────────────────────
  if (temp < 22 && rainfall < 50 && N < 30) {
    return { 
      crop: 'Lentil / Chana', confidence: 80, 
      reason: 'Cold Rabi season and low water suit pulse cultivation.',
      water_needed: 'Low', best_season: 'Rabi', profit_potential: 'Medium' 
    };
  }

  // ── MUSTARD (Cool, moderate moisture) ───────────────────
  if (temp < 20 && rainfall > 30 && rainfall < 80 && N > 50) {
    return { 
      crop: 'Mustard', confidence: 82, 
      reason: 'Winter cool temperatures help in oilseed development.',
      water_needed: 'Low', best_season: 'Rabi', profit_potential: 'Medium' 
    };
  }

  // ── TOMATO (Moderate, high NPK) ─────────────────────────
  if (temp > 18 && temp < 30 && N > 60 && P > 50 && K > 50) {
    return { 
      crop: 'Tomato', confidence: 75, 
      reason: 'High nutrient availability and mild temperatures suit tomatoes.',
      water_needed: 'Moderate', best_season: 'Kharif/Rabi', profit_potential: 'Medium' 
    };
  }

  // ── POTATO (Cool, high K) ────────────────────────────────
  if (temp < 22 && temp > 10 && K > 80 && rainfall < 100) {
    return { 
      crop: 'Potato', confidence: 80, 
      reason: 'Cool soil and high potassium favor tuber growth.',
      water_needed: 'Moderate', best_season: 'Rabi', profit_potential: 'Medium' 
    };
  }

  // ── ONION (Mild, low rain) ──────────────────────────────
  if (temp > 15 && temp < 25 && rainfall < 80 && humidity < 60) {
    return { 
      crop: 'Onion', confidence: 78, 
      reason: 'Low humidity during bulb formation prevents rot.',
      water_needed: 'Moderate', best_season: 'Rabi/Kharif', profit_potential: 'High' 
    };
  }

  // ── SPINACH (Leafy, High Nitrogen) ──────────────────────
  if (N > 80 && temp < 25 && humidity > 60) {
    return { 
      crop: 'Spinach', confidence: 75, 
      reason: 'High nitrogen supports rapid vegetative leaf growth.',
      water_needed: 'High', best_season: 'Rabi', profit_potential: 'Medium' 
    };
  }

  // ── DEFAULT FALLBACK ────────────────────────────────────
  return { 
    crop: 'Maize', confidence: 65, 
    reason: 'Versatile crop that grows well in various Indian climates.',
    water_needed: 'Moderate', best_season: 'Kharif', profit_potential: 'Medium' 
  };
}
