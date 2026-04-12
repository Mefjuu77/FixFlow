from rest_framework import serializers
from .models import Category, Ticket
from accounts.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class TicketSerializer(serializers.ModelSerializer):
    # Dodajemy szczegóły twórcy oraz technika jako pole tylko do odczytu
    creator_details = UserSerializer(source='creator', read_only=True)
    technician_details = UserSerializer(source='technician', read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'description', 'status', 'priority', 
            'category', 'category_name', 'creator', 'creator_details', 
            'technician', 'technician_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ('creator', 'created_at', 'updated_at')

    def validate_title(self, value):
        cleaned = value.strip()
        if len(cleaned) < 5:
            raise serializers.ValidationError('Tytuł musi mieć co najmniej 5 znaków.')
        if len(cleaned) > 200:
            raise serializers.ValidationError('Tytuł nie może przekraczać 200 znaków.')
        return cleaned

    def validate_description(self, value):
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise serializers.ValidationError('Opis musi mieć co najmniej 10 znaków.')
        return cleaned

