import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/lead_model.dart';
import '../models/remark_model.dart';
import '../models/reminder_model.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Get leads for current user only (Fixed index issue)
  Stream<List<LeadModel>> getLeads(String userId) {
    return _firestore
        .collection('leads')
        .where('createdBy', isEqualTo: userId)
        .snapshots()
        .map((snapshot) {
      final leads = snapshot.docs
          .map((doc) => LeadModel.fromMap(doc.data(), doc.id))
          .toList();

      // Sort in memory instead of using orderBy (avoids index requirement)
      leads.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return leads;
    });
  }

  // Check if lead with phone number already exists for this user
  Future<bool> isLeadDuplicate(String phoneNumber, String userId) async {
    final snapshot = await _firestore
        .collection('leads')
        .where('phone', isEqualTo: phoneNumber)
        .where('createdBy', isEqualTo: userId)
        .get();

    return snapshot.docs.isNotEmpty;
  }

  // Add new lead
  Future<void> addLead(LeadModel lead) async {
    await _firestore.collection('leads').add(lead.toMap());
  }

  // Update lead
  Future<void> updateLead(String leadId, LeadModel lead) async {
    await _firestore.collection('leads').doc(leadId).update(lead.toMap());
  }

  // Delete lead
  Future<void> deleteLead(String leadId) async {
    await _firestore.collection('leads').doc(leadId).delete();
  }

  // Add remark to lead (Fixed: Now preserves existing remarks)
  Future<void> addRemark(String leadId, RemarkModel remark, List<RemarkModel> existingRemarks) async {
    final updatedRemarks = List<RemarkModel>.from(existingRemarks)..add(remark);
    await _firestore.collection('leads').doc(leadId).update({
      'remarks': updatedRemarks.map((e) => e.toMap()).toList(),
    });
  }

  // Add reminder to lead (Fixed: Now preserves existing reminders)
  Future<void> addReminder(String leadId, ReminderModel reminder, List<ReminderModel> existingReminders) async {
    final updatedReminders = List<ReminderModel>.from(existingReminders)..add(reminder);
    await _firestore.collection('leads').doc(leadId).update({
      'reminders': updatedReminders.map((e) => e.toMap()).toList(),
    });
  }

  // Remove reminder from lead
  Future<void> removeReminder(String leadId, int reminderIndex, List<ReminderModel> existingReminders) async {
    final updatedReminders = List<ReminderModel>.from(existingReminders);
    updatedReminders.removeAt(reminderIndex);
    await _firestore.collection('leads').doc(leadId).update({
      'reminders': updatedReminders.map((e) => e.toMap()).toList(),
    });
  }

  // Assign lead to user
  Future<void> assignLead(String leadId, String userId) async {
    await _firestore.collection('leads').doc(leadId).update({
      'assignedTo': userId,
    });
  }

  // Get today's reminders
  Future<List<Map<String, dynamic>>> getTodayReminders() async {
    final snapshot = await _firestore.collection('leads').get();
    final List<Map<String, dynamic>> todayReminders = [];

    for (final doc in snapshot.docs) {
      final lead = LeadModel.fromMap(doc.data(), doc.id);
      for (final reminder in lead.reminders) {
        if (reminder.isToday) {
          todayReminders.add({
            'reminder': reminder,
            'leadName': lead.name,
            'leadId': lead.id,
          });
        }
      }
    }

    return todayReminders;
  }
}