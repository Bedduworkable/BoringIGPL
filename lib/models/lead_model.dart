import 'remark_model.dart';
import 'reminder_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

enum LeadStatus { newLead, followUp, visit, booked, dropped }

class LeadModel {
  final String id;
  final String name;
  final String phone;
  final String budget;
  final String location;
  final String propertyType;
  final String source;
  final LeadStatus status;
  final String createdBy; // User UID who created the lead
  final String assignedTo; // User UID who the lead is assigned to
  final String? masterUID; // Master UID derived from assignedTo user's master
  final String visibilityScope; // 'user', 'master', 'admin'
  final List<RemarkModel> remarks;
  final List<ReminderModel> reminders;
  final DateTime createdAt;
  final DateTime? assignedAt; // When lead was assigned to current user

  LeadModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.budget,
    required this.location,
    required this.propertyType,
    required this.source,
    required this.status,
    required this.createdBy,
    required this.assignedTo,
    this.masterUID,
    this.visibilityScope = 'user',
    required this.remarks,
    required this.reminders,
    required this.createdAt,
    this.assignedAt,
  });

  factory LeadModel.fromMap(Map<String, dynamic> map, String id) {
    return LeadModel(
      id: id,
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      budget: map['budget'] ?? 'Not specified',
      location: map['location'] ?? 'Not specified',
      propertyType: map['propertyType'] ?? 'Apartment',
      source: map['source'] ?? 'Website',
      status: LeadStatus.values.firstWhere(
            (e) => e.toString().split('.').last == (map['status'] ?? 'newLead'),
        orElse: () => LeadStatus.newLead,
      ),
      createdBy: map['createdBy'] ?? '',
      assignedTo: map['assignedTo'] ?? '',
      masterUID: map['masterUID'],
      visibilityScope: map['visibilityScope'] ?? 'user',
      remarks: (map['remarks'] as List<dynamic>?)
          ?.map((e) => RemarkModel.fromMap(e))
          .toList() ?? [],
      reminders: (map['reminders'] as List<dynamic>?)
          ?.map((e) => ReminderModel.fromMap(e))
          .toList() ?? [],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      assignedAt: (map['assignedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'phone': phone,
      'budget': budget,
      'location': location,
      'propertyType': propertyType,
      'source': source,
      'status': status.toString().split('.').last,
      'createdBy': createdBy,
      'assignedTo': assignedTo,
      'masterUID': masterUID,
      'visibilityScope': visibilityScope,
      'remarks': remarks.map((e) => e.toMap()).toList(),
      'reminders': reminders.map((e) => e.toMap()).toList(),
      'createdAt': Timestamp.fromDate(createdAt),
      'assignedAt': assignedAt != null ? Timestamp.fromDate(assignedAt!) : null,
    };
  }

  LeadModel copyWith({
    String? id,
    String? name,
    String? phone,
    String? budget,
    String? location,
    String? propertyType,
    String? source,
    LeadStatus? status,
    String? createdBy,
    String? assignedTo,
    String? masterUID,
    String? visibilityScope,
    List<RemarkModel>? remarks,
    List<ReminderModel>? reminders,
    DateTime? createdAt,
    DateTime? assignedAt,
  }) {
    return LeadModel(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      budget: budget ?? this.budget,
      location: location ?? this.location,
      propertyType: propertyType ?? this.propertyType,
      source: source ?? this.source,
      status: status ?? this.status,
      createdBy: createdBy ?? this.createdBy,
      assignedTo: assignedTo ?? this.assignedTo,
      masterUID: masterUID ?? this.masterUID,
      visibilityScope: visibilityScope ?? this.visibilityScope,
      remarks: remarks ?? this.remarks,
      reminders: reminders ?? this.reminders,
      createdAt: createdAt ?? this.createdAt,
      assignedAt: assignedAt ?? this.assignedAt,
    );
  }

  String get statusText {
    switch (status) {
      case LeadStatus.newLead:
        return 'New';
      case LeadStatus.followUp:
        return 'Follow-up';
      case LeadStatus.visit:
        return 'Visit';
      case LeadStatus.booked:
        return 'Booked';
      case LeadStatus.dropped:
        return 'Dropped';
    }
  }

  // Helper methods for role-based access
  bool canBeViewedBy(String userUID, String userRole, String? userMasterUID) {
    // Admin can see all leads
    if (userRole == 'admin') return true;

    // Master can see leads from their users
    if (userRole == 'master' && masterUID == userUID) return true;

    // User can see only their assigned leads
    if (userRole == 'user' && assignedTo == userUID) return true;

    return false;
  }

  bool canBeEditedBy(String userUID, String userRole, String? userMasterUID) {
    // Admin can edit all leads
    if (userRole == 'admin') return true;

    // Master can edit leads from their users
    if (userRole == 'master' && masterUID == userUID) return true;

    // User can edit only their assigned leads
    if (userRole == 'user' && assignedTo == userUID) return true;

    return false;
  }
}