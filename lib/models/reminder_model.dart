class ReminderModel {
  final String message;
  final DateTime date;
  final String createdBy;
  final bool isOpen;
  final DateTime? closedAt;
  final String? completionNote;
  final String? closedBy;

  ReminderModel({
    required this.message,
    required this.date,
    required this.createdBy,
    this.isOpen = true,
    this.closedAt,
    this.completionNote,
    this.closedBy,
  });

  factory ReminderModel.fromMap(Map<String, dynamic> map) {
    return ReminderModel(
      message: map['message'] ?? '',
      date: DateTime.fromMillisecondsSinceEpoch(map['date'] ?? 0),
      createdBy: map['createdBy'] ?? '',
      isOpen: map['isOpen'] ?? true,
      closedAt: map['closedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['closedAt'])
          : null,
      completionNote: map['completionNote'],
      closedBy: map['closedBy'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'message': message,
      'date': date.millisecondsSinceEpoch,
      'createdBy': createdBy,
      'isOpen': isOpen,
      'closedAt': closedAt?.millisecondsSinceEpoch,
      'completionNote': completionNote,
      'closedBy': closedBy,
    };
  }

  bool get isToday {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  bool get isOverdue {
    return isOpen && date.isBefore(DateTime.now());
  }

  bool get isDueToday {
    return isOpen && isToday;
  }

  ReminderModel copyWith({
    String? message,
    DateTime? date,
    String? createdBy,
    bool? isOpen,
    DateTime? closedAt,
    String? completionNote,
    String? closedBy,
  }) {
    return ReminderModel(
      message: message ?? this.message,
      date: date ?? this.date,
      createdBy: createdBy ?? this.createdBy,
      isOpen: isOpen ?? this.isOpen,
      closedAt: closedAt ?? this.closedAt,
      completionNote: completionNote ?? this.completionNote,
      closedBy: closedBy ?? this.closedBy,
    );
  }
}