// This file runs crop recommendation inference IN THE BROWSER
import * as tf from '@tensorflow/tfjs';

let model: tf.LayersModel | null = null;

export async function loadCropModel() {
  if (model) return model;
  try {
    model = await tf.loadLayersModel('/models/crop-recommender/model.json');
    console.log('✅ Crop ML model loaded for offline use');
    return model;
  } catch (err) {
    console.error('❌ Failed to load offline ML model:', err);
    return null;
  }
}

export async function predictCropOffline(
  N: number, P: number, K: number, 
  temperature: number, humidity: number, 
  ph: number, rainfall: number
): Promise<{ crop: string, confidence: number } | null> {
  
  const cropModel = await loadCropModel();
  if (!cropModel) return null;
  
  // Normalize inputs (same as backend preprocessing)
  const input = tf.tensor2d([[N, P, K, temperature, humidity, ph, rainfall]]);
  
  // Run inference
  const prediction = cropModel.predict(input) as tf.Tensor;
  const probabilities = await prediction.data();
  
  // Get top prediction
  const maxProb = Math.max(...Array.from(probabilities));
  const predictedIndex = Array.from(probabilities).indexOf(maxProb);
  
  const CROP_LABELS = [
    'Rice', 'Wheat', 'Maize', 'Chickpea', 'Kidney Beans', 'Pigeon Peas',
    'Moth Beans', 'Mung Bean', 'Black Gram', 'Lentil', 'Pomegranate',
    'Banana', 'Mango', 'Grapes', 'Watermelon', 'Muskmelon', 'Apple',
    'Orange', 'Papaya', 'Coconut', 'Cotton', 'Jute', 'Coffee'
  ];
  
  return {
    crop: CROP_LABELS[predictedIndex] || 'Rice',
    confidence: Math.round(maxProb * 100)
  };
}
