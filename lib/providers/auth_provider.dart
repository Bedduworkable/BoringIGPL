import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/local_storage_service.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final authProvider = StreamProvider<User?>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.authStateChanges;
});

final currentUserProvider = FutureProvider<UserModel?>((ref) async {
  final auth = ref.watch(authProvider);
  return auth.when(
    data: (user) async {
      if (user != null) {
        final authService = ref.watch(authServiceProvider);
        final userData = await authService.getUserData(user.uid);
        if (userData != null) {
          await LocalStorageService.saveUserSession(
            userId: userData.uid,
            email: userData.email,
            name: userData.name,
          );
        }
        return userData;
      }
      return null;
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

final allUsersProvider = FutureProvider<List<UserModel>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return authService.getAllUsers();
});

class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final AuthService _authService;

  AuthNotifier(this._authService) : super(const AsyncValue.loading());

  Future<void> signIn(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final user = await _authService.signInWithEmailAndPassword(email, password);
      state = AsyncValue.data(user);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> register(String email, String password, String name) async {
    state = const AsyncValue.loading();
    try {
      final user = await _authService.registerWithEmailAndPassword(email, password, name);
      state = AsyncValue.data(user);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> signOut() async {
    await _authService.signOut();
    await LocalStorageService.clearUserSession();
    state = const AsyncValue.data(null);
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});