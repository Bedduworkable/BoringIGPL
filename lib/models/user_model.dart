import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String uid;
  final String name;
  final String email;
  final String role; // 'admin', 'master', 'user'
  final String status; // 'active', 'inactive', 'pending'
  final String? masterUID; // Only for users - links them to their master
  final List<String> pendingInvites; // Master UIDs user has sent invites to
  final DateTime createdAt;
  final DateTime? linkedAt; // When user was linked to master

  UserModel({
    required this.uid,
    required this.name,
    required this.email,
    this.role = 'user',  // Default role is user
    this.status = 'pending',  // Default status pending until linked to master
    this.masterUID,
    this.pendingInvites = const [],
    required this.createdAt,
    this.linkedAt,
  });

  factory UserModel.fromMap(Map<String, dynamic> map, String uid) {
    return UserModel(
      uid: uid,
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      role: map['role'] ?? 'user',
      status: map['status'] ?? 'pending',
      masterUID: map['masterUID'],
      pendingInvites: List<String>.from(map['pendingInvites'] ?? []),
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      linkedAt: (map['linkedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      'role': role,
      'status': status,
      'masterUID': masterUID,
      'pendingInvites': pendingInvites,
      'createdAt': Timestamp.fromDate(createdAt),
      'linkedAt': linkedAt != null ? Timestamp.fromDate(linkedAt!) : null,
    };
  }

  UserModel copyWith({
    String? uid,
    String? name,
    String? email,
    String? role,
    String? status,
    String? masterUID,
    List<String>? pendingInvites,
    DateTime? createdAt,
    DateTime? linkedAt,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      status: status ?? this.status,
      masterUID: masterUID ?? this.masterUID,
      pendingInvites: pendingInvites ?? this.pendingInvites,
      createdAt: createdAt ?? this.createdAt,
      linkedAt: linkedAt ?? this.linkedAt,
    );
  }

  // Helper methods
  bool get isAdmin => role == 'admin';
  bool get isMaster => role == 'master';
  bool get isUser => role == 'user';
  bool get isLinkedToMaster => masterUID != null && masterUID!.isNotEmpty;
  bool get isPendingMasterLink => isUser && !isLinkedToMaster;
  bool get isActive => status == 'active';
}