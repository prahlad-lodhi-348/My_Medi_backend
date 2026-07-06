# TODO

## Step 1: Fix Gemini SDK usage
- Update `my_medi_django_backend/api/views.py` to remove `genai.configure(...)`.
- Switch to the `google.genai` client-based API (`genai.Client(api_key=...)`) for:
  - `AIChatView.post`
  - `AIInsightsView.get`
  - `AnalyzeMedicineView.post`
  - `MedicineListCreateView.post`

## Step 2: Verify
- ✅ Ensure no remaining `genai.configure(` calls in the codebase.
- ✅ Run Django `manage.py check`.
- Next: re-test `POST /api/ai-chat/` to confirm it returns 200 instead of 500.


