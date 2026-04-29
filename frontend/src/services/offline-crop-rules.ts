/**
 * Rule-based crop recommendation system for offline use.
 * Provides a fallback when the ML model is unavailable or network is down.
 */
export function recommendCropOffline(
  N: number, P: number, K: number,
  temp: number, humidity: number,
  ph: number, rainfall: number
): { crop: string, confidence: number, reason: string } {
  
  // High rainfall crops
  if (rainfall > 200) {
    if (temp > 25 && humidity > 70) {
      return { crop: 'Rice', confidence: 85, reason: 'High rainfall + warm climate suits rice paddy' };
    }
    if (temp < 20) {
      return { crop: 'Coffee', confidence: 80, reason: 'Cool + rainy climate ideal for coffee' };
    }
  }
  
  // Low rainfall crops
  if (rainfall < 50) {
    if (N > 40 && K > 40) {
      return { crop: 'Cotton', confidence: 82, reason: 'Low water + high NPK suits cotton' };
    }
    return { crop: 'Bajra', confidence: 78, reason: 'Drought-resistant millet for low rainfall' };
  }
  
  // Moderate conditions - cereals
  if (temp >= 20 && temp <= 30 && rainfall >= 60 && rainfall <= 150) {
    if (N > 50) {
      return { crop: 'Wheat', confidence: 88, reason: 'Moderate climate + high nitrogen perfect for wheat' };
    }
    return { crop: 'Maize', confidence: 85, reason: 'Balanced conditions suit maize' };
  }
  
  // High nitrogen - leafy vegetables
  if (N > 80 && humidity > 60) {
    return { crop: 'Spinach', confidence: 80, reason: 'High nitrogen supports leafy growth' };
  }
  
  // High potassium - fruits
  if (K > 80 && temp > 25) {
    if (rainfall > 100) {
      return { crop: 'Banana', confidence: 87, reason: 'Tropical fruit needs high K + rainfall' };
    }
    return { crop: 'Grapes', confidence: 83, reason: 'High potassium ideal for fruit quality' };
  }
  
  // Default fallback
  return { crop: 'Rice', confidence: 70, reason: 'General-purpose crop for Indian conditions' };
}
