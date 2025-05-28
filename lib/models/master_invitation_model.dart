import 'package:cloud_firestore/cloud_firestore.dart';

class MasterInvitationModel {
  final String id;
  final String fromUserUID;
  final String fromUserName;
  final String fromUserEmail;
  final String toMasterUID;
  final String toMasterName;
  final String toMasterEmail;
  final String status; // 'pending', 'accepted', 'declined'
  final DateTime createdAt;
  final DateTime? respondedAt;
  final String? message; // Optional message from user

  MasterInvitationModel({
    required this.id,
    required this.fromUserUID,
    required this.fromUserName,
    required this.fromUserEmail,
    required this.toMasterUID,
    required this.toMasterName,
    required this.toMasterEmail,
    this.status = 'pending',
    required this.createdAt,
    this.respondedAt,
    this.message,
  });

  factory MasterInvitationModel.fromMap(Map<String, dynamic> map, String id) {
    return MasterInvitationModel(
      id: id,
      fromUserUID: map['fromUserUID'] ?? '',
      fromUserName: map['fromUserName'] ?? '',
      fromUserEmail: map['fromUserEmail'] ?? '',
      toMasterUID: map['toMasterUID'] ?? '',
      toMasterName: map['toMasterName'] ?? '',
      toMasterEmail: map['toMasterEmail'] ?? '',
      status: map['status'] ?? 'pending',
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      respondedAt: (map['respondedAt'] as Timestamp?)?.toDate(),
      message: map['message'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'fromUserUID': fromUserUID,
      'fromUserName': fromUserName,
      'fromUserEmail': fromUserEmail,
      'toMasterUID': toMasterUID,
      'toMasterName': toMasterName,
      'toMasterEmail': toMasterEmail,
      'status': status,
      'createdAt': Timestamp.fromDate(createdAt),
      'respondedAt': respondedAt != null ? Timestamp.fromDate(respondedAt!) : null,
      'message': message,
    };
  }

  MasterInvitationModel copyWith({
    String? id,
    String? fromUserUID,
    String? fromUserName,
    String? fromUserEmail,
    String? toMasterUID,
    String? toMasterName,
    String? toMasterEmail,
    String? status,
    DateTime? createdAt,
    DateTime? respondedAt,
    String? message,
  }) {
    return MasterInvitationModel(
      id: id ?? this.id,
      fromUserUID: fromUserUID ?? this.fromUserUID,
      fromUserName: fromUserName ?? this.fromUserName,
      fromUserEmail: fromUserEmail ?? this.fromUserEmail,
      toMasterUID: toMasterUID ?? this.toMasterUID,
      toMasterName: toMasterName ?? this.toMasterName,
      toMasterEmail: toMasterEmail ?? this.toMasterEmail,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      respondedAt: respondedAt ?? this.respondedAt,
      message: message ?? this.message,
    );
  }

  bool get isPending => status == 'pending';
  bool get isAccepted => status == 'accepted';
  bool get isDeclined => status == 'declined';
}