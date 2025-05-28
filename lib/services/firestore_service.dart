// Auto-add assignment remark with proper user name resolution
Future<void> _addAssignmentRemark(String leadId, String assignedToUID, String createdByUID) async {
  try {
    final [assignedUserDoc, createdByUserDoc] = await Future.wait([
      _firestore.collection('users').doc(assignedToUID).get(),
      _firestore.collection('users').doc(createdByUID).get(),
    ]);

    final assignedUserName = assignedUserDoc.exists ?
    UserModel.fromMap(assignedUserDoc.data()!, assignedUserDoc.id).name :
    'Unknown User';

    final createdByUserName = createdByUserDoc.exists ?
    UserModel.fromMap(createdByUserDoc.data()!, createdByUserDoc.id).name :
    'Unknown User';

    final assignmentRemark = RemarkModel(
      text: "📋 Lead assigned to $assignedUserName by $createdByUserName",
      by: createdByUserName,
      timestamp: DateTime.now(),
    );

    // Get current lead data to append to existing remarks
    final leadDoc = await _firestore.collection('leads').doc(leadId).get();
    if (leadDoc.exists) {
      final lead = LeadModel.fromMap(leadDoc.data()!, leadId);
      await addRemark(leadId, assignmentRemark, lead.remarks);
    }
  } catch (e) {
    print("❌ Error adding assignment remark: $import 'package:cloud_firestore/cloud_firestore.dart';
        import '../models/lead_model.dart';
        import '../models/remark_model.dart';
        import '../models/reminder_model.dart';
        import '../models/user_model.dart';

        class FirestoreService {
        final FirebaseFirestore _firestore = FirebaseFirestore.instance;

        // Get leads based on user role and hierarchy
        Stream<List<LeadModel>> getLeads(String userId, String userRole, String? userMasterUID) {
        Query<Map<String, dynamic>> query;

        switch (userRole) {
        case 'admin':
        // Admin sees all leads
        query = _firestore.collection('leads');
        break;

        case 'master':
        // Master sees leads from all their users
        query = _firestore
            .collection('leads')
            .where('masterUID', isEqualTo: userId);
        break;

        case 'user':
        // User sees only their assigned leads
        query = _firestore
            .collection('leads')
            .where('assignedTo', isEqualTo: userId);
        break;

        default:
        // Default to empty query
        return Stream.value([]);
        }

        return query.snapshots().map((snapshot) {
        final leads = snapshot.docs
            .map((doc) => LeadModel.fromMap(doc.data(), doc.id))
            .toList();

        // Sort by creation date (newest first)
        leads.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        return leads;
        });
        }

        // Check if lead with phone number already exists (role-based)
        Future<bool> isLeadDuplicate(String phoneNumber, String userId, String userRole, String? userMasterUID) async {
        Query<Map<String, dynamic>> query;

        switch (userRole) {
        case 'admin':
        // Admin checks across all leads
        query = _firestore
            .collection('leads')
            .where('phone', isEqualTo: phoneNumber);
        break;

        case 'master':
        // Master checks within their users' leads
        query = _firestore
            .collection('leads')
            .where('phone', isEqualTo: phoneNumber)
            .where('masterUID', isEqualTo: userId);
        break;

        case 'user':
        // User checks only their own leads
        query = _firestore
            .collection('leads')
            .where('phone', isEqualTo: phoneNumber)
            .where('assignedTo', isEqualTo: userId);
        break;

        default:
        return false;
        }

        final snapshot = await query.get();
        return snapshot.docs.isNotEmpty;
        }

        // Add new lead with proper master hierarchy
        Future<void> addLead(LeadModel lead, String createdByUserRole, String? createdByMasterUID) async {
        // Get assigned user's master UID if assignedTo is a user
        String? assignedUserMasterUID;
        if (lead.assignedTo.isNotEmpty) {
        final assignedUserDoc = await _firestore.collection('users').doc(lead.assignedTo).get();
        if (assignedUserDoc.exists) {
        final assignedUser = UserModel.fromMap(assignedUserDoc.data()!, assignedUserDoc.id);
        if (assignedUser.isUser) {
        assignedUserMasterUID = assignedUser.masterUID;
        } else if (assignedUser.isMaster) {
        assignedUserMasterUID = assignedUser.uid;
        }
        }
        }

        // Determine visibility scope and master UID
        String visibilityScope;
        String? masterUID;

        if (createdByUserRole == 'admin') {
        visibilityScope = 'admin';
        masterUID = assignedUserMasterUID;
        } else if (createdByUserRole == 'master') {
        visibilityScope = 'master';
        masterUID = createdByMasterUID;
        } else {
        visibilityScope = 'user';
        masterUID = createdByMasterUID;
        }

        final leadWithHierarchy = lead.copyWith(
        masterUID: masterUID,
        visibilityScope: visibilityScope,
        assignedAt: DateTime.now(),
        );

        await _firestore.collection('leads').add(leadWithHierarchy.toMap());

        // Auto-add assignment remark with proper user name resolution
        Future<void> _addAssignmentRemark(String leadId, String assignedToUID, String createdByUID) async {
        try {
        final [assignedUserDoc, createdByUserDoc] = await Future.wait([
        _firestore.collection('users').doc(assignedToUID).get(),
        _firestore.collection('users').doc(createdByUID).get(),
        ]);

        final assignedUserName = assignedUserDoc.exists ?
        UserModel.fromMap(assignedUserDoc.data()!, assignedUserDoc.id).name :
        'Unknown User';

        final createdByUserName = createdByUserDoc.exists ?
        UserModel.fromMap(createdByUserDoc.data()!, createdByUserDoc.id).name :
        'Unknown User';

        final assignmentRemark = RemarkModel(
        text: "📋 Lead assigned to $assignedUserName by $createdByUserName",
        by: createdByUserName,
        timestamp: DateTime.now(),
        );

        // Get current lead data to append to existing remarks
        final leadDoc = await _firestore.collection('leads').doc(leadId).get();
        if (leadDoc.exists) {
        final lead = LeadModel.fromMap(leadDoc.data()!, leadId);
        await addRemark(leadId, assignmentRemark, lead.remarks);
        }
        } catch (e) {
        print("❌ Error adding assignment remark: $e");
        // Don't throw - assignment remark is not critical
        }
        }
        }

        // Update lead with hierarchy checks
        Future<void> updateLead(String leadId, LeadModel lead) async {
        // Check if assignedTo changed
        final existingDoc = await _firestore.collection('leads').doc(leadId).get();
        if (existingDoc.exists) {
        final existingLead = LeadModel.fromMap(existingDoc.data()!, leadId);

        // If assignment changed, update master UID and add remark
        if (existingLead.assignedTo != lead.assignedTo) {
        // Get new assigned user's master UID
        String? newMasterUID;
        if (lead.assignedTo.isNotEmpty) {
        final assignedUserDoc = await _firestore.collection('users').doc(lead.assignedTo).get();
        if (assignedUserDoc.exists) {
        final assignedUser = UserModel.fromMap(assignedUserDoc.data()!, assignedUserDoc.id);
        if (assignedUser.isUser) {
        newMasterUID = assignedUser.masterUID;
        } else if (assignedUser.isMaster) {
        newMasterUID = assignedUser.uid;
        }
        }
        }

        final updatedLead = lead.copyWith(
        masterUID: newMasterUID,
        assignedAt: DateTime.now(),
        );

        await _firestore.collection('leads').doc(leadId).update(updatedLead.toMap());

        // Add reassignment remark
        final assignedUserDoc = await _firestore.collection('users').doc(lead.assignedTo).get();
        final assignedUserName = assignedUserDoc.exists ?
        UserModel.fromMap(assignedUserDoc.data()!, assignedUserDoc.id).name :
        'Unknown User';

        final reassignmentRemark = RemarkModel(
        text: "🔄 Lead reassigned to $assignedUserName",
        by: "System",
        timestamp: DateTime.now(),
        );

        await addRemark(leadId, reassignmentRemark, existingLead.remarks);
        } else {
        // Regular update without assignment change
        await _firestore.collection('leads').doc(leadId).update(lead.toMap());
        }

        // Add status change remark if status changed
        if (existingLead.status != lead.status) {
        final statusRemark = RemarkModel(
        text: "📊 Status changed from ${existingLead.statusText} to ${lead.statusText}",
        by: "System",
        timestamp: DateTime.now(),
        );

        await addRemark(leadId, statusRemark, lead.remarks);
        }
        } else {
        // Lead doesn't exist, create new one
        await _firestore.collection('leads').doc(leadId).set(lead.toMap());
        }
        }

        // Delete lead
        Future<void> deleteLead(String leadId) async {
        await _firestore.collection('leads').doc(leadId).delete();
        }

        // Add remark with auto-logging
        Future<void> addRemark(String leadId, RemarkModel remark, List<RemarkModel> existingRemarks) async {
        final updatedRemarks = List<RemarkModel>.from(existingRemarks)..add(remark);
        await _firestore.collection('leads').doc(leadId).update({
        'remarks': updatedRemarks.map((e) => e.toMap()).toList(),
        });
        }

        // Add reminder with auto-logging
        Future<void> addReminder(String leadId, ReminderModel reminder, List<ReminderModel> existingReminders) async {
        final updatedReminders = List<ReminderModel>.from(existingReminders)..add(reminder);
        await _firestore.collection('leads').doc(leadId).update({
        'reminders': updatedReminders.map((e) => e.toMap()).toList(),
        });
        }

        // Remove reminder
        Future<void> removeReminder(String leadId, int reminderIndex, List<ReminderModel> existingReminders) async {
        final updatedReminders = List<ReminderModel>.from(existingReminders);
        updatedReminders.removeAt(reminderIndex);
        await _firestore.collection('leads').doc(leadId).update({
        'reminders': updatedReminders.map((e) => e.toMap()).toList(),
        });
        }

        // Assign lead to user (with proper hierarchy)
        Future<void> assignLead(String leadId, String userId) async {
        // Get user details to determine master UID
        final userDoc = await _firestore.collection('users').doc(userId).get();
        if (!userDoc.exists) {
        throw 'User not found';
        }

        final user = UserModel.fromMap(userDoc.data()!, userId);
        String? masterUID;

        if (user.isUser) {
        masterUID = user.masterUID;
        } else if (user.isMaster) {
        masterUID = user.uid;
        }

        await _firestore.collection('leads').doc(leadId).update({
        'assignedTo': userId,
        'masterUID': masterUID,
        'assignedAt': FieldValue.serverTimestamp(),
        });

        // Add assignment remark
        final assignmentRemark = RemarkModel(
        text: "📋 Lead assigned to ${user.name}",
        by: "System",
        timestamp: DateTime.now(),
        );

        final leadDoc = await _firestore.collection('leads').doc(leadId).get();
        if (leadDoc.exists) {
        final lead = LeadModel.fromMap(leadDoc.data()!, leadId);
        await addRemark(leadId, assignmentRemark, lead.remarks);
        }
        }

        // Get today's reminders (role-based)
        Future<List<Map<String, dynamic>>> getTodayReminders(String userId, String userRole, String? userMasterUID) async {
        Query<Map<String, dynamic>> query;

        switch (userRole) {
        case 'admin':
        query = _firestore.collection('leads');
        break;
        case 'master':
        query = _firestore.collection('leads').where('masterUID', isEqualTo: userId);
        break;
        case 'user':
        query = _firestore.collection('leads').where('assignedTo', isEqualTo: userId);
        break;
        default:
        return [];
        }

        final snapshot = await query.get();
        final List<Map<String, dynamic>> todayReminders = [];

        for (final doc in snapshot.docs) {
        final lead = LeadModel.fromMap(doc.data(), doc.id);
        for (final reminder in lead.reminders) {
        if (reminder.isToday && reminder.isOpen) {
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

        // Get role-based statistics
        Future<Map<String, dynamic>> getStatistics(String userId, String userRole, String? userMasterUID) async {
        Query<Map<String, dynamic>> query;

        switch (userRole) {
        case 'admin':
        query = _firestore.collection('leads');
        break;
        case 'master':
        query = _firestore.collection('leads').where('masterUID', isEqualTo: userId);
        break;
        case 'user':
        query = _firestore.collection('leads').where('assignedTo', isEqualTo: userId);
        break;
        default:
        return {
        'totalLeads': 0,
        'newLeads': 0,
        'followUps': 0,
        'bookings': 0,
        'todayLeads': 0,
        };
        }

        final snapshot = await query.get();
        final leads = snapshot.docs.map((doc) => LeadModel.fromMap(doc.data(), doc.id)).toList();

        final today = DateTime.now();
        final startOfDay = DateTime(today.year, today.month, today.day);

        return {
        'totalLeads': leads.length,
        'newLeads': leads.where((l) => l.status == LeadStatus.newLead).length,
        'followUps': leads.where((l) => l.status == LeadStatus.followUp).length,
        'bookings': leads.where((l) => l.status == LeadStatus.booked).length,
        'todayLeads': leads.where((l) => l.createdAt.isAfter(startOfDay)).length,
        };
        }
        }