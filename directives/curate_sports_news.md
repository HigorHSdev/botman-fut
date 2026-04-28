# Directive: Curate Sports News

## Goal
Fetch, rank, and format the top 5 most relevant sports news from Reddit to be sent to a WhatsApp group.

## Inputs
- `subreddits`: Optional comma-separated list of subreddits (default: sports,soccer,nba).

## Tools/Scripts
- `execution/fetch_reddit_sports.py`
- `execution/rank_and_format_news.py`

## Process
1. Run `execution/fetch_reddit_sports.py` with the `subreddits` input.
2. Pipe the JSON output into `execution/rank_and_format_news.py`.
3. Capture the formatted text report.
4. (Orchestrator) Review the report and present it to the user.

## Edge Cases
- No news found: Report "No trending news found today" to user.
- Script error: Check network connectivity and Reddit status.
- Formatting issues: Ensure special characters are handled.
