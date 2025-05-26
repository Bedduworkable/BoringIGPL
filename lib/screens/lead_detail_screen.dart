import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/lead_model.dart';
import '../providers/leads_provider.dart';
import 'add_edit_lead_screen.dart';
import 'remarks_screen.dart';
import 'reminders_screen.dart';

class LeadDetailScreen extends ConsumerWidget {
  final LeadModel lead;

  const LeadDetailScreen({required this.lead, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F5F7),
        body: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
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
                    Expanded(
                      child: Text(
                        lead.name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    PopupMenuButton<String>(
                      onSelected: (value) async {
                        switch (value) {
                          case 'edit':
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => AddEditLeadScreen(lead: lead),
                              ),
                            );
                            break;
                          case 'call':
                            _makePhoneCall(lead.phone);
                            break;
                          case 'delete':
                            _showDeleteDialog(context, ref);
                            break;
                        }
                      },
                      icon: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5E5EA),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.more_vert_rounded,
                          color: Color(0xFF2C2C2E),
                          size: 20,
                        ),
                      ),
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF007AFF).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Icon(
                                  Icons.edit_outlined,
                                  color: Color(0xFF007AFF),
                                  size: 16,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Text('Edit Lead'),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'call',
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF34C759).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Icon(
                                  Icons.phone_outlined,
                                  color: Color(0xFF34C759),
                                  size: 16,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Text('Call Lead'),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFF3B30).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Icon(
                                  Icons.delete_outline,
                                  color: Color(0xFFFF3B30),
                                  size: 16,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Text(
                                'Delete Lead',
                                style: TextStyle(color: Color(0xFFFF3B30)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Status Card
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 24),
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
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _getStatusColor(lead.status),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _getStatusColor(lead.status).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        lead.statusText,
                        style: TextStyle(
                          color: _getStatusColor(lead.status),
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      'Created ${DateFormat('MMM dd, yyyy').format(lead.createdAt)}',
                      style: const TextStyle(
                        color: Color(0xFF8E8E93),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Tab Bar
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: TabBar(
                  labelColor: const Color(0xFF007AFF),
                  unselectedLabelColor: const Color(0xFF8E8E93),
                  indicatorColor: const Color(0xFF007AFF),
                  indicatorWeight: 3,
                  indicatorSize: TabBarIndicatorSize.label,
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                  tabs: const [
                    Tab(
                      icon: Icon(
                        Icons.info_outline_rounded,
                        size: 20,
                      ),
                      text: 'Info',
                    ),
                    Tab(
                      icon: Icon(
                        Icons.comment_outlined,
                        size: 20,
                      ),
                      text: 'Remarks',
                    ),
                    Tab(
                      icon: Icon(
                        Icons.notifications_outlined,
                        size: 20,
                      ),
                      text: 'Reminders',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Tab Content
              Expanded(
                child: TabBarView(
                  children: [
                    _ModernInfoTab(lead: lead),
                    RemarksScreen(lead: lead),
                    RemindersScreen(lead: lead),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDeleteDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text(
          'Delete Lead',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1D1D1F),
          ),
        ),
        content: Text(
          'Are you sure you want to delete "${lead.name}"? This action cannot be undone.',
          style: const TextStyle(
            fontSize: 14,
            color: Color(0xFF8E8E93),
          ),
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
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ref.read(leadsNotifierProvider.notifier).deleteLead(lead.id);
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Lead deleted successfully'),
                      backgroundColor: const Color(0xFF34C759),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error deleting lead: $e'),
                      backgroundColor: const Color(0xFFFF3B30),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  );
                }
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFFF3B30),
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    try {
      String cleanNumber = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
      if (!cleanNumber.startsWith('+') && cleanNumber.length == 10) {
        cleanNumber = '+91$cleanNumber';
      }
      final uri = Uri.parse('tel:$cleanNumber');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      // Handle error silently or show a message
    }
  }

  Color _getStatusColor(LeadStatus status) {
    switch (status) {
      case LeadStatus.newLead:
        return const Color(0xFF34C759);
      case LeadStatus.followUp:
        return const Color(0xFFFF9500);
      case LeadStatus.visit:
        return const Color(0xFF007AFF);
      case LeadStatus.booked:
        return const Color(0xFFAF52DE);
      case LeadStatus.dropped:
        return const Color(0xFFFF3B30);
    }
  }
}

class _ModernInfoTab extends StatelessWidget {
  final LeadModel lead;

  const _ModernInfoTab({required this.lead});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Contact Information Card
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Contact Information',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D1D1F),
                  ),
                ),
                const SizedBox(height: 20),
                _ModernInfoRow(
                  icon: Icons.person_outline,
                  label: 'Name',
                  value: lead.name,
                ),
                const SizedBox(height: 16),
                _ModernInfoRow(
                  icon: Icons.phone_outlined,
                  label: 'Phone',
                  value: lead.phone,
                  hasAction: true,
                  onTap: () => _makePhoneCall(lead.phone),
                ),
                const SizedBox(height: 16),
                _ModernInfoRow(
                  icon: Icons.location_on_outlined,
                  label: 'Location',
                  value: lead.location,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Property Details Card
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Property Details',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D1D1F),
                  ),
                ),
                const SizedBox(height: 20),
                _ModernInfoRow(
                  icon: Icons.currency_rupee_outlined,
                  label: 'Budget',
                  value: lead.budget,
                ),
                const SizedBox(height: 16),
                _ModernInfoRow(
                  icon: Icons.home_outlined,
                  label: 'Property Type',
                  value: lead.propertyType,
                ),
                const SizedBox(height: 16),
                _ModernInfoRow(
                  icon: Icons.source_outlined,
                  label: 'Lead Source',
                  value: lead.source.isNotEmpty ? lead.source : 'Not specified',
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Activity Summary Card
          Container(
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
                  'Activity Summary',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D1D1F),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: _ActivityCard(
                        icon: Icons.comment_outlined,
                        count: lead.remarks.length,
                        label: 'Remarks',
                        color: const Color(0xFF007AFF),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _ActivityCard(
                        icon: Icons.notifications_outlined,
                        count: lead.reminders.length,
                        label: 'Reminders',
                        color: const Color(0xFFFF9500),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    try {
      String cleanNumber = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
      if (!cleanNumber.startsWith('+') && cleanNumber.length == 10) {
        cleanNumber = '+91$cleanNumber';
      }
      final uri = Uri.parse('tel:$cleanNumber');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      // Handle error silently
    }
  }
}

class _ModernInfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool hasAction;
  final VoidCallback? onTap;

  const _ModernInfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.hasAction = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
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
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: const Color(0xFF8E8E93),
                size: 20,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF8E8E93),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF1D1D1F),
                    ),
                  ),
                ],
              ),
            ),
            if (hasAction)
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF8E8E93),
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  final IconData icon;
  final int count;
  final String label;
  final Color color;

  const _ActivityCard({
    required this.icon,
    required this.count,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 28,
          ),
          const SizedBox(height: 8),
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Color(0xFF8E8E93),
            ),
          ),
        ],
      ),
    );
  }
}