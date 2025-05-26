import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

final userServiceProvider = Provider<AuthService>((ref) => AuthService());

final allUsersProvider = FutureProvider<List<UserModel>>((ref) async {
  final authService = ref.watch(userServiceProvider);
  return authService.getAllUsers();
});

final userByIdProvider = FutureProvider.family<UserModel?, String>((ref, userId) async {
  final authService = ref.watch(userServiceProvider);
  return authService.getUserData(userId);
});

class UserNotifier extends StateNotifier<AsyncValue<List<UserModel>>> {
  final AuthService _authService;

  UserNotifier(this._authService) : super(const AsyncValue.loading()) {
    loadUsers();
  }

  Future<void> loadUsers() async {
    state = const AsyncValue.loading();
    try {
      final users = await _authService.getAllUsers();
      state = AsyncValue.data(users);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<UserModel?> getUserById(String userId) async {
    try {
      return await _authService.getUserData(userId);
    } catch (e) {
      return null;
    }
  }
}

final userNotifierProvider = StateNotifierProvider<UserNotifier, AsyncValue<List<UserModel>>>((ref) {
  final authService = ref.watch(userServiceProvider);
  return UserNotifier(authService);
});