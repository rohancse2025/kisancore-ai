import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv('backend/.env')
client = Groq(api_key=os.getenv('GROQ_API_KEY'))
models = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-instruct', 'llama-3.2-90b-vision-instruct', 'llama-v3p2-11b-vision-instruct', 'llama-v3p2-90b-vision-instruct']

for m in models:
    try:
        client.chat.completions.create(model=m, messages=[{'role': 'user', 'content': 'hi'}])
        print('WORKS:', m)
    except Exception as e:
        print('FAILS:', m, str(e)[:50])
