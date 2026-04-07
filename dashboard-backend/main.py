from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Uganda Dashboard API - Simple Version")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# function to fetch from external APIs
def fetch_external_data(url):
    """Fetch data from external APIs like WHO"""
    try:
        logger.info(f"Fetching from external API: {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch from {url}: {str(e)}")
        return None

@app.get("/")
async def root():
    return {"message": "Development Dashboard API ", "status": "running"}


# endpoint fetch from URL 
@app.get("/api/proxy")
async def proxy_api(url: str):
    """Proxy any external API call"""
    try:
        logger.info(f"Proxying request to: {url}")
        
        # Basic security check
        allowed_domains = ['api.github.com', 'jsonplaceholder.typicode.com', 'ghoapi.azureedge.net']
        if not any(domain in url for domain in allowed_domains):
            raise HTTPException(status_code=403, detail="Domain not allowed")
        
        data = fetch_external_data(url)
        if data:
            return {"status": "success", "data": data, "source_url": url}
        else:
            raise HTTPException(status_code=502, detail="Failed to fetch from external API")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in proxy endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Simple health check"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    print("Starting Development Dashboard API...")
    print("Dashboard will be available at: http://localhost:3000")
    print("API docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")