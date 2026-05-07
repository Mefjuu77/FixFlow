from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import get_user_model
import re

User = get_user_model()

def validate_name(value):
    if len(value.strip()) < 2:
        raise serializers.ValidationError("Wartość musi mieć co najmniej 2 znaki.")
    if not re.match(r'^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ \-]+$', value):
        raise serializers.ValidationError("Dozwolone są tylko litery, spacje i myślniki.")
    if re.search(r'(.)\1{2,}', value):
        raise serializers.ValidationError("Podano nieprawidłowy ciąg powtarzających się znaków.")
    return value.strip()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'first_name', 'last_name', 'avatar', 'is_active',
                  'notify_new_ticket', 'notify_ticket_comment', 'notify_ticket_status_change')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(validators=[validate_name])
    last_name = serializers.CharField(validators=[validate_name])
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Użytkownik z tym adresem e-mail już istnieje."
            )
        ]
    )

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
    first_name = serializers.CharField(validators=[validate_name], required=False)
    last_name = serializers.CharField(validators=[validate_name], required=False)
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Użytkownik z tym adresem e-mail już istnieje."
            )
        ]
    )

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'role', 'first_name', 'last_name', 'avatar', 'is_active')

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
    first_name = serializers.CharField(validators=[validate_name], required=False)
    last_name = serializers.CharField(validators=[validate_name], required=False)

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
