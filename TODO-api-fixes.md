# API Endpoint Fixes for Django Backend

## Plan Steps:

### 1. [✅] services/api.ts
   - ✅ Renamed `askAIConsult` → `getAIInsights` 
   - ✅ Changed: POST `/ai-consult/` → GET `/api/ai-insights/`
   - ✅ Removed body `{query}` 
   - ✅ Auth header preserved
   - ✅ Error: 'Failed to get AI insights'

### 2. [✅] app/ai-chat.tsx  
   - ✅ Import `getAIInsights`
   - ✅ Call `getAIInsights(token)` (no query)  
   - ✅ `aiText = response.tip || "No response from AI"`
   - ✅ Error: "Unable to fetch AI response"

### 3. [✅] Fixes complete - ReferenceError resolved
   - Endpoint: `/ai-insights/` (no /api/)
   - Exact error msg match
   - Backend {tip} handling

### 4. [ ] attempt_completion

### 3. [ ] Test
   - AI Chat: Loads tip w/o 404
   - Medicine analyze: No regression
   - `npx expo start --clear`

### 4. [ ] Complete

**Status: Starting...**

