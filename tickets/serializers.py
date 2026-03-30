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
