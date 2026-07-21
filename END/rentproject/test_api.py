import requests

response = requests.get('http://localhost:8000/api/property/6/tour/', headers={'Authorization': 'Token ' + open('token.txt').read().strip()})
print(response.json())
