import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/lead_model.dart';
import '../models/remark_model.dart';
import '../providers/leads_provider.dart';
import '../providers/auth_provider.dart';

class RemarksScreen extends ConsumerStatefulWidget {
  final LeadModel lead;

  const RemarksScreen({required this.lead, super.key});

  @override
  ConsumerState<RemarksScreen> createState() => _RemarksScreenState();
}

class _RemarksScreenState extends ConsumerState<RemarksScreen> {
  final _remarkController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _remarkController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _addRemark() async {
    if (_remarkController.text.trim().isEmpty) return;

    try {
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

      // Get the current lead with updated remarks from the provider
      final leadsAsync = ref.read(leadsProvider);
      final currentLead = leadsAsync.maybeWhen(
        data: (leads) => leads.firstWhere(
              (l) => l.id == widget.lead.id,
          orElse: () => widget.lead,
        ),
        orElse: () => widget.lead,
      );

      final newRemark = RemarkModel(
        text: _remarkController.text.trim(),
        by: currentUserName!,
        timestamp: DateTime.now(),
      );

      print("💬 Adding remark: ${newRemark.text}");
      print("💬 Current remarks count: ${currentLead.remarks.length}");

      await ref.read(leadsNotifierProvider.notifier)
          .addRemark(widget.lead.id, newRemark, currentLead.remarks);

      _remarkController.clear();
      print("✅ Remark added successfully");

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Remark added successfully'),
            backgroundColor: const Color(0xFF34C759),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            duration: Duration(seconds: 2),
          ),
        );
      }

      // Scroll to top after adding remark (since newest is at top now)
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            0, // Scroll to top to see the newest remark
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      print("❌ Error adding remark: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding remark: $e'),
            backgroundColor: const Color(0xFFFF3B30),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  bool _isReminderRemark(String text) {
    return text.startsWith('📅 Reminder scheduled:') ||
        text.startsWith('✅ Reminder completed:');
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

        // 🔥 SORT REMARKS BY TIMESTAMP - NEWEST FIRST
        final sortedRemarks = List<RemarkModel>.from(currentLead.remarks)
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

        return Container(
          color: const Color(0xFFF5F5F7),
          child: Column(
            children: [
              // Header with count and sorting info
              if (sortedRemarks.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  child: Row(
                    children: [
                      Text(
                        'Remarks (${sortedRemarks.length})',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF007AFF).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          '🆕 Latest first',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF007AFF),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Remarks List
              Expanded(
                child: sortedRemarks.isEmpty
                    ? Center(
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
                          Icons.comment_outlined,
                          size: 64,
                          color: Color(0xFF8E8E93),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'No activity yet',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Start the conversation with your first remark',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF8E8E93),
                        ),
                      ),
                    ],
                  ),
                )
                    : ListView.separated(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(24),
                  itemCount: sortedRemarks.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final remark = sortedRemarks[index];
                    final isReminderRemark = _isReminderRemark(remark.text);
                    final isLatest = index == 0; // First item is the latest

                    return isReminderRemark
                        ? _ReminderActivityBubble(remark: remark, isLatest: isLatest)
                        : _RemarkBubble(remark: remark, isLatest: isLatest);
                  },
                ),
              ),

              // Add Remark Section
              Container(
                margin: const EdgeInsets.all(24),
                padding: const EdgeInsets.all(20),
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
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _remarkController,
                        maxLines: null,
                        decoration: InputDecoration(
                          hintText: 'Add a remark...',
                          hintStyle: const TextStyle(
                            color: Color(0xFF8E8E93),
                          ),
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
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        onSubmitted: (_) => _addRemark(),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Container(
                      decoration: const BoxDecoration(
                        color: Color(0xFF007AFF),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        onPressed: _addRemark,
                        icon: const Icon(
                          Icons.send_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                        padding: const EdgeInsets.all(12),
                      ),
                    ),
                  ],
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
              'Error loading remarks',
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

class _RemarkBubble extends StatelessWidget {
  final RemarkModel remark;
  final bool isLatest;

  const _RemarkBubble({required this.remark, this.isLatest = false});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.85,
        ),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
            bottomRight: Radius.circular(20),
            bottomLeft: Radius.circular(4),
          ),
          border: Border.all(
            color: isLatest
                ? const Color(0xFF007AFF).withOpacity(0.3)
                : const Color(0xFFE5E5EA),
            width: isLatest ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Latest badge
            if (isLatest)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF007AFF).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  '✨ Latest',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF007AFF),
                  ),
                ),
              ),
            Text(
              remark.text,
              style: const TextStyle(
                fontSize: 15,
                color: Color(0xFF1D1D1F),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF007AFF),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  remark.by,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF007AFF),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  DateFormat('MMM dd • HH:mm').format(remark.timestamp),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF8E8E93),
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

class _ReminderActivityBubble extends StatelessWidget {
  final RemarkModel remark;
  final bool isLatest;

  const _ReminderActivityBubble({required this.remark, this.isLatest = false});

  @override
  Widget build(BuildContext context) {
    final isScheduled = remark.text.startsWith('📅');
    final isCompleted = remark.text.startsWith('✅');

    return Center(
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.9,
        ),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isCompleted
              ? const Color(0xFF34C759).withOpacity(0.05)
              : const Color(0xFFFF9500).withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isLatest
                ? (isCompleted ? const Color(0xFF34C759) : const Color(0xFFFF9500))
                : (isCompleted
                ? const Color(0xFF34C759).withOpacity(0.2)
                : const Color(0xFFFF9500).withOpacity(0.2)),
            width: isLatest ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            // Latest badge for reminders
            if (isLatest)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (isCompleted ? const Color(0xFF34C759) : const Color(0xFFFF9500)).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '✨ Latest Activity',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: isCompleted ? const Color(0xFF34C759) : const Color(0xFFFF9500),
                  ),
                ),
              ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? const Color(0xFF34C759)
                        : const Color(0xFFFF9500),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isCompleted ? Icons.check : Icons.schedule,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    remark.text,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF1D1D1F),
                      fontWeight: FontWeight.w500,
                      height: 1.4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: const Color(0xFF8E8E93).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    remark.by,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF8E8E93),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    DateFormat('MMM dd • HH:mm').format(remark.timestamp),
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF8E8E93),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}