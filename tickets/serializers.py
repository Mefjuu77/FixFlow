from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Category, Ticket, Comment, Attachment, TicketLog, WorkLog
from accounts.serializers import UserSerializer

User = get_user_model()

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

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

class TicketListSerializer(serializers.ModelSerializer):
    """Lekki serializer dla widoku listy — bez opisu i załączników."""
    creator_details = UserSerializer(source='creator', read_only=True)
    technician_details = UserSerializer(source='technician', read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'status', 'priority',
            'category', 'category_name', 'creator', 'creator_details',
            'technician', 'technician_details',
            'resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at', 'resolved_at')


class TicketSerializer(serializers.ModelSerializer):
    """Pełny serializer dla widoku szczegółowego — z opisem i załącznikami."""
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
            'technician', 'technician_details', 'attachments', 
            'resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at', 'resolved_at')

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


class TicketLogSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = TicketLog
        fields = ['id', 'ticket', 'user', 'user_details', 'action', 'action_display', 'old_value', 'new_value', 'created_at']
        read_only_fields = ('__all__',)


class WorkLogSerializer(serializers.ModelSerializer):
    author_details = UserSerializer(source='author', read_only=True)

    class Meta:
        model = WorkLog
        fields = ['id', 'ticket', 'author', 'author_details', 'description', 'duration_minutes', 'created_at']
        read_only_fields = ('author', 'ticket', 'created_at')

    def validate_description(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Opis wykonanej pracy nie może być pusty.')
        if len(cleaned) > 2000:
            raise serializers.ValidationError('Opis nie może przekraczać 2000 znaków.')
        return cleaned

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError('Czas pracy musi być większy od 0.')
        if value > 1440:
            raise serializers.ValidationError('Czas pracy nie może przekraczać 24h (1440 min).')
        return value
