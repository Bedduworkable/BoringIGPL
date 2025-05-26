import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../providers/auth_provider.dart';
import '../providers/leads_provider.dart';
import '../models/lead_model.dart';
import '../models/reminder_model.dart';
import '../models/user_model.dart';
import 'lead_list_screen.dart';
import 'add_edit_lead_screen.dart';
import 'lead_detail_screen.dart'; // Add this import

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leadsAsync = ref.watch(leadsProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Dashboard',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1D1D1F),
                    ),
                  ),
                  Row(
                    children: [
                      // Notification Bell
                      leadsAsync.when(
                        data: (leads) {
                          final activeReminders = _getActiveReminders(leads);
                          final overdueCount = activeReminders.where((r) => r.isOverdue).length;
                          final todayCount = activeReminders.where((r) => r.isDueToday).length;
                          final totalNotifications = overdueCount + todayCount;

                          return Stack(
                            children: [
                              IconButton(
                                onPressed: () => _showNotificationsDialog(context, activeReminders, ref),
                                icon: const Icon(Icons.notifications_outlined),
                                style: IconButton.styleFrom(
                                  backgroundColor: const Color(0xFFE5E5EA),
                                  foregroundColor: const Color(0xFF2C2C2E),
                                  padding: const EdgeInsets.all(12),
                                ),
                              ),
                              if (totalNotifications > 0)
                                Positioned(
                                  right: 8,
                                  top: 8,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFFF3B30),
                                      shape: BoxShape.circle,
                                    ),
                                    constraints: const BoxConstraints(
                                      minWidth: 16,
                                      minHeight: 16,
                                    ),
                                    child: Text(
                                      totalNotifications > 99 ? '99+' : totalNotifications.toString(),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ),
                            ],
                          );
                        },
                        loading: () => IconButton(
                          onPressed: () {},
                          icon: const Icon(Icons.notifications_outlined),
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFFE5E5EA),
                            foregroundColor: const Color(0xFF2C2C2E),
                            padding: const EdgeInsets.all(12),
                          ),
                        ),
                        error: (_, __) => IconButton(
                          onPressed: () {},
                          icon: const Icon(Icons.notifications_outlined),
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFFE5E5EA),
                            foregroundColor: const Color(0xFF2C2C2E),
                            padding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: () => ref.read(authNotifierProvider.notifier).signOut(),
                        icon: const Icon(Icons.logout_rounded),
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFFE5E5EA),
                          foregroundColor: const Color(0xFF2C2C2E),
                          padding: const EdgeInsets.all(12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Welcome Card
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
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
              child: authState.when(
                data: (firebaseUser) {
                  if (firebaseUser == null) {
                    return const Row(
                      children: [
                        CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF007AFF),
                        ),
                        SizedBox(width: 16),
                        Text('Loading...'),
                      ],
                    );
                  }

                  return FutureBuilder<UserModel?>(
                    future: ref.read(authServiceProvider).getUserData(firebaseUser.uid),
                    builder: (context, snapshot) {
                      final user = snapshot.data;
                      final userName = user?.name?.trim() ?? firebaseUser.email?.split('@')[0] ?? 'User';

                      return Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: const Color(0xFF007AFF),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Center(
                              child: Text(
                                userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  userName,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1D1D1F),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Real Estate Agent',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Color(0xFF8E8E93),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  );
                },
                loading: () => const Row(
                  children: [
                    CircularProgressIndicator(
                      color: Color(0xFF007AFF),
                      strokeWidth: 2,
                    ),
                    SizedBox(width: 16),
                    Text(
                      'Loading...',
                      style: TextStyle(
                        color: Color(0xFF1D1D1F),
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
                error: (_, __) => Row(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: const Color(0xFF007AFF),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Center(
                        child: Text(
                          'U',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1D1D1F),
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Real Estate Agent',
                            style: TextStyle(
                              fontSize: 14,
                              color: Color(0xFF8E8E93),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Stats Section
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 24),
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
                      'Lead Statistics',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1D1D1F),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Expanded(
                      child: leadsAsync.when(
                        data: (leads) {
                          final stats = _calculateStats(leads);
                          return GridView.count(
                            crossAxisCount: 2,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            childAspectRatio: 1.1,
                            children: [
                              _CleanStatCard(
                                title: 'Total Leads',
                                value: stats['total'].toString(),
                                color: const Color(0xFF007AFF),
                                onTap: () => _navigateToLeads(context),
                              ),
                              _CleanStatCard(
                                title: 'New Leads',
                                value: stats['new'].toString(),
                                color: const Color(0xFF34C759),
                                onTap: () => _navigateToLeads(context),
                              ),
                              _CleanStatCard(
                                title: 'Follow-ups',
                                value: stats['followUp'].toString(),
                                color: const Color(0xFFFF9500),
                                onTap: () => _navigateToLeads(context),
                              ),
                              _CleanStatCard(
                                title: 'Bookings',
                                value: stats['booked'].toString(),
                                color: const Color(0xFFAF52DE),
                                onTap: () => _navigateToLeads(context),
                              ),
                            ],
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
                                padding: const EdgeInsets.all(16),
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
                                'Unable to load data',
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
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Quick Actions
            Container(
              margin: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _ModernActionButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AddEditLeadScreen(),
                            ),
                          ),
                          icon: Icons.add_rounded,
                          label: 'Add Lead',
                          isPrimary: true,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _ModernActionButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const LeadListScreen(),
                            ),
                          ),
                          icon: Icons.list_alt_rounded,
                          label: 'Leads',
                          isPrimary: false,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _ModernActionButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const AllRemindersScreen(),
                      ),
                    ),
                    icon: Icons.notifications_rounded,
                    label: 'View Reminders',
                    isPrimary: false,
                    fullWidth: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<ReminderModel> _getActiveReminders(List<LeadModel> leads) {
    final List<ReminderModel> activeReminders = [];
    for (final lead in leads) {
      for (final reminder in lead.reminders) {
        if (reminder.isOpen && (reminder.isOverdue || reminder.isDueToday)) {
          activeReminders.add(reminder);
        }
      }
    }
    return activeReminders;
  }

  void _showNotificationsDialog(BuildContext context, List<ReminderModel> reminders, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Row(
          children: [
            Icon(
              Icons.notifications_rounded,
              color: Color(0xFF007AFF),
              size: 24,
            ),
            SizedBox(width: 12),
            Text(
              'Active Reminders',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D1D1F),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: reminders.isEmpty
              ? const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.notifications_off_outlined,
                size: 48,
                color: Color(0xFF8E8E93),
              ),
              SizedBox(height: 16),
              Text(
                'No active reminders',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF1D1D1F),
                ),
              ),
              Text(
                'All caught up!',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF8E8E93),
                ),
              ),
            ],
          )
              : ListView.separated(
            shrinkWrap: true,
            itemCount: reminders.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final reminder = reminders[index];
              final leads = ref.read(leadsProvider).value ?? [];
              final lead = leads.where((l) => l.reminders.contains(reminder)).firstOrNull;

              return GestureDetector(
                onTap: () {
                  Navigator.pop(context); // Close dialog
                  if (lead != null) {
                    // Navigate to lead detail with reminders tab
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => DefaultTabController(
                          length: 3,
                          initialIndex: 2, // Start with reminders tab
                          child: LeadDetailScreen(lead: lead),
                        ),
                      ),
                    );
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: reminder.isOverdue
                        ? const Color(0xFFFF3B30).withOpacity(0.1)
                        : const Color(0xFFFF9500).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: reminder.isOverdue
                          ? const Color(0xFFFF3B30).withOpacity(0.3)
                          : const Color(0xFFFF9500).withOpacity(0.3),
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
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              reminder.message,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: Color(0xFF1D1D1F),
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right_rounded,
                            color: Color(0xFF8E8E93),
                            size: 16,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (lead != null) ...[
                        Text(
                          'Lead: ${lead.name}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF8E8E93),
                          ),
                        ),
                        const SizedBox(height: 4),
                      ],
                      Text(
                        DateFormat('MMM dd, yyyy • HH:mm').format(reminder.date),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF8E8E93),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Close',
              style: TextStyle(
                color: Color(0xFF007AFF),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToLeads(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const LeadListScreen(),
      ),
    );
  }

  Map<String, int> _calculateStats(List<LeadModel> leads) {
    int total = leads.length;
    int newLeads = leads.where((lead) => lead.status == LeadStatus.newLead).length;
    int followUp = leads.where((lead) => lead.status == LeadStatus.followUp).length;
    int booked = leads.where((lead) => lead.status == LeadStatus.booked).length;

    return {
      'total': total,
      'new': newLeads,
      'followUp': followUp,
      'booked': booked,
    };
  }
}

class _CleanStatCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;
  final VoidCallback onTap;

  const _CleanStatCard({
    required this.title,
    required this.value,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: color.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: color.withOpacity(0.1),
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const Spacer(),
              Text(
                value,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: color,
                  height: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF8E8E93),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModernActionButton extends StatelessWidget {
  final VoidCallback onPressed;
  final IconData icon;
  final String label;
  final bool isPrimary;
  final bool fullWidth;

  const _ModernActionButton({
    required this.onPressed,
    required this.icon,
    required this.label,
    required this.isPrimary,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      height: 56,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 20),
        label: Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: isPrimary
              ? const Color(0xFF007AFF)
              : Colors.white,
          foregroundColor: isPrimary
              ? Colors.white
              : const Color(0xFF1D1D1F),
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: isPrimary
                ? BorderSide.none
                : const BorderSide(
              color: Color(0xFFE5E5EA),
              width: 1,
            ),
          ),
        ),
      ),
    );
  }
}

