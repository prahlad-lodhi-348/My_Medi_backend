from rest_framework import serializers
from django.db import transaction
from .models import (
    RegimenMedicine,
    Regimen,
    DoseTime,
    Stock,
    IntakeLog,
    Caregiver,
)


class RegimenMedicineCreateSerializer(serializers.ModelSerializer):
    form = serializers.CharField(required=False, allow_blank=True, default='TABLET')
    strength = serializers.CharField(required=False, allow_blank=True, default='Not specified')
    brand = serializers.CharField(required=False, allow_blank=True, default='')
    description = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    
    class Meta:
        model = RegimenMedicine
        fields = [
            'name', 'form', 'strength',
            'brand', 'description', 'image',
            'notes',
        ]


class DoseTimeCreateSerializer(serializers.ModelSerializer):
    label = serializers.CharField(required=False, allow_blank=True, default='')
    
    class Meta:
        model = DoseTime
        fields = ['time', 'label', 'quantity', 'unit', 'days_of_week']
        extra_kwargs = {
            'days_of_week': {'required': False}
        }


class StockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['current_quantity', 'unit', 'low_stock_threshold_days', 'reorder_url']


class RegimenCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Regimen
        fields = ['medicine', 'start_date', 'end_date', 'instructions', 'is_active']


class RegimenMedicineReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegimenMedicine
        fields = [
            'id', 'name', 'form', 'strength',
            'brand', 'description', 'image',
            'notes', 'created_at',
        ]


class DoseTimeReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoseTime
        fields = ['id', 'time', 'label', 'quantity', 'unit', 'days_of_week']


class StockReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = [
            'current_quantity', 'unit', 'low_stock_threshold_days',
            'reorder_url', 'last_low_stock_seen_at',
            'last_reorder_response', 'last_reorder_response_at',
        ]


class RegimenReadSerializer(serializers.ModelSerializer):
    medicine = RegimenMedicineReadSerializer(read_only=True)
    dose_times = DoseTimeReadSerializer(many=True, read_only=True)
    stock = StockReadSerializer(read_only=True)

    class Meta:
        model = Regimen
        fields = [
            'id', 'medicine', 'start_date', 'end_date',
            'instructions', 'is_active', 'created_at',
            'dose_times', 'stock',
        ]


class IntakeUpsertSerializer(serializers.ModelSerializer):
    regimen = serializers.PrimaryKeyRelatedField(queryset=Regimen.objects.all())
    dose_time = serializers.PrimaryKeyRelatedField(queryset=DoseTime.objects.all())

    class Meta:
        model = IntakeLog
        fields = [
            'id', 'regimen', 'dose_time', 'date',
            'status', 'taken_at', 'quantity', 'unit',
        ]
        read_only_fields = ['id', 'taken_at']


class StockPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = [
            'current_quantity', 'unit',
            'low_stock_threshold_days', 'reorder_url',
        ]


class StockRestockSerializer(serializers.Serializer):
    add_quantity = serializers.DecimalField(max_digits=10, decimal_places=2)


class StockReorderResponseSerializer(serializers.Serializer):
    ordered = serializers.BooleanField()


class CaregiverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caregiver
        fields = [
            'id', 'patient', 'name', 'phone', 'relationship',
            'notify_on_missed', 'notify_on_low_stock',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'patient', 'created_at']


class RegimenWizardSerializer(serializers.Serializer):
    medicine = RegimenMedicineCreateSerializer()
    start_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)
    dose_times = DoseTimeCreateSerializer(many=True)
    stock = StockCreateSerializer()

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['user']
        medicine_data = validated_data.pop('medicine')
        dose_times_data = validated_data.pop('dose_times')
        stock_data = validated_data.pop('stock')

        name = medicine_data.pop('name')

        medicine = RegimenMedicine.objects.filter(
            user=user,
            name__iexact=name
        ).first()

        if not medicine:
            medicine = RegimenMedicine.objects.create(
                user=user,
                name=name,
                **medicine_data
            )

        regimen = Regimen.objects.create(user=user, medicine=medicine, **validated_data)

        for dt_data in dose_times_data:
            # Remove days_of_week if it's None so model default is used
            if dt_data.get('days_of_week') is None:
                dt_data.pop('days_of_week', None)
            DoseTime.objects.create(regimen=regimen, **dt_data)

        Stock.objects.create(regimen=regimen, **stock_data)

        return regimen

