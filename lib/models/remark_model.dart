class RemarkModel {
  final String text;
  final String by;
  final DateTime timestamp;

  RemarkModel({
    required this.text,
    required this.by,
    required this.timestamp,
  });

  factory RemarkModel.fromMap(Map<String, dynamic> map) {
    return RemarkModel(
      text: map['text'] ?? '',
      by: map['by'] ?? '',
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] ?? 0),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'text': text,
      'by': by,
      'timestamp': timestamp.millisecondsSinceEpoch,
    };
  }
}