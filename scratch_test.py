import base64
import requests
import json

# A tiny valid green PNG
png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEElEQVR4nGP8z4AAMgYEAADAOACAnf3oqwAAAABJRU5ErkJggg=="

prompt = """Analyze this plant leaf image. First, determine if the leaf is healthy or shows signs of disease.
If it is completely healthy and green with no spots, discoloration, or pests, you MUST return "Healthy Plant" as the disease.
Return ONLY a JSON object with this exact structure, nothing else:
{
  "disease": "Specific disease name, OR 'Healthy Plant' if no disease is present",
  "confidence": 85-99 (number),
  "severity": "None" or "Mild" or "Moderate" or "Severe",
  "treatment": "2 sentences of treatment advice, or 'No treatment required' if healthy",
  "prevention": "2 sentences of prevention advice, or general care tips if healthy"
}
Do not include any markdown formatting, backticks, or extra text. Return ONLY valid JSON."""

print("Sending request...")
response = requests.post('http://127.0.0.1:8000/api/v1/chat/', json={
    'message': prompt,
    'image': png_base64
})
try:
    print(response.json())
except Exception as e:
    print("Error parsing JSON. Raw response:")
    print(response.text)
