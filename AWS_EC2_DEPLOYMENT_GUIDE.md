# Eco2 AWS EC2 Deployment Guide

A robust, step-by-step guide to deploying the Django backend to an Ubuntu EC2 instance, splitting standard API traffic to Gunicorn/Uvicorn and real-time WebSockets to Daphne.

---

## 1. System Setup & Dependencies

First, update your fresh EC2 instance and install the required system-level packages (including Nginx for web serving and a PostgreSQL client if you use it).

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv python3-dev libpq-dev postgresql postgresql-contrib nginx curl redis-server -y
```

---

## 2. Clone Repository & Setup Virtual Environment

Clone your GitHub repository into your `home` folder (`~`).

```bash
cd ~
git clone https://github.com/Arsh910/eco2.git
cd eco2/backend
```

Create exactly the environment name we used (`env`) so the background services find their binaries, and install all required modules.

```bash
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
pip install gunicorn setuptools uvicorn
```
*(Note: `daphne` is already in your `requirements.txt` thanks to our previous fix, so it will install automatically!)*

---

## 3. Configure the Production `.env` File

Your new EC2 instance won't have the `.env` file since Git ignores it. Create a new one:

```bash
nano .env (backend folder)
```

Paste your secure configuration. It **must** look like this to pass the Django/Channels security checks:

```ini
DEBUG=False
SECRET_KEY=your_secure_secret_key_here

# Do NOT use http:// in ALLOWED_HOSTS
ALLOWED_HOSTS=54.226.111.111,localhost,127.0.0.1,eco2-frontend-production-s3-website.us-east-1.amazonaws.com

# You MUST use http:// in CORS origins
CORS_ALLOWED_ORIGINS=http://eco2-frontend-production-s3-website.us-east-1.amazonaws.com,http://localhost:5173
```
*(Press `Ctrl+O`, `Enter`, `Ctrl+X` to save and exit).*

---

## 4. Run Migrations & Collect Static Files

Prepare the database and collect all the Django core stylesheets (like the admin panel `css`) into a single folder for Nginx to serve fast.

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

---

## 5. Configure Gunicorn (HTTP API Server)

We need Gunicorn to run endlessly in the background to handle normal `/api/` traffic.

```bash
sudo nano /etc/systemd/system/gunicorn.service
```

Paste exactly this configuration (make sure the `env` path matches!):

```ini
[Unit]
Description=gunicorn daemon for eco2
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/eco2/backend
ExecStart=/home/ubuntu/eco2/backend/env/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          -k uvicorn.workers.UvicornWorker \
          --bind unix:/home/ubuntu/eco2/backend/eco2.sock \
          Project.asgi:application

[Install]
WantedBy=multi-user.target
```

---

## 6. Configure Daphne (WebSocket Server)

Daphne will run in the background to handle the constant, two-way `/ws/` traffic for presence and 3D multiplayer.

```bash
sudo nano /etc/systemd/system/daphne.service
```

Paste exactly this configuration. The `Environment` line is absolutely critical to avoid the `AppRegistryNotReady` crash!

```ini
[Unit]
Description=WebSocket Daphne Service for Eco2
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/eco2/backend
Environment="DJANGO_SETTINGS_MODULE=Project.settings"
ExecStart=/home/ubuntu/eco2/backend/env/bin/daphne \
          -u /home/ubuntu/eco2/backend/daphne.sock \
          Project.asgi:application

[Install]
WantedBy=multi-user.target
```

---

## 7. Start & Enable Python Services

Tell Linux about your two new background services, start them, and set them to turn on automatically if the server reboots.

```bash
sudo systemctl daemon-reload

sudo systemctl start gunicorn
sudo systemctl enable gunicorn

sudo systemctl start daphne
sudo systemctl enable daphne
```

Verify they are glowing green (`Active: active (running)`):
```bash
sudo systemctl status gunicorn
sudo systemctl status daphne
```
*(If they failed, check logs with: `sudo journalctl -u gunicorn -n 20 --no-pager`)*

---

## 8. Configure Nginx (Reverse Proxy & Static Files)

Nginx answers port 80 traffic (the internet) and bridges the connections to your background socket files (`eco2.sock` and `daphne.sock`). 

```bash
sudo nano /etc/nginx/sites-available/eco2
```

Paste exactly this configuration. It cleanly separates `/ws/` sockets from standard HTTP!

```nginx
server {
    listen 80;
    server_name 54.226.111.111; # Replace with a Domain Name automatically if attaching one later

    # Handle Static Files (Django Admin CSS, etc)
    location /static/ {
        alias /home/ubuntu/eco2/backend/vol/web/static/;
    }

    # Route WebSockets exactly to Daphne
    location /ws/ {
        proxy_pass http://unix:/home/ubuntu/eco2/backend/daphne.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $server_name;
    }

    # Route Standard API/HTTP Traffic exactly to Gunicorn
    location / {
        proxy_pass http://unix:/home/ubuntu/eco2/backend/eco2.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site configuration and delete the default Nginx welcome page:
```bash
sudo ln -s /etc/nginx/sites-available/eco2 /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

---

## 9. Start The Web Server

Test your Nginx code for typos, then launch it:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 10. Fix Socket File Permissions (Critical Fix)

If Nginx logs a `502 Bad Gateway` error, it means the `www-data` group permissions didn't propagate to the newly created socket files in your `ubuntu` folder. Simply grant Nginx (www-data) the authority to read those files!

```bash
# Add ubuntu to www-data group granting folder access
sudo usermod -aG ubuntu www-data

# Set ownership of the backend folder
sudo chown -R ubuntu:www-data /home/ubuntu/eco2/backend
sudo chmod -R 775 /home/ubuntu/eco2/backend

# Restart so the sockets are recreated with the exact new permissions!
sudo systemctl restart gunicorn
sudo systemctl restart daphne
sudo systemctl restart nginx
```

Your EC2 Django Backend is now officially secure, deployed, splitting traffic, and handling WebSockets flawlessly!
