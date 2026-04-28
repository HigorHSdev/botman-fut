# Directive: Scrape Website

## Goal
Extract the main heading and first paragraph from a given URL to summarize a webpage.

## Inputs
- `url`: The full URL of the website to scrape.

## Tools/Scripts
- `execution/scrape_single_site.py`

## Process
1. Call `execution/scrape_single_site.py` with the provided `url`.
2. Capture the output JSON.
3. Present the result to the user.

## Edge Cases
- Invalid URL: Report error to user.
- Timeout/Block: Retry once, then report failure.
