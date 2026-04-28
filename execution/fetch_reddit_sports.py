import requests
import json
import sys

def fetch_reddit_news(subreddit, limit=10):
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    headers = {'User-agent': 'Botman News Scraper 1.0'}
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        posts = []
        for post in data['data']['children']:
            p = post['data']
            posts.append({
                "title": p['title'],
                "url": f"https://www.reddit.com{p['permalink']}",
                "ups": p['ups'],
                "num_comments": p['num_comments'],
                "created_utc": p['created_utc'],
                "subreddit": subreddit
            })
        return posts
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    subreddits = ["sports", "soccer", "nba"]
    if len(sys.argv) > 1:
        subreddits = sys.argv[1].split(',')
    
    all_news = []
    for sub in subreddits:
        res = fetch_reddit_news(sub)
        if isinstance(res, list):
            all_news.extend(res)
    
    print(json.dumps(all_news, indent=2))
