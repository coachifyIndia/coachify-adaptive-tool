#!/bin/bash

# Test 1: Login
echo "=== Testing Login ==="
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rahul.sharma@testmail.com","password":"Test@123"}')

echo "$RESPONSE" | jq '.success, .message'

# Extract access token
TOKEN=$(echo "$RESPONSE" | jq -r '.data.access_token')
echo "Access Token: ${TOKEN:0:50}..."

# Test 2: Get Current User
echo -e "\n=== Testing /auth/me (Protected) ==="
curl -s -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '{success, user: .data.user | {name: .profile.name, email: .profile.email, segment: .profile.segment}}'

# Test 3: Test Registration
echo -e "\n=== Testing Registration (should fail - duplicate email) ==="
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "rahul.sharma@testmail.com",
    "password": "Test@123",
    "age": 25,
    "segment": "competitive_exam"
  }' | jq '.success, .message, .error'

