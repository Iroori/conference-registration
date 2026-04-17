import json

with open('details.json', 'r') as f:
    data = json.load(f)

access_details = data['accessDetails']

with open('ssh_key', 'w') as f:
    f.write(access_details['privateKey'])

with open('ssh_key-cert.pub', 'w') as f:
    f.write(access_details['certKey'])
