import json
import os

# Feature importance mapping (Estimated for demonstration)
feature_names = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
feature_importance = {
    'N': 0.15,
    'P': 0.12,
    'K': 0.14,
    'temperature': 0.18,
    'humidity': 0.16,
    'ph': 0.10,
    'rainfall': 0.15
}

model_data = {
    'type': 'RandomForest',
    'n_estimators': 100,
    'feature_names': feature_names,
    'classes': [
        'Rice', 'Wheat', 'Maize', 'Chickpea', 'Kidney Beans', 'Pigeon Peas',
        'Moth Beans', 'Mung Bean', 'Black Gram', 'Lentil', 'Pomegranate',
        'Banana', 'Mango', 'Grapes', 'Watermelon', 'Muskmelon', 'Apple',
        'Orange', 'Papaya', 'Coconut', 'Cotton', 'Jute', 'Coffee'
    ],
    'feature_importance': feature_importance
}

# Ensure the directory exists
output_dir = 'frontend/public/models/crop-recommender'
os.makedirs(output_dir, exist_ok=True)

output_path = os.path.join(output_dir, 'model.json')
with open(output_path, 'w') as f:
    json.dump(model_data, f, indent=2)

print(f"[SUCCESS] Model metadata exported to {output_path}")
