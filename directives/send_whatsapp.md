# Directive: Send WhatsApp Message

## Goal
Send a formatted message to a specific WhatsApp contact or group.

## Inputs
- `target`: The WhatsApp ID (e.g., `55XXXXXXXXXXX@c.us` for contacts or `XXXXXXXXXX@g.us` for groups).
- `message`: The text message to send.

## Tools/Scripts
- `execution/whatsapp/send_message.js`

## Process
1. Ensure the Node.js service is running or start it using `npm start` in `execution/whatsapp/`.
2. Wait for the "Client is ready!" status.
3. Call the script with the `target` and `message` as arguments.
4. Confirm delivery from the script output.

## Edge Cases
- Client not authenticated: Show QR code to the user for scanning.
- Invalid ID: Script will fail, check the ID format.
- Network error: Retry after 30 seconds.
