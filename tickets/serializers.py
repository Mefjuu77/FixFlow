from rest_framework import serializers
from .models import Category, Ticket, Comment, Attachment
from accounts.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

from django.contrib.auth import get_user_model
User = get_user_model()

class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploaded_by_details = UserSerializer(source='uploaded_by', read_only=True)

    class Meta:
        model = Attachment
        fields = ['id', 'ticket', 'comment', 'file', 'filename', 'url', 'uploaded_by', 'uploaded_by_details', 'created_at']
        read_only_fields = ('uploaded_by', 'created_at', 'filename')

    def get_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None

class TicketSerializer(serializers.ModelSerializer):
    # Dodajemy szczegóły twórcy oraz technika jako pole tylko do odczytu
    creator_details = UserSerializer(source='creator', read_only=True)
    technician_details = UserSerializer(source='technician', read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')
    attachments = AttachmentSerializer(many=True, read_only=True)
    creator = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False
    )

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'description', 'status', 'priority', 
            'category', 'category_name', 'creator', 'creator_details', 
            'technician', 'technician_details', 'attachments', 'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')

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


class CommentSerializer(serializers.ModelSerializer):
    author_details = UserSerializer(source='author', read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'ticket', 'author', 'author_details', 'content', 'comment_type', 'attachments', 'created_at']
        read_only_fields = ('author', 'ticket', 'created_at')

    def validate_content(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Treść komentarza nie może być pusta.')
        if len(cleaned) > 5000:
            raise serializers.ValidationError('Treść komentarza nie może przekraczać 5000 znaków.')
        return cleaned
