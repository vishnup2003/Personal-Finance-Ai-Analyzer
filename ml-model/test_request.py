import requests

url = "http://127.0.0.1:5000/predict"

payload = {
    "description": "pizza from dominos"
}

response = requests.post(url, json=payload)

print("Status code:", response.status_code)
print("Response JSON:", response.json())
