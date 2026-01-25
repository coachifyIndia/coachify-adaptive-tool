#!/bin/bash

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rahul.sharma@testmail.com","password":"Test@123"}')

TOKEN=$(echo $LOGIN_RESPONSE | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "Failed to get auth token"
  exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

# Try to end common session IDs that might be active
for SESSION_ID in "SES_909084" "SES_983322" "SES_818156" "SES_797458"; do
  echo "Attempting to end session $SESSION_ID..."
  RESPONSE=$(curl -s -X POST http://localhost:5001/api/v1/practice/end-session \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"session_id\":\"$SESSION_ID\"}")

  echo $RESPONSE | grep -q '"success":true' && echo "  ✓ Ended successfully" || echo "  - Session not active or already ended"
done

echo ""
echo "✅ Cleanup complete!"
