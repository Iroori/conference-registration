#!/bin/bash
# Re-fetch the 1-minute expiry keys
rm -f ssh_key ssh_key-cert.pub
aws lightsail get-instance-access-details --instance-name kssc2026-server > details.json
python3 extract_ssh.py
chmod 400 ssh_key
chmod 400 ssh_key-cert.pub

# 2. Insert into DB using correct sqlcmd path and -C for trust cert
ssh -o StrictHostKeyChecking=no -i ssh_key ubuntu@52.79.209.95 '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U kssc_app -P "Kssc2026!App#User" -d kssc2026' << 'EOF'
-- Add missing admin column
ALTER TABLE users ADD admin bit NOT NULL DEFAULT 0;
GO

-- Insert admin user
INSERT INTO users (
    email, password, name_kr, name_en, affiliation, position, country, phone, birth_date,
    member_type, email_verified, active, presenter, admin, created_at, updated_at
) VALUES (
    'admin@kibse.or.kr',
    '$2a$10$O.Monevm2Mrm7Cea/MQrhOgxCJ2S0SjyQDprDd.YbIBXmgFk3bnNW',
    N'관리자', 'Administrator', 'KIBSE', 'Admin', 'South Korea', '000-0000-0000', '1980-01-01',
    'MEMBER', 1, 1, 0, 1, GETDATE(), GETDATE()
);
GO
EOF
