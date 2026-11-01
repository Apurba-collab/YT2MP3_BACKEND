# YT Audio

## Backend
cp .env.example .env        # edit values
docker compose up -d --build
docker compose exec web python manage.py createsuperuser
# Put Caddy/Nginx (HTTPS) in front of port 8000.
# Schedule api.tasks.cleanup_old_files daily (Celery beat or cron).

## Mobile (Expo SDK 57)
cd mobile
npx expo install expo@^57 expo-router react react-native react-native-safe-area-context \
  react-native-screens expo-secure-store expo-file-system expo-sharing expo-clipboard \
  expo-haptics expo-status-bar expo-linking expo-constants
cp .env.example .env        # set EXPO_PUBLIC_API_URL (Android emulator dev: http://10.0.2.2:8000)
npx expo start
# Release: npm i -g eas-cli && eas build -p android --profile production
