import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/lead_model.dart';
import '../models/reminder_model.dart';
import '../models/remark_model.dart';
import '../providers/leads_provider.dart';
import '../providers/auth_provider.dart';
import '../services/notification_service.dart';

class RemindersScreen extends ConsumerStatefulWidget {
  final LeadModel lead;

  const RemindersScreen({required this.lead, super.key});

  @override
  ConsumerState<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends ConsumerState<RemindersScreen> {
  final _messageController = TextEditingController();
  final _completionController = TextEditingController();
  DateTime _selectedDate = DateTime.now();

  @override
  void dispose() {
    _messageController.dispose();
    _completionController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_selectedDate),
      );

      if (time != null) {
        setState(() {
          _selectedDate = DateTime(
            date.year,
            date.month,
            date.day,
            time.hour,
            time.minute,
          );
        });
      }
    }
  }

  bool _hasOpenReminder(LeadModel lead) {
    return lead.reminders.any((reminder) => reminder.isOpen);
  }

  Future<void> _addReminder() async {
    if (_messageController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please enter a reminder message'),
          backgroundColor: const Color(0xFFFF3B30),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    // Check if there's already an open reminder
    final leadsAsync = ref.read(leadsProvider);
    final currentLead = leadsAsync.maybeWhen(
      data: (leads) => leads.firstWhere(
            (l) => l.id == widget.lead.id,
        orElse: () => widget.lead,
      ),
      orElse: () => widget.lead,
    );

    if (_hasOpenReminder(currentLead)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please complete the existing reminder before creating a new one'),
          backgroundColor: const Color(0xFFFF9500),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    try {
      // Get current user data
      final authState = ref.read(authProvider);
      String? currentUserName;

      await authState.when(
        data: (user) async {
          if (user != null) {
            final userData = await ref.read(currentUserProvider.future);
            currentUserName = userData?.name ?? 'Unknown User';
          }
        },
        loading: () async {},
        error: (error, stack) async {},
      );

      if (currentUserName == null) {
        throw 'Please login again';
      }

      final newReminder = ReminderModel(
        message: _messageController.text.trim(),
        date: _selectedDate,
        createdBy: currentUserName!,
        isOpen: true,
      );

      print("⏰ Adding reminder: ${newReminder.message} for ${newReminder.date}");
      await ref.read(leadsNotifierProvider.notifier)
          .addReminder(widget.lead.id, newReminder, currentLead.reminders);

      // Add a remark about the reminder being scheduled
      final reminderRemark = RemarkModel(
        text: "📅 Reminder scheduled: ${newReminder.message} (Due: ${DateFormat('MMM dd, yyyy • HH:mm').format(newReminder.date)})",
        by: currentUserName!,
        timestamp: DateTime.now(),
      );

      await ref.read(leadsNotifierProvider.notifier)
          .addRemark(widget.lead.id, reminderRemark, currentLead.remarks);

      // Schedule notification for the reminder
      final notificationId = NotificationService.generateNotificationId(widget.lead.id, newReminder.date);
      await NotificationService.scheduleReminder(
        id: notificationId,
        title: 'Follow-up Required: ${widget.lead.name}',
        body: newReminder.message,
        scheduledDate: newReminder.date,
        payload: 'lead_reminder:${widget.lead.id}',
      );

      _messageController.clear();
      setState(() {
        _selectedDate = DateTime.now();
      });

      print("✅ Reminder added successfully with notification and remark");

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Reminder scheduled! You will be notified at the scheduled time.'),
            backgroundColor: const Color(0xFF34C759),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      print("❌ Error adding reminder: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding reminder: $e'),
            backgroundColor: const Color(0xFFFF3B30),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  Future<void> _completeReminder(ReminderModel reminder, int index) async {
    _completionController.clear();

    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text(
          'Complete Reminder',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1D1D1F),
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'What action did you take for this reminder?',
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF8E8E93),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                reminder.message,
                style: const TextStyle(
                  fontSize: 14,
                  fontStyle: FontStyle.italic,
                  color: Color(0xFF1D1D1F),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _completionController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'e.g., Called customer, sent property details, scheduled site visit...',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.all(12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF8E8E93),
            ),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, _completionController.text.trim()),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF34C759),
            ),
            child: const Text('Complete'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      try {
        // Get current user data
        final authState = ref.read(authProvider);
        String? currentUserName;

        await authState.when(
          data: (user) async {
            if (user != null) {
              final userData = await ref.read(currentUserProvider.future);
              currentUserName = userData?.name ?? 'Unknown User';
            }
          },
          loading: () async {},
          error: (error, stack) async {},
        );

        if (currentUserName == null) {
          throw 'Please login again';
        }

        // Get current lead
        final leadsAsync = ref.read(leadsProvider);
        final currentLead = leadsAsync.maybeWhen(
          data: (leads) => leads.firstWhere(
                (l) => l.id == widget.lead.id,
            orElse: () => widget.lead,
          ),
          orElse: () => widget.lead,
        );

        // Complete the reminder
        final completedReminder = reminder.copyWith(
          isOpen: false,
          closedAt: DateTime.now(),
          completionNote: result,
          closedBy: currentUserName,
        );

        // Update reminders list
        final updatedReminders = List<ReminderModel>.from(currentLead.reminders);
        updatedReminders[index] = completedReminder;

        await ref.read(leadsNotifierProvider.notifier)
            .updateLead(widget.lead.id, currentLead.copyWith(reminders: updatedReminders));

        // Add completion remark
        final completionRemark = RemarkModel(
          text: "✅ Reminder completed: ${reminder.message}\nAction taken: $result",
          by: currentUserName!,
          timestamp: DateTime.now(),
        );

        await ref.read(leadsNotifierProvider.notifier)
            .addRemark(widget.lead.id, completionRemark, currentLead.remarks);

        // Cancel the scheduled notification
        final notificationId = NotificationService.generateNotificationId(widget.lead.id, reminder.date);
        await NotificationService.cancelNotification(notificationId);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Reminder completed and logged in remarks!'),
              backgroundColor: const Color(0xFF34C759),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      } catch (e) {
        print("❌ Error completing reminder: $e");
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error completing reminder: $e'),
              backgroundColor: const Color(0xFFFF3B30),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final leadsAsync = ref.watch(leadsProvider);

    return leadsAsync.when(
      data: (leads) {
        final currentLead = leads.firstWhere(
              (l) => l.id == widget.lead.id,
          orElse: () => widget.lead,
        );

        final hasOpenReminder = _hasOpenReminder(currentLead);
        final openReminders = currentLead.reminders.where((r) => r.isOpen).toList();
        final closedReminders = currentLead.reminders.where((r) => !r.isOpen).toList();

        return Container(
          color: const Color(0xFFF5F5F7),
          child: Column(
            children: [
              // Add Reminder Section (only if no open reminder exists)
              if (!hasOpenReminder)
                Container(
                  margin: const EdgeInsets.all(24),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Schedule New Reminder',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _messageController,
                        decoration: InputDecoration(
                          hintText: 'What needs to be done?',
                          filled: true,
                          fillColor: const Color(0xFFF8F9FA),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: Color(0xFFE5E5EA),
                              width: 1,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: Color(0xFFE5E5EA),
                              width: 1,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: Color(0xFF007AFF),
                              width: 2,
                            ),
                          ),
                          contentPadding: const EdgeInsets.all(16),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: _selectDate,
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8F9FA),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFFE5E5EA),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.schedule_outlined,
                                      color: Color(0xFF8E8E93),
                                      size: 20,
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      DateFormat('MMM dd, yyyy • HH:mm').format(_selectedDate),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        color: Color(0xFF1D1D1F),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          ElevatedButton(
                            onPressed: _addReminder,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF007AFF),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'Schedule',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              // Open Reminders Section
              if (openReminders.isNotEmpty)
                Container(
                  margin: EdgeInsets.fromLTRB(24, hasOpenReminder ? 24 : 0, 24, 24),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Active Reminder',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...openReminders.asMap().entries.map((entry) {
                        final index = currentLead.reminders.indexOf(entry.value);
                        final reminder = entry.value;
                        return _ActiveReminderCard(
                          reminder: reminder,
                          onComplete: () => _completeReminder(reminder, index),
                        );
                      }).toList(),
                    ],
                  ),
                ),

              // Completed Reminders Section
              if (closedReminders.isNotEmpty)
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Completed Reminders',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1D1D1F),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Expanded(
                          child: ListView.separated(
                            itemCount: closedReminders.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final reminder = closedReminders[index];
                              return _CompletedReminderCard(reminder: reminder);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Empty state
              if (currentLead.reminders.isEmpty)
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F9FA),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(
                            Icons.alarm_outlined,
                            size: 64,
                            color: Color(0xFF8E8E93),
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'No reminders set',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1D1D1F),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Schedule a follow-up reminder above',
                          style: TextStyle(
                            fontSize: 14,
                            color: Color(0xFF8E8E93),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: Color(0xFF007AFF),
        ),
      ),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFFF3B30).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                size: 48,
                color: Color(0xFFFF3B30),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Error loading reminders',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Color(0xFF1D1D1F),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.invalidate(leadsProvider),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF007AFF),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActiveReminderCard extends StatelessWidget {
  final ReminderModel reminder;
  final VoidCallback onComplete;

  const _ActiveReminderCard({
    required this.reminder,
    required this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: reminder.isOverdue
            ? const Color(0xFFFF3B30).withOpacity(0.05)
            : const Color(0xFFFF9500).withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: reminder.isOverdue
              ? const Color(0xFFFF3B30).withOpacity(0.2)
              : const Color(0xFFFF9500).withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: reminder.isOverdue
                      ? const Color(0xFFFF3B30)
                      : const Color(0xFFFF9500),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  reminder.message,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D1D1F),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: reminder.isOverdue
                      ? const Color(0xFFFF3B30)
                      : const Color(0xFFFF9500),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  reminder.isOverdue ? 'OVERDUE' : 'ACTIVE',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.schedule_outlined,
                size: 16,
                color: Color(0xFF8E8E93),
              ),
              const SizedBox(width: 8),
              Text(
                DateFormat('MMM dd, yyyy • HH:mm').format(reminder.date),
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF8E8E93),
                ),
              ),
              const Spacer(),
              Text(
                'by ${reminder.createdBy}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF8E8E93),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onComplete,
              icon: const Icon(Icons.check_circle_outline, size: 18),
              label: const Text(
                'Mark as Complete',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF34C759),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CompletedReminderCard extends StatelessWidget {
  final ReminderModel reminder;

  const _CompletedReminderCard({required this.reminder});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFE5E5EA),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF34C759),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  reminder.message,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D1D1F),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF34C759).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'COMPLETED',
                  style: TextStyle(
                    color: Color(0xFF34C759),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (reminder.completionNote != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF34C759).withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.check_circle,
                    size: 16,
                    color: Color(0xFF34C759),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      reminder.completionNote!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF1D1D1F),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              const Icon(
                Icons.schedule_outlined,
                size: 14,
                color: Color(0xFF8E8E93),
              ),
              const SizedBox(width: 4),
              Text(
                'Due: ${DateFormat('MMM dd, yyyy').format(reminder.date)}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF8E8E93),
                ),
              ),
              const SizedBox(width: 16),
              const Icon(
                Icons.check_circle_outline,
                size: 14,
                color: Color(0xFF8E8E93),
              ),
              const SizedBox(width: 4),
              Text(
                'Completed: ${DateFormat('MMM dd, yyyy').format(reminder.closedAt!)}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF8E8E93),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}