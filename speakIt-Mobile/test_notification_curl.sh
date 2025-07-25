#!/bin/bash

# Test the send-notification Edge Function using curl
# This bypasses browser CSP restrictions

echo "Testing send-notification Edge Function..."

curl -X POST \
  https://qdpammoeepwgapqyfrrh.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "8c76b611-6364-4279-a64b-5aa81b3e3e57",
    "title": "Test Notification",
    "body": "This is a test notification from curl",
    "data": {
      "type": "test",
      "claim_id": "test-claim-id"
    }
  }'

echo ""
echo "Test completed!" 