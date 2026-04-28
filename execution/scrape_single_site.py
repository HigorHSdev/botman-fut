import sys
import json
import requests
from bs4 import BeautifulSoup

def scrape_site(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        title = soup.find('h1').get_text(strip=True) if soup.find('h1') else "No H1 found"
        paragraph = soup.find('p').get_text(strip=True) if soup.find('p') else "No paragraph found"
        
        return {
            "status": "success",
            "url": url,
            "title": title,
            "summary": paragraph[:200] + "..." if len(paragraph) > 200 else paragraph
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "No URL provided"}))
        sys.exit(1)
    
    target_url = sys.argv[1]
    result = scrape_site(target_url)
    print(json.dumps(result, indent=2))