class AllRemindersScreen extends ConsumerWidget {
  const AllRemindersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leadsAsync = ref.watch(leadsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF2C2C2E),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(width: 16),
                  const Text(
                    'All Reminders',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1D1D1F),
                    ),
                  ),
                ],
              ),
            ),

            // Content
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
                child: leadsAsync.when(
                  data: (leads) {
                    List<Map<String, dynamic>> allReminders = [];
                    for (final lead in leads) {
                      for (final reminder in lead.reminders) {
                        allReminders.add({
                          'reminder': reminder,
                          'lead': lead,
                        });
                      }
                    }

                    if (allReminders.isEmpty) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.notifications_off_outlined,
                              size: 64,
                              color: Color(0xFF8E8E93),
                            ),
                            SizedBox(height: 16),
                            Text(
                              'No reminders',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1D1D1F),
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'All caught up!',
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF8E8E93),
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    return ListView.separated(
                      itemCount: allReminders.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final item = allReminders[index];
                        final reminder = item['reminder'] as ReminderModel;
                        final lead = item['lead'] as LeadModel;

                        return GestureDetector(
                          onTap: () {
                            // Navigate to lead detail with reminders tab
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => DefaultTabController(
                                  length: 3,
                                  initialIndex: 2, // Start with reminders tab
                                  child: LeadDetailScreen(lead: lead),
                                ),
                              ),
                            );
                          },
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
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: reminder.isOpen
                                        ? (reminder.isOverdue
                                        ? const Color(0xFFFF3B30)
                                        : const Color(0xFFFF9500))
                                        : const Color(0xFF8E8E93),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        reminder.message,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 15,
                                          color: Color(0xFF1D1D1F),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Lead: ${lead.name}',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFF8E8E93),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: reminder.isOpen
                                              ? (reminder.isOverdue
                                              ? const Color(0xFFFF3B30).withOpacity(0.1)
                                              : const Color(0xFFFF9500).withOpacity(0.1))
                                              : const Color(0xFF8E8E93).withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          reminder.isOpen
                                              ? (reminder.isOverdue ? 'Overdue' : 'Active')
                                              : 'Completed',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: reminder.isOpen
                                                ? (reminder.isOverdue
                                                ? const Color(0xFFFF3B30)
                                                : const Color(0xFFFF9500))
                                                : const Color(0xFF8E8E93),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  children: [
                                    Text(
                                      DateFormat('MMM dd').format(reminder.date),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: Color(0xFF8E8E93),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Icon(
                                      Icons.chevron_right_rounded,
                                      color: Color(0xFF8E8E93),
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
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
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}