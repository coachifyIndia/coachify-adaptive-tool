# Analytics API Testing Page

## Quick Access

**URL:** http://localhost:5174/analytics-testing

**Dashboard Button:** Look for the "🧪 API Testing" button in the top-right corner of the dashboard

## Available API Tests

### Confidence Analytics (2 endpoints)

1. **Overall Confidence Analytics**
   - Endpoint: `GET /api/v1/analytics/confidence`
   - Description: Get overall confidence metrics across all sessions
   - No parameters required

2. **Confidence by Micro-Skill**
   - Endpoint: `GET /api/v1/analytics/confidence/by-skill`
   - Description: Get confidence breakdown by each micro-skill
   - No parameters required

### Time Analytics (5 endpoints)

3. **Speed-Accuracy Correlation**
   - Endpoint: `GET /api/v1/analytics/time/speed-accuracy`
   - Description: Analyze correlation between speed and accuracy
   - No parameters required

4. **Time of Day Analysis**
   - Endpoint: `GET /api/v1/analytics/time/time-of-day`
   - Description: Find best and worst practice hours
   - No parameters required

5. **Fatigue Detection**
   - Endpoint: `GET /api/v1/analytics/time/fatigue/:session_id`
   - Description: Detect fatigue patterns in a specific session
   - **Requires:** Session ID (enter in the input field at the top of the page)

6. **Difficulty & Time Analysis**
   - Endpoint: `GET /api/v1/analytics/time/difficulty-analysis`
   - Description: Analyze time allocation across difficulty levels
   - No parameters required

7. **Combined Recommendations**
   - Endpoint: `GET /api/v1/analytics/time/recommendations`
   - Description: Get personalized practice recommendations
   - No parameters required

## How to Use

### For APIs without parameters:

1. Click the "Test API" button
2. Wait for the response
3. View the JSON result below the button

### For Fatigue Detection API (requires Session ID):

1. Complete a practice session first
2. Copy the session ID from the URL or session summary
3. Paste it into the "Session ID" input field at the top
4. Click "Test API" for the Fatigue Detection endpoint

## Features

✅ **One-Click Testing**: Each API has a dedicated test button  
✅ **Real-Time Results**: See API responses instantly  
✅ **JSON Formatting**: Responses are formatted for easy reading  
✅ **Error Handling**: Clear error messages if something goes wrong  
✅ **Timestamps**: Each response shows when it was received  
✅ **Loading States**: Visual feedback while waiting for responses

## Tips

- Make sure you have completed some practice sessions to get meaningful analytics
- For Fatigue Detection, use a recent session ID
- Check the browser console for detailed network requests
- All responses are displayed in JSON format for inspection

## Example Session IDs

After completing a practice session or drill, you'll see URLs like:

- `/practice/session/SES_289933` → Session ID is `SES_289933`
- `/practice/drill/SES_123456/summary` → Session ID is `SES_123456`

## Technical Details

**Frontend:** React + TypeScript  
**Service:** `client/src/services/analytics.service.ts`  
**Page:** `client/src/pages/dashboard/AnalyticsTestingPage.tsx`  
**Route:** `/analytics-testing` (Protected)

## Backend Server

Make sure the backend is running on: `http://localhost:5001`
