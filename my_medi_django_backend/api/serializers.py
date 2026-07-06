from rest_framework import serializers
from .models import (
    Profile,
    Medicine,
    Regimen,
    RegimenDose,
    StockItem,
    StockAlert,
)
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import datetime

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm')

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    is_email_verified = serializers.BooleanField(source='user.is_email_verified', read_only=True)

    class Meta:
        model = Profile
        fields = '__all__'


class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = '__all__'


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RegimenSerializer(serializers.ModelSerializer):
    dose_times = serializers.ListField(child=serializers.DictField(), write_only=True, required=True)
    stock = serializers.DictField(write_only=True, required=True)

    dose_times_detail = serializers.SerializerMethodField()
    stock_detail = serializers.SerializerMethodField()
    medicine_detail = MedicineSerializer(source='medicine', read_only=True)

    class Meta:
        model = Regimen
        fields = '__all__'
        read_only_fields = ('user', 'created_at')

    def get_dose_times_detail(self, obj):
        return [
            {'id': d.id, 'time': d.scheduled_at.strftime('%H:%M:%S'), 'quantity': d.quantity, 'unit': d.unit}
            for d in obj.doses.all()
        ]

    def get_stock_detail(self, obj):
        stock = getattr(obj, 'stock', None)
        if not stock:
            return None
        return {'current_quantity': stock.quantity_remaining, 'unit': stock.unit}

    @transaction.atomic
    def create(self, validated_data):
        dose_times = validated_data.pop('dose_times')
        stock_data = validated_data.pop('stock')
        request = self.context['request']

        regimen = Regimen.objects.create(user=request.user, **validated_data)

        start_date = regimen.start_date or datetime.now().date()

        for dt in dose_times:
            hour, minute = dt['time'].split(':')[:2]
            scheduled_at = datetime.combine(
                start_date,
                datetime.min.time().replace(hour=int(hour), minute=int(minute))
            )
            RegimenDose.objects.create(
                regimen=regimen,
                scheduled_at=scheduled_at,
                quantity=dt.get('quantity', 1),
                unit=dt.get('unit', 'TABLET'),
            )

        StockItem.objects.create(
            regimen=regimen,
            quantity_remaining=stock_data.get('current_quantity', 0),
            unit=stock_data.get('unit', 'TABLET'),
        )

        StockAlert.objects.create(
            regimen=regimen,
            threshold=stock_data.get('low_stock_threshold_days', 5),
        )

        return regimen


class RegimenDoseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegimenDose
        fields = '__all__'
        read_only_fields = ('created_at', 'taken_at', 'missed_at', 'status')


class StockItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockItem
        fields = '__all__'
        read_only_fields = ('last_restocked_at',)


class StockAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockAlert
        fields = '__all__'
        read_only_fields = ('created_at',)