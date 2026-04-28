import sys
import json
import io

# Force UTF-8 for Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

def rank_news(news_list, top_n=5):
    # Ranking score: Upvotes + (Comments * 2)
    for p in news_list:
        p['score'] = p['ups'] + (p['num_comments'] * 2)
    
    sorted_news = sorted(news_list, key=lambda x: x['score'], reverse=True)
    return sorted_news[:top_n]

def format_news(ranked_news):
    message = "*🔥 TOP 5 SPORTS NEWS AT THE MOMENT 🔥*\n\n"
    for i, p in enumerate(ranked_news, 1):
        message += f"{i}. *{p['title']}*\n"
        message += f"   🔗 {p['url']}\n"
        message += f"   (Subreddit: r/{p['subreddit']} | 👍 {p['ups']} | 💬 {p['num_comments']})\n\n"
    return message

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        news_list = json.loads(input_data)
        
        if "error" in news_list:
            print(f"Error in input data: {news_list['error']}")
            sys.exit(1)
            
        top_news = rank_news(news_list)
        formatted = format_news(top_news)
        print(formatted)
    except Exception as e:
        print(f"Ranking error: {str(e)}")
        sys.exit(1)
