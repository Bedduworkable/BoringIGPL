import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/lead_model.dart';
import '../models/remark_model.dart';
import '../models/reminder_model.dart';
import '../services/firestore_service.dart';
import 'auth_provider.dart';

final firestoreServiceProvider = Provider<FirestoreService>((ref) => FirestoreService());

final leadsProvider = StreamProvider<List<LeadModel>>((ref) {
  final firestoreService = ref.watch(firestoreServiceProvider);
  final authState = ref.watch(authProvider);

  return authState.when(
    data: (user) {
      if (user != null) {
        return firestoreService.getLeads(user.uid);
      } else {
        return Stream.value(<LeadModel>[]);
      }
    },
    loading: () => Stream.value(<LeadModel>[]),
    error: (_, __) => Stream.value(<LeadModel>[]),
  );
});

final todayRemindersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final firestoreService = ref.watch(firestoreServiceProvider);
  return firestoreService.getTodayReminders();
});

class LeadsNotifier extends StateNotifier<AsyncValue<void>> {
  final FirestoreService _firestoreService;

  LeadsNotifier(this._firestoreService) : super(const AsyncValue.data(null));

  Future<void> addLead(LeadModel lead) async {
    state = const AsyncValue.loading();
    try {
      // Check for duplicate
      final isDuplicate = await _firestoreService.isLeadDuplicate(lead.phone, lead.createdBy);
      if (isDuplicate) {
        throw 'Lead already exists with this phone number';
      }

      await _firestoreService.addLead(lead);
      state = const AsyncValue.data(null);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
      rethrow; // Re-throw to show error in UI
    }
  }

  Future<void> updateLead(String leadId, LeadModel lead) async {
    state = const AsyncValue.loading();
    try {
      await _firestoreService.updateLead(leadId, lead);
      state = const AsyncValue.data(null);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> deleteLead(String leadId) async {
    state = const AsyncValue.loading();
    try {
      await _firestoreService.deleteLead(leadId);
      state = const AsyncValue.data(null);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> addRemark(String leadId, RemarkModel remark, List<RemarkModel> existingRemarks) async {
    try {
      await _firestoreService.addRemark(leadId, remark, existingRemarks);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> addReminder(String leadId, ReminderModel reminder, List<ReminderModel> existingReminders) async {
    try {
      await _firestoreService.addReminder(leadId, reminder, existingReminders);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> removeReminder(String leadId, int reminderIndex, List<ReminderModel> existingReminders) async {
    try {
      await _firestoreService.removeReminder(leadId, reminderIndex, existingReminders);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> assignLead(String leadId, String userId) async {
    try {
      await _firestoreService.assignLead(leadId, userId);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}

final leadsNotifierProvider = StateNotifierProvider<LeadsNotifier, AsyncValue<void>>((ref) {
  final firestoreService = ref.watch(firestoreServiceProvider);
  return LeadsNotifier(firestoreService);
});