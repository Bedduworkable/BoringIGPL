import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/remark_model.dart';

class RemarkBubble extends StatelessWidget {
  final RemarkModel remark;
  final bool isCurrentUser;

  const RemarkBubble({
    super.key,
    required this.remark,
    this.isCurrentUser = false,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isCurrentUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isCurrentUser ? Colors.blue[500] : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isCurrentUser ? const Radius.circular(16) : const Radius.circular(4),
            bottomRight: isCurrentUser ? const Radius.circular(4) : const Radius.circular(16),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              remark.text,
              style: TextStyle(
                fontSize: 16,
                color: isCurrentUser ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  remark.by,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isCurrentUser ? Colors.white70 : Colors.blue[600],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  DateFormat('MMM dd, HH:mm').format(remark.timestamp),
                  style: TextStyle(
                    fontSize: 12,
                    color: isCurrentUser ? Colors.white60 : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}