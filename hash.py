import hashlib
import bcrypt

pwd = 'Admin2026!'
sha256_hash = hashlib.sha256(pwd.encode('utf-8')).hexdigest()
print('SHA256: ' + sha256_hash)
bcrypt_hash = bcrypt.hashpw(sha256_hash.encode('utf-8'), bcrypt.gensalt(10))
print('Bcrypt: ' + bcrypt_hash.decode('utf-8'))
