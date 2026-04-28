from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'first_name', 'last_name', 'avatar', 
                  'notify_new_ticket', 'notify_ticket_comment', 'notify_ticket_status_change')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'role', 'first_name', 'last_name', 'avatar')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'role', 'first_name', 'last_name', 'avatar')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer do aktualizacji własnego profilu.
    Pozwala zmieniać tylko imię, nazwisko i avatar.
    """
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'avatar',
                  'notify_new_ticket', 'notify_ticket_comment', 'notify_ticket_status_change')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Obecne hasło jest nieprawidłowe.")
        return value
