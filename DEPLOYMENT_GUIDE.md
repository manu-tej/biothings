# 🚀 BioThings Deployment Guide

## Quick Start (Local)

```bash
# 1. Clone and setup
git clone <your-repo>
cd biothings

# 2. Set API key
export GOOGLE_API_KEY=your-gemini-api-key

# 3. Deploy!
./deploy.sh
```

That's it! Visit http://localhost:8000 🎉

## Deployment Options

### 1. **Docker (Recommended)**
```bash
# Using docker-compose
docker-compose up -d

# Or using Make
make deploy

# Or manually
docker build -t biothings .
docker run -p 8000:8000 -e GOOGLE_API_KEY=$GOOGLE_API_KEY biothings
```

### 2. **Local Python**
```bash
./deploy.sh local

# Or manually
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

### 3. **Cloud Deployments**

#### Railway (Easiest)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up
```

#### Render
1. Connect GitHub repo to Render
2. It auto-detects `render.yaml`
3. Add `GOOGLE_API_KEY` in dashboard
4. Deploy!

#### Google Cloud Run
```bash
./deploy-cloud.sh gcp
```

#### AWS ECS
```bash
./deploy-cloud.sh aws
```

#### Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly secrets set GOOGLE_API_KEY=$GOOGLE_API_KEY
fly deploy
```

## Environment Variables

Required:
- `GOOGLE_API_KEY` - Your Gemini API key

Optional:
- `GEMINI_MODEL` - Model name (default: gemini-2.5-flash)
- `GEMINI_THINKING_BUDGET` - Thinking tokens (default: 8192)
- `PORT` - Server port (default: 8000)

## Health Checks

All deployments include health checks:
```bash
curl http://your-domain/api/health
```

## Monitoring

Check logs:
```bash
# Docker
docker-compose logs -f

# Local
./deploy.sh logs

# Railway
railway logs

# Fly.io
fly logs
```

## Scaling

### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  backend:
    scale: 3  # Run 3 instances
```

### Vertical Scaling
```yaml
# fly.toml
[[vm]]
  memory = "1gb"  # Increase memory
  cpus = 2        # Add CPUs
```

## SSL/HTTPS

### With Nginx
```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://backend:8000;
    }
}
```

### With Cloudflare
1. Add domain to Cloudflare
2. Enable "Full SSL/TLS"
3. Point to your server

## Troubleshooting

### Common Issues

1. **API Key Error**
   ```bash
   export GOOGLE_API_KEY=your-key
   # Or add to .env file
   ```

2. **Port Already in Use**
   ```bash
   PORT=8001 ./deploy.sh
   ```

3. **Docker Build Fails**
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

4. **Out of Memory**
   - Increase Docker memory
   - Use smaller thinking budget
   - Scale horizontally

## Production Checklist

- [ ] Set strong API keys
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up monitoring (Datadog, New Relic)
- [ ] Configure rate limiting
- [ ] Set up backups
- [ ] Configure auto-scaling
- [ ] Set up alerts

## Cost Optimization

1. **Use thinking mode wisely**
   - Simple queries: 0 tokens
   - Complex queries: 8192 tokens
   - Research: 16384 tokens

2. **Cache responses**
   - Enable Redis for production
   - Cache common queries

3. **Monitor usage**
   ```bash
   curl http://localhost:8000/api/metrics/dashboard
   ```

## Support

- GitHub Issues: Report bugs
- Discord: Join community
- Email: support@biothings.ai

---

Happy deploying! 🚀🧬