# Directive: Daily Sports Update

## Goal
Automate the daily delivery of curated sports news to the target WhatsApp group.

## Schedule
Hourly (as per user requirements in history).

## Process
1. **Curate News**:
   - Run the process from `directives/curate_sports_news.md`.
   - Store the formatted report in `.tmp/daily_report.txt`.

2. **Identify Target**:
   - Read the target Group ID from `.env` (`WHATSAPP_GROUP_ID`).

3. **Send Message**:
   - Run the process from `directives/send_whatsapp.md` using the content of `.tmp/daily_report.txt` and the `WHATSAPP_GROUP_ID`.

4. **Verify**:
   - Check logs for "Message sent successfully".
