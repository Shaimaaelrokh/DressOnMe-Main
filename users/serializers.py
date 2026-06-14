from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Profile, ContactMessage, Country

class ProfileSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            'id', 'gender', 'image', 'cover_image',
            'tax_number', 'brand_name',
            'country', 'currency', 'age', 'product_type', 'payment_method',
            'favorite_colors', 'brand_year', 'brand_intro',
            'followers_count', 'is_following'
        )

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.followers.filter(id=request.user.id).exists()
        return False

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ('id', 'name', 'currency')

class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
        read_only_fields = ('created_at', 'is_read')

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'role', 'profile')
        read_only_fields = ('id',)

class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True, min_length=3)
    first_name = serializers.CharField(required=True, min_length=2)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    role = serializers.CharField(required=True)

    # Frontend matched fields
    age = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    gender = serializers.CharField(write_only=True, required=False, allow_blank=True)
    product_type = serializers.CharField(write_only=True, required=False, allow_blank=True)
    payment_method = serializers.CharField(write_only=True, required=False, allow_blank=True)
    favorite_colors = serializers.CharField(write_only=True, required=False, allow_blank=True)
    brand_year = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    brand_intro = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Optional legacy/seller fields
    tax_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    brand_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # New fields
    country = serializers.CharField(write_only=True, required=False, allow_blank=True)
    currency = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'password',
                  'role', 'age', 'gender', 'product_type', 'payment_method', 'favorite_colors',
                  'brand_year', 'brand_intro', 'tax_number', 'brand_name',
                  'country', 'currency')

    def validate_email(self, value):
        if not value or '@' not in value or '.' not in value:
            raise serializers.ValidationError("Please enter a valid email address.")
        return value.lower()

    def validate_username(self, value):
        if not value or len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        return value

    def validate_first_name(self, value):
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError("First name must be at least 2 characters long.")
        return value.strip()

    def validate_age(self, value):
        if value is not None:
            if value < 18 or value > 100:
                raise serializers.ValidationError("Age must be between 18 and 100.")
        return value

    def validate_gender(self, value):
        if value:
            valid_genders = ['Male', 'Female', 'Other']
            if value not in valid_genders:
                raise serializers.ValidationError(f"Gender must be one of: {', '.join(valid_genders)}.")
        return value

    def validate_payment_method(self, value):
        if value:
            valid_methods = ['Cash', 'Credit Card', 'PayPal', 'Bank Transfer']
            if value not in valid_methods:
                raise serializers.ValidationError(f"Payment method must be one of: {', '.join(valid_methods)}.")
        return value

    def validate_brand_year(self, value):
        if value is not None:
            current_year = 2026
            if value < 1900 or value > current_year:
                raise serializers.ValidationError(f"Brand year must be between 1900 and {current_year}.")
        return value

    def validate_role(self, value):
        if value:
            valid_roles = ['CUSTOMER', 'SELLER', 'ADMIN']
            value_upper = value.upper()
            if value_upper not in valid_roles:
                raise serializers.ValidationError(f"Role must be one of: {', '.join(valid_roles)}.")
            return value_upper
        return value

    def validate(self, data):
        # Custom password validation
        password = data.get('password')
        if password:
            errors = []
            if len(password) < 8:
                errors.append("Password must be at least 8 characters long.")
            if not any(char.isdigit() for char in password):
                errors.append("Password must contain at least one digit.")
            if not any(char.isupper() for char in password):
                errors.append("Password must contain at least one uppercase letter.")
            if not any(char.islower() for char in password):
                errors.append("Password must contain at least one lowercase letter.")
            if not any(char in '!@#$%^&*()_+-=[]{}|;:,.<>?' for char in password):
                errors.append("Password must contain at least one special character.")

            if errors:
                raise serializers.ValidationError({"password": errors})

        # Run Django's built-in strict password validators (length, common passwords, numeric, etc.)
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(data['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        # Check if email already exists
        email = data.get('email')
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})

        # Validate that seller has required fields
        role = data.get('role', '').upper()
        if role == 'SELLER':
            if not data.get('brand_name'):
                raise serializers.ValidationError({"brand_name": "Brand name is required for sellers."})
            if not data.get('product_type'):
                raise serializers.ValidationError({"product_type": "Product type is required for sellers."})
            if not data.get('payment_method'):
                raise serializers.ValidationError({"payment_method": "Payment method is required for sellers."})

        return data

    def create(self, validated_data):
        # Pop Profile fields
        profile_fields = [
            'age', 'gender', 'product_type', 'payment_method', 'favorite_colors',
            'brand_year', 'brand_intro', 'tax_number', 'brand_name', 'country', 'currency'
        ]
        profile_data = {}
        for field in profile_fields:
            if field in validated_data:
                profile_data[field] = validated_data.pop(field)
        
        username = validated_data['username']
        # Ensure username uniqueness
        if User.objects.filter(username=username).exists():
            import uuid
            username = f"{username}_{uuid.uuid4().hex[:6]}"

        user = User.objects.create_user(
            email=validated_data['email'],
            username=username,
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', User.Role.CUSTOMER)
        )
        
        profile = user.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        return data
