from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import status, viewsets
from django.db import models
from django.utils import timezone as dj_timezone

from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.shortcuts import render, redirect

from google import genai
import json
import io
import os
import tempfile
import uuid
from PIL import Image
from urllib.parse import urlencode

from rest_framework.parsers import MultiPartParser, FormParser

from .models import User, Medicine, Profile, Regimen, RegimenDose, StockItem, StockAlert
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    ProfileSerializer,
    MedicineSerializer,
    ResendVerificationSerializer,
    RegimenSerializer,
    RegimenDoseSerializer,
    StockItemSerializer,
    StockAlertSerializer,
)
from .utils import send_verification_email


# ---------------- Existing APIView endpoints (kept as-is logically) ----------------


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            send_verification_email(user, request)
            return Response(
                {'message': 'User registered. Check email for verification.'},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            token_uuid = uuid.UUID(str(token))
            user = User.objects.get(
                email_verification_token=token_uuid,
                is_email_verified=False,
            )
            user.is_email_verified = True
            user.email_verification_token = None
            user.save()
            return Response({'message': 'Email verified successfully.'}, status=status.HTTP_200_OK)
        except (ValueError, User.DoesNotExist):
            return Response({'error': 'Invalid or already used token.'}, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailWebView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        success = False
        try:
            token_uuid = uuid.UUID(str(token))
            user = User.objects.get(email_verification_token=token_uuid, is_email_verified=False)
            user.is_email_verified = True
            user.email_verification_token = None
            user.save()
            success = True
        except (ValueError, User.DoesNotExist):
            success = False

        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "").strip()
        if frontend_base:
            params = urlencode({"verified": "1" if success else "0"})
            return redirect(f"{frontend_base}/signin?{params}")

        if success:
            return render(request, "<h2>Email verified ✅</h2><p>Now you can go back to the app and sign in.</p>")

        from django.http import HttpResponse

        return HttpResponse(
            "<h2>Invalid / expired link</h2><p>Please request a new verification email.</p>",
            content_type="text/html",
            status=400,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip()
        password = serializer.validated_data["password"]

        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=user_obj.username, password=password)
        if not user:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_email_verified:
            return Response({"error": "Email not verified."}, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "username": user.username,
                "email": user.email,
                "is_email_verified": True,
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    def patch(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AnalyzeMedicineView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get('image')

        if not image_file:
            return Response(
                {'error': 'No image provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not getattr(settings, "GEMINI_API_KEY", "").strip():
            return Response(
                {'error': 'GEMINI_API_KEY missing in environment/config'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        temp_file_path = None
        uploaded_gemini_file = None

        try:
            # ✅ Save uploaded image to a temporary file on disk
            suffix = os.path.splitext(image_file.name)[1] or '.jpg'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                for chunk in image_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name

            # ✅ Upload to Gemini using the file PATH
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            uploaded_gemini_file = client.files.upload(file=temp_file_path)

            # ✅ Ask Gemini to analyze
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            model = client.models.get_model('gemini-1.5-flash')

            prompt = """Analyze this medicine image and extract details in JSON format.
            Return ONLY valid JSON with these fields (use null if not visible):
            {
              "name": "medicine name",
              "strength": "e.g. 500mg",
              "form": "tablet/capsule/syrup/etc",
              "dosage": "e.g. 1 tablet twice daily",
              "description": "brief description"
            }"""

            response = model.generate_content([prompt, uploaded_gemini_file])
            response_text = response.text.strip()

            # Clean up markdown code blocks if Gemini wraps JSON in ```
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            # ✅ Parse JSON safely
            try:
                extracted_data = json.loads(response_text)
            except json.JSONDecodeError:
                return Response(
                    {'error': 'AI could not extract medicine info from image. Try a clearer photo.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # ✅ Use fallback values for NOT NULL fields
            name_value = extracted_data.get('name') or "Unknown Medicine"
            dosage_value = extracted_data.get('dosage') or "Not Specified"
            strength_value = extracted_data.get('strength') or ""
            form_value = extracted_data.get('form') or "tablet"
            description_value = extracted_data.get('description') or ""

            # ✅ Save to database safely
            medicine, created = Medicine.objects.get_or_create(
                user=request.user,
                name=name_value,
                defaults={
                    'dosage': dosage_value,
                    'frequency': 'once daily',
                    'strength': strength_value,
                    'form': form_value,
                    'description': description_value,
                    'working_mechanism': description_value or 'Information not available',
                }
            )

            if image_file and not medicine.image:
                medicine.image = image_file
                medicine.save()

            return Response({
                'success': True,
                'name': medicine.name,
                'dosage': medicine.dosage,
                'strength': medicine.strength,
                'form': medicine.form,
                'description': medicine.description,
                'created': created,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"[Medicine Analysis Error]: {str(e)}")
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        finally:
            # ✅ ALWAYS cleanup temp file and Gemini file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception as cleanup_err:
                    print(f"Temp file cleanup failed: {cleanup_err}")

            if uploaded_gemini_file:
                try:
                    genai.delete_file(uploaded_gemini_file.name)
                except Exception:
                    pass


class MedicineListCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        medicines = Medicine.objects.filter(user=request.user)
        serializer = MedicineSerializer(medicines, many=True)
        return Response(serializer.data)

    def post(self, request):
        name = request.data.get('name')
        dosage = request.data.get('dosage')
        frequency = request.data.get('frequency')

        # Validate only Step-1 required fields.
        # Step 2 should update dosage/frequency before regimen is used.
        missing = []
        if name in (None, '', []):
            missing.append('name')
        if missing:
            return Response(
                {'error': f"Missing required field(s): {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


        notes = request.data.get('notes', '')
        image_file = request.FILES.get('image')

        working_mechanism = 'Information not available'
        side_effects = 'Information not available'

        if image_file:
            if not getattr(settings, "GEMINI_API_KEY", "").strip():
                pass
            else:
                temp_file_path = None
                uploaded_gemini_file = None
                try:
                    # Save uploaded image to a temporary file on disk
                    suffix = os.path.splitext(image_file.name)[1] or '.jpg'
                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                        for chunk in image_file.chunks():
                            temp_file.write(chunk)
                        temp_file_path = temp_file.name

                    # Upload to Gemini using the file PATH
                    client = genai.Client(api_key=settings.GEMINI_API_KEY)
                    uploaded_gemini_file = client.files.upload(file=temp_file_path)

                    model = client.models.get_model('gemini-1.5-flash')
                    prompt = (
                        "Identify this medicine and provide: "
                        "1. How it works (simple 2 sentences), "
                        "2. Potential side effects (bullet points), "
                        "3. Safety precautions. Format it as clean JSON."
                    )
                    response = model.generate_content([prompt, uploaded_gemini_file])
                    
                    response_text = response.text.strip()
                    if response_text.startswith('```'):
                        response_text = response_text.split('```')[1]
                        if response_text.startswith('json'):
                            response_text = response_text[4:]
                        response_text = response_text.strip()

                    try:
                        ai_data = json.loads(response_text)
                        working_mechanism = ai_data.get('how_it_works', 'Information not available')
                        side_effects = ai_data.get('side_effects', 'Information not available')
                    except Exception:
                        pass
                except Exception as e:
                    print(f"[Medicine List Create Error]: {str(e)}")
                finally:
                    if temp_file_path and os.path.exists(temp_file_path):
                        try:
                            os.unlink(temp_file_path)
                        except Exception as cleanup_err:
                            print(f"Temp file cleanup failed: {cleanup_err}")
                    if uploaded_gemini_file:
                        try:
                            genai.delete_file(uploaded_gemini_file.name)
                        except Exception:
                            pass

        if dosage in (None, '', []):
            dosage = 'Not specified'
        if frequency in (None, '', []):
            frequency = 'Not specified'

        medicine, created = Medicine.objects.get_or_create(
            user=request.user,
            name=name,
            defaults={
                'dosage': dosage,
                'frequency': frequency,
                'notes': notes,
                'working_mechanism': working_mechanism,
                'side_effects': side_effects,
            },
        )

        # If medicine already existed (created in Step 1), we still allow later updates.
        if not created:
            updated = False
            if medicine.dosage == 'Not specified' and dosage != 'Not specified':
                medicine.dosage = dosage
                updated = True
            if medicine.frequency == 'Not specified' and frequency != 'Not specified':
                medicine.frequency = frequency
                updated = True
            if updated:
                medicine.save(update_fields=['dosage', 'frequency'])


        if image_file and not medicine.image:
            medicine.image = image_file
            medicine.save()

        serializer = MedicineSerializer(medicine)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ReminderSpeechView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, med_id):
        try:
            med = Medicine.objects.get(id=med_id, user=request.user)
            message = (
                f"Hello {request.user.username}, it's time for {med.name}. "
                f"This helps with {med.working_mechanism}. "
                "Don't forget to take it and mark as taken!"
            )
            return Response({'speech': message})
        except Medicine.DoesNotExist:
            return Response({'error': 'Medicine not found'}, status=status.HTTP_404_NOT_FOUND)


class AIInsightsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(settings, "GEMINI_API_KEY", "").strip():
            return Response(
                {'error': 'GEMINI_API_KEY missing in environment/config'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        profile, created = Profile.objects.get_or_create(user=request.user)
        medicines = Medicine.objects.filter(user=request.user).order_by('-created_at')[:5]
        data = {
            'step_count': profile.step_count,
            'water_intake': profile.water_intake,
            'medicines': [
                {'name': m.name, 'dosage': m.dosage, 'frequency': m.frequency, 'side_effects': m.side_effects}
                for m in medicines
            ],
        }
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        model = client.models.get_model('gemini-1.5-flash')
        prompt = (
            "Generate ONE personalized health tip based on recent health data "
            f"(steps: {data['step_count']}, water: {data['water_intake']}ml) and these medications: "
            f"{json.dumps(data['medicines'])}. Keep concise, actionable, 1 sentence."
        )
        response = model.generate_content(prompt)
        tip = response.text.strip()
        return Response({'tip': tip})


class AIChatView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        model = client.models.get_model('gemini-1.5-flash')

        prompt = (
            "You are a helpful medical AI assistant. "
            "Provide safe, general health guidance. "
            "Do NOT provide diagnosis. "
            "Suggest consulting a doctor if symptoms are serious. "
            f"\nUser question: {message}"
        )

        try:
            response = model.generate_content(prompt)
            ai_text = response.text.strip()
            return Response({'response': ai_text})
        except Exception:
            return Response({'error': 'AI service unavailable'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def home(request):
    if not request.user.is_authenticated:
        return redirect('/admin/login/')
    medicines = Medicine.objects.filter(user=request.user)
    return render(request, 'home.html', {'user': request.user, 'medicines': medicines})


UserModel = get_user_model()


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip()

        try:
            user = UserModel.objects.get(email__iexact=email)
            if not user.is_email_verified:
                send_verification_email(user, request)
        except UserModel.DoesNotExist:
            pass

        return Response(
            {"message": "If this email is registered and not verified, a verification link has been sent."},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.auth:
            request.auth.delete()
        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


# ---------------- NEW endpoints: ViewSets with Router ----------------


class IsOwnerAuthenticated(IsAuthenticated):
    """Marker permission (kept as IsAuthenticated for DRF default behavior)."""


class CalendarViewSet(viewsets.ViewSet):
    """
    Kept for backward-compatibility with api/urls.py router registration.
    Calendar logic lives in RegimenViewSet.calendar() but the router expects
    a CalendarViewSet symbol.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        # Frontend/router typically uses detail routes with pk, but when
        # registered as 'calendar' without further constraints, list() may be hit.
        # Require regimen id via query param.
        regimen_id = request.query_params.get("regimen")
        if not regimen_id:
            return Response(
                {"error": "regimen query param is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start = request.query_params.get("start")
            end = request.query_params.get("end")
            if not start or not end:
                return Response(
                    {"error": "start and end are required (YYYY-MM-DD)"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            regimen = Regimen.objects.get(id=regimen_id, user=request.user)

            from datetime import datetime, timezone as dt_timezone

            start_dt = datetime.strptime(start, '%Y-%m-%d').replace(tzinfo=dt_timezone.utc)
            end_dt = datetime.strptime(end, '%Y-%m-%d').replace(tzinfo=dt_timezone.utc)
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            doses = RegimenDose.objects.filter(
                regimen=regimen,
                scheduled_at__gte=start_dt,
                scheduled_at__lte=end_dt,
            ).order_by('scheduled_at')

            grouped = {}
            for d in doses:
                day = d.scheduled_at.date().isoformat()
                grouped.setdefault(day, []).append({
                    'id': d.id,
                    'scheduled_at': d.scheduled_at.isoformat(),
                    'status': d.status,
                })

            return Response({'start': start, 'end': end, 'calendar': grouped})
        except Regimen.DoesNotExist:
            return Response(
                {"error": "regimen not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

class RegimenViewSet(viewsets.ModelViewSet):
    serializer_class = RegimenSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Regimen.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # user is set in serializer.create() using request from context
        serializer.save()

    @action(detail=True, methods=['post'], url_path='restock')
    def restock(self, request, pk=None):
        regimen = self.get_object()
        quantity = int(request.data.get('quantity', 0))
        if quantity <= 0:
            return Response({'error': 'quantity must be > 0'}, status=status.HTTP_400_BAD_REQUEST)

        stock, _ = StockItem.objects.get_or_create(regimen=regimen, defaults={'quantity_remaining': 0})
        stock.quantity_remaining += quantity
        stock.last_restocked_at = dj_timezone.now()
        stock.save()

        return Response(StockItemSerializer(stock).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'patch'], url_path='stock')
    def stock(self, request, pk=None):
        regimen = self.get_object()

        if request.method == 'PATCH':
            # Set the absolute stock quantity (a correction, distinct from
            # restock() which only ever adds to the existing count).
            # Frontend hits: PATCH /api/regimens/<id>/stock/  body: { current_quantity }
            raw_qty = request.data.get('current_quantity')
            try:
                quantity = int(raw_qty)
            except (TypeError, ValueError):
                return Response(
                    {'error': 'current_quantity must be a whole number'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if quantity < 0:
                return Response(
                    {'error': 'current_quantity cannot be negative'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            stock, _ = StockItem.objects.get_or_create(regimen=regimen, defaults={'quantity_remaining': 0})
            stock.quantity_remaining = quantity
            stock.save(update_fields=['quantity_remaining'])
            return Response(StockItemSerializer(stock).data, status=status.HTTP_200_OK)

        # GET
        stock = StockItem.objects.filter(regimen=regimen).first()
        if not stock:
            return Response({'quantity_remaining': 0}, status=status.HTTP_200_OK)
        return Response(StockItemSerializer(stock).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='stock/status')
    def stock_status(self, request, pk=None):
        """Return stock status for a regimen.

        Frontend hits:
          GET /api/regimens/<id>/stock/status/

        Response example:
          {"quantity_remaining": 5, "threshold": 5, "is_low_stock": false}
        """
        regimen = self.get_object()
        stock = StockItem.objects.filter(regimen=regimen).first()
        quantity_remaining = stock.quantity_remaining if stock else 0

        # Determine threshold from active StockAlert if present, else use 0.
        alert = StockAlert.objects.filter(regimen=regimen, is_active=True).first()
        threshold = alert.threshold if alert else 0

        return Response(
            {
                'quantity_remaining': quantity_remaining,
                'threshold': threshold,
                'is_low_stock': quantity_remaining <= threshold,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='stock/reorder-response')
    def reorder_response(self, request, pk=None):
        """Acknowledge (or dismiss) a low-stock alert for this regimen.

        Frontend hits:
          POST /api/regimens/<id>/stock/reorder-response/  body: { ordered: true|false }

        When ordered=true, the active low-stock alert is deactivated (so it
        stops showing up under /alerts/low-stock/) — the assumption being a
        refill is on the way. When ordered=false, the alert is left active
        so it keeps showing up as a reminder.
        """
        regimen = self.get_object()
        ordered = bool(request.data.get('ordered', False))

        alert = StockAlert.objects.filter(regimen=regimen, is_active=True).first()
        if alert and ordered:
            alert.is_active = False
            alert.save(update_fields=['is_active'])

        return Response(
            {'regimen': regimen.id, 'ordered': ordered, 'alert_acknowledged': bool(alert and ordered)},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'], url_path='calendar')
    def calendar(self, request, pk=None):
        regimen = self.get_object()

        start = request.query_params.get('start')
        end = request.query_params.get('end')
        if not start or not end:
            return Response(
                {'error': 'start and end are required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from datetime import datetime, timezone as dt_timezone

        try:
            start_dt = datetime.strptime(start, '%Y-%m-%d').replace(tzinfo=dt_timezone.utc)
            # end is inclusive; set to 23:59:59
            end_dt = datetime.strptime(end, '%Y-%m-%d').replace(tzinfo=dt_timezone.utc)
        except ValueError:
            return Response(
                {'error': 'start and end must be in YYYY-MM-DD format'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        end_dt = end_dt.replace(hour=23, minute=59, second=59)

        doses = RegimenDose.objects.filter(
            regimen=regimen,
            scheduled_at__gte=start_dt,
            scheduled_at__lte=end_dt,
        ).order_by('scheduled_at')

        grouped = {}
        for d in doses:
            day = d.scheduled_at.date().isoformat()
            grouped.setdefault(day, []).append({
                'id': d.id,
                'scheduled_at': d.scheduled_at.isoformat(),
                'status': d.status,
            })

        return Response({'start': start, 'end': end, 'calendar': grouped})



class StockAlertViewSet(viewsets.ModelViewSet):
    serializer_class = StockAlertSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only show alerts belonging to the logged-in user
        return StockAlert.objects.filter(regimen__user=self.request.user)

    def perform_create(self, serializer):
        regimen_id = self.request.data.get('regimen')
        regimen = Regimen.objects.get(id=regimen_id, user=self.request.user)
        serializer.save(regimen=regimen)

    # FIX: Added url_path='low-stock' to match the frontend request exactly
    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        """
        Returns alerts for medicines where current stock (StockItem.quantity_remaining)
        is less than or equal to that regimen's active alert threshold (StockAlert.threshold).

        NOTE: `current_quantity` / `low_stock_threshold_days` never existed on the
        Regimen model — quantity lives on StockItem (Regimen.stock, OneToOne) and the
        threshold lives on StockAlert (Regimen.stock_alerts, ForeignKey). This was
        causing a FieldError (500) on every call.
        """
        low_stock_alerts = StockAlert.objects.filter(
            regimen__user=request.user,
            is_active=True,
            regimen__stock__quantity_remaining__lte=models.F('threshold'),
        )

        serializer = self.get_serializer(low_stock_alerts, many=True)
        return Response(serializer.data)




class RegimenDoseViewSet(viewsets.ModelViewSet):
    queryset = RegimenDose.objects.none()
    serializer_class = RegimenDoseSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RegimenDose.objects.filter(regimen__user=self.request.user)

    # Custom actions for dose tracking
    @action(detail=True, methods=['post'], url_path='take')
    def take(self, request, pk=None):
        dose = self.get_object()
        dose.status = 'taken'
        dose.taken_at = dj_timezone.now()
        dose.missed_at = None
        dose.save(update_fields=['status', 'taken_at', 'missed_at'])
        return Response(RegimenDoseSerializer(dose).data)

    @action(detail=True, methods=['post'], url_path='missAction')
    def miss_action(self, request, pk=None):
        dose = self.get_object()
        dose.status = 'missed'
        dose.missed_at = dj_timezone.now()
        dose.taken_at = None
        dose.save(update_fields=['status', 'taken_at', 'missed_at'])
        return Response(RegimenDoseSerializer(dose).data)


# NOTE: Calendar endpoint moved to RegimenViewSet.calendar() (detail=True)
# This viewset is kept intentionally unused to avoid the old top-level route.