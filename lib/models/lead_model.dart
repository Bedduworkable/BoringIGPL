import 'remark_model.dart';
import 'reminder_model.dart';

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
  final String createdBy;
  final String assignedTo;
  final List<RemarkModel> remarks;
  final List<ReminderModel> reminders;
  final DateTime createdAt;

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
    required this.remarks,
    required this.reminders,
    required this.createdAt,
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
      remarks: (map['remarks'] as List<dynamic>?)
          ?.map((e) => RemarkModel.fromMap(e))
          .toList() ?? [],
      reminders: (map['reminders'] as List<dynamic>?)
          ?.map((e) => ReminderModel.fromMap(e))
          .toList() ?? [],
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['createdAt'] ?? DateTime.now().millisecondsSinceEpoch),
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
      'remarks': remarks.map((e) => e.toMap()).toList(),
      'reminders': reminders.map((e) => e.toMap()).toList(),
      'createdAt': createdAt.millisecondsSinceEpoch,
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
    List<RemarkModel>? remarks,
    List<ReminderModel>? reminders,
    DateTime? createdAt,
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
      remarks: remarks ?? this.remarks,
      reminders: reminders ?? this.reminders,
      createdAt: createdAt ?? this.createdAt,
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
}