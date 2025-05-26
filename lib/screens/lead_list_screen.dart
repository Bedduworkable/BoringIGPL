import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/leads_provider.dart';
import '../models/lead_model.dart';
import 'lead_detail_screen.dart';
import 'add_edit_lead_screen.dart';

class LeadListScreen extends ConsumerStatefulWidget {
  const LeadListScreen({super.key});

  @override
  ConsumerState<LeadListScreen> createState() => _LeadListScreenState();
}

class _LeadListScreenState extends ConsumerState<LeadListScreen> {
  String _selectedStatus = 'All';
  String _selectedSource = 'All';
  String _searchQuery = '';
  String _sortBy = 'Recent';
  final _searchController = TextEditingController();
  bool _showFilters = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final leadsAsync = ref.watch(leadsProvider);

    return Scaffold(
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
                    child: leadsAsync.when(
                      data: (leads) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'All Leads',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1D1D1F),
                            ),
                          ),
                          Text(
                            '${_filterLeads(leads).length} of ${leads.length} leads',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF8E8E93),
                            ),
                          ),
                        ],
                      ),
                      loading: () => const Text(
                        'All Leads',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                      ),
                      error: (_, __) => const Text(
                        'All Leads',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _showSortDialog(),
                    icon: const Icon(Icons.sort_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFFE5E5EA),
                      foregroundColor: const Color(0xFF2C2C2E),
                      padding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AddEditLeadScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF007AFF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.all(12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Search and Filters
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Search Field
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F9FA),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFFE5E5EA),
                              width: 1,
                            ),
                          ),
                          child: TextField(
                            controller: _searchController,
                            decoration: InputDecoration(
                              hintText: 'Search leads...',
                              hintStyle: const TextStyle(
                                color: Color(0xFF8E8E93),
                                fontSize: 16,
                              ),
                              prefixIcon: const Icon(
                                Icons.search_rounded,
                                color: Color(0xFF8E8E93),
                                size: 20,
                              ),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? IconButton(
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {
                                    _searchQuery = '';
                                  });
                                },
                                icon: const Icon(
                                  Icons.clear_rounded,
                                  color: Color(0xFF8E8E93),
                                  size: 20,
                                ),
                              )
                                  : null,
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                            ),
                            style: const TextStyle(
                              fontSize: 16,
                              color: Color(0xFF1D1D1F),
                            ),
                            onChanged: (value) {
                              setState(() {
                                _searchQuery = value.toLowerCase();
                              });
                            },
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _showFilters = !_showFilters;
                          });
                        },
                        icon: Icon(
                          _showFilters ? Icons.filter_list_off : Icons.filter_list,
                          color: _showFilters ? const Color(0xFF007AFF) : const Color(0xFF8E8E93),
                        ),
                        style: IconButton.styleFrom(
                          backgroundColor: _showFilters
                              ? const Color(0xFF007AFF).withOpacity(0.1)
                              : const Color(0xFFF8F9FA),
                          padding: const EdgeInsets.all(12),
                        ),
                      ),
                    ],
                  ),

                  // Filters
                  if (_showFilters) ...[
                    const SizedBox(height: 16),

                    // Status Filter
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Status',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D1D1F),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        'All',
                        'New',
                        'Follow-up',
                        'Visit',
                        'Booked',
                        'Dropped'
                      ].map((status) {
                        final isSelected = _selectedStatus == status;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedStatus = status;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF007AFF)
                                  : const Color(0xFFF8F9FA),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF007AFF)
                                    : const Color(0xFFE5E5EA),
                                width: 1,
                              ),
                            ),
                            child: Text(
                              status,
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : const Color(0xFF1D1D1F),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    // Source Filter
                    leadsAsync.when(
                      data: (leads) {
                        final uniqueSources = _getUniqueSources(leads);
                        if (uniqueSources.isEmpty) return const SizedBox.shrink();

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 16),
                            const Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                'Source',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF1D1D1F),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: ['All', ...uniqueSources].map((source) {
                                final isSelected = _selectedSource == source;
                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedSource = source;
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? const Color(0xFF34C759)
                                          : const Color(0xFFF8F9FA),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: isSelected
                                            ? const Color(0xFF34C759)
                                            : const Color(0xFFE5E5EA),
                                        width: 1,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (source != 'All') ...[
                                          Icon(
                                            _getSourceIcon(source),
                                            size: 12,
                                            color: isSelected
                                                ? Colors.white
                                                : const Color(0xFF8E8E93),
                                          ),
                                          const SizedBox(width: 4),
                                        ],
                                        Text(
                                          source,
                                          style: TextStyle(
                                            color: isSelected
                                                ? Colors.white
                                                : const Color(0xFF1D1D1F),
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        );
                      },
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                    ),

                    // Clear Filters
                    if (_selectedStatus != 'All' || _selectedSource != 'All') ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _selectedStatus = 'All';
                              _selectedSource = 'All';
                              _searchQuery = '';
                              _searchController.clear();
                            });
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFF3B30),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                          child: const Text(
                            'Clear All Filters',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Leads List
            Expanded(
              child: leadsAsync.when(
                data: (leads) {
                  final filteredLeads = _filterAndSortLeads(leads);

                  if (filteredLeads.isEmpty) {
                    return _buildEmptyState();
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(leadsProvider);
                    },
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      itemCount: filteredLeads.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final lead = filteredLeads[index];
                        return _CompactLeadCard(
                          lead: lead,
                          onTap: () => _navigateToLeadDetail(lead),
                          onCall: () => _makePhoneCall(lead.phone),
                          onEdit: () => _navigateToEditLead(lead),
                        );
                      },
                    ),
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF007AFF),
                  ),
                ),
                error: (error, _) => _buildErrorState(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final hasFilters = _selectedStatus != 'All' || _selectedSource != 'All' || _searchQuery.isNotEmpty;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFF8F9FA),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              hasFilters ? Icons.search_off_rounded : Icons.people_outline_rounded,
              size: 64,
              color: const Color(0xFF8E8E93),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            hasFilters ? 'No matching leads found' : 'No leads yet',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1D1D1F),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            hasFilters
                ? 'Try adjusting your search or filters'
                : 'Add your first lead to get started',
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF8E8E93),
            ),
          ),
          if (hasFilters) ...[
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _selectedStatus = 'All';
                  _selectedSource = 'All';
                  _searchQuery = '';
                  _searchController.clear();
                });
              },
              icon: const Icon(Icons.clear_all_rounded),
              label: const Text('Clear Filters'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF007AFF),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
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
            'Unable to load leads',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
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
    );
  }

  void _showSortDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Sort by',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D1D1F),
              ),
            ),
            const SizedBox(height: 16),
            ...['Recent', 'Name A-Z', 'Name Z-A', 'Priority'].map((option) {
              return ListTile(
                leading: Radio<String>(
                  value: option,
                  groupValue: _sortBy,
                  onChanged: (value) {
                    setState(() {
                      _sortBy = value!;
                    });
                    Navigator.pop(context);
                  },
                  activeColor: const Color(0xFF007AFF),
                ),
                title: Text(
                  option,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Color(0xFF1D1D1F),
                  ),
                ),
                onTap: () {
                  setState(() {
                    _sortBy = option;
                  });
                  Navigator.pop(context);
                },
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  List<String> _getUniqueSources(List<LeadModel> leads) {
    final sources = leads.map((lead) => lead.source).where((source) => source.isNotEmpty).toSet().toList();
    sources.sort();
    return sources;
  }

  IconData _getSourceIcon(String source) {
    switch (source.toLowerCase()) {
      case 'facebook':
      case 'fb':
        return Icons.facebook;
      case 'whatsapp':
      case 'wa':
        return Icons.chat;
      case 'instagram':
      case 'insta':
        return Icons.camera_alt;
      case 'google':
        return Icons.search;
      case 'website':
      case 'web':
        return Icons.language;
      case 'referral':
      case 'reference':
        return Icons.people;
      case 'walk-in':
      case 'walkin':
        return Icons.store;
      case 'phone':
      case 'call':
        return Icons.phone;
      case 'email':
        return Icons.email;
      case 'advertisement':
      case 'ad':
        return Icons.campaign;
      case 'broker':
        return Icons.business;
      default:
        return Icons.source;
    }
  }

  List<LeadModel> _filterAndSortLeads(List<LeadModel> leads) {
    var filteredLeads = leads.where((lead) {
      final matchesSearch = _searchQuery.isEmpty ||
          lead.name.toLowerCase().contains(_searchQuery) ||
          lead.phone.contains(_searchQuery) ||
          lead.location.toLowerCase().contains(_searchQuery) ||
          lead.source.toLowerCase().contains(_searchQuery);

      final matchesStatus = _selectedStatus == 'All' ||
          lead.statusText == _selectedStatus;

      final matchesSource = _selectedSource == 'All' ||
          lead.source == _selectedSource;

      return matchesSearch && matchesStatus && matchesSource;
    }).toList();

    switch (_sortBy) {
      case 'Name A-Z':
        filteredLeads.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'Name Z-A':
        filteredLeads.sort((a, b) => b.name.compareTo(a.name));
        break;
      case 'Priority':
        filteredLeads.sort((a, b) {
          final priorityOrder = {
            LeadStatus.newLead: 1,
            LeadStatus.followUp: 2,
            LeadStatus.visit: 3,
            LeadStatus.booked: 4,
            LeadStatus.dropped: 5,
          };
          return priorityOrder[a.status]!.compareTo(priorityOrder[b.status]!);
        });
        break;
      case 'Recent':
      default:
        filteredLeads.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        break;
    }

    return filteredLeads;
  }

  List<LeadModel> _filterLeads(List<LeadModel> leads) {
    return leads.where((lead) {
      final matchesSearch = _searchQuery.isEmpty ||
          lead.name.toLowerCase().contains(_searchQuery) ||
          lead.phone.contains(_searchQuery) ||
          lead.location.toLowerCase().contains(_searchQuery) ||
          lead.source.toLowerCase().contains(_searchQuery);

      final matchesStatus = _selectedStatus == 'All' ||
          lead.statusText == _selectedStatus;

      final matchesSource = _selectedSource == 'All' ||
          lead.source == _selectedSource;

      return matchesSearch && matchesStatus && matchesSource;
    }).toList();
  }

  void _navigateToLeadDetail(LeadModel lead) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LeadDetailScreen(lead: lead),
      ),
    );
  }

  void _navigateToEditLead(LeadModel lead) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddEditLeadScreen(lead: lead),
      ),
    );
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    try {
      // Clean the phone number (remove spaces, dashes, etc.)
      String cleanNumber = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');

      // Add country code if not present (assuming India +91)
      if (!cleanNumber.startsWith('+') && cleanNumber.length == 10) {
        cleanNumber = '+91$cleanNumber';
      }

      final uri = Uri.parse('tel:$cleanNumber');

      // Try using launchUrl with specific mode
      bool launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      if (!launched) {
        // Fallback: Try with different URI format
        final fallbackUri = Uri(scheme: 'tel', path: cleanNumber);
        launched = await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
      }

      if (!launched) {
        // Final fallback: Copy number to clipboard with call action
        await Clipboard.setData(ClipboardData(text: phoneNumber));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.content_copy, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text('Copied: $phoneNumber')),
                ],
              ),
              backgroundColor: const Color(0xFF34C759),
              behavior: SnackBarBehavior.floating,
              action: SnackBarAction(
                label: 'CALL',
                textColor: Colors.white,
                onPressed: () {
                  // Try to launch dialer manually
                  launchUrl(Uri.parse('tel:$phoneNumber'));
                },
              ),
            ),
          );
        }
      }
    } catch (e) {
      // Error fallback: Copy number to clipboard
      await Clipboard.setData(ClipboardData(text: phoneNumber));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.content_copy, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Copied: $phoneNumber')),
              ],
            ),
            backgroundColor: const Color(0xFF34C759),
            behavior: SnackBarBehavior.floating,
            action: SnackBarAction(
              label: 'CALL',
              textColor: Colors.white,
              onPressed: () {
                launchUrl(Uri.parse('tel:$phoneNumber'));
              },
            ),
          ),
        );
      }
    }
  }
}

class _CompactLeadCard extends StatelessWidget {
  final LeadModel lead;
  final VoidCallback onTap;
  final VoidCallback onCall;
  final VoidCallback onEdit;

  const _CompactLeadCard({
    required this.lead,
    required this.onTap,
    required this.onCall,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final hasActiveReminders = lead.reminders.any((r) => r.isOpen && (r.isOverdue || r.isDueToday));

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: hasActiveReminders
                  ? const Color(0xFFFF9500).withOpacity(0.3)
                  : const Color(0xFFE5E5EA),
              width: hasActiveReminders ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              // Status Indicator
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: _getStatusColor(lead.status),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),

              // Lead Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name and Status
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            lead.name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1D1D1F),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: _getStatusColor(lead.status).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            lead.statusText,
                            style: TextStyle(
                              color: _getStatusColor(lead.status),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Phone and Location
                    Row(
                      children: [
                        Icon(
                          Icons.phone_outlined,
                          size: 12,
                          color: const Color(0xFF8E8E93),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          lead.phone,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF1D1D1F),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(
                          Icons.location_on_outlined,
                          size: 12,
                          color: const Color(0xFF8E8E93),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            lead.location,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF8E8E93),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Budget and Source
                    Row(
                      children: [
                        Icon(
                          Icons.currency_rupee_outlined,
                          size: 12,
                          color: const Color(0xFF8E8E93),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          lead.budget,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF1D1D1F),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (lead.source.isNotEmpty) ...[
                          const SizedBox(width: 12),
                          Icon(
                            _getSourceIcon(lead.source),
                            size: 12,
                            color: const Color(0xFF8E8E93),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            lead.source,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF8E8E93),
                            ),
                          ),
                        ],
                      ],
                    ),

                    // Active Reminder Alert
                    if (hasActiveReminders) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF9500).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.notifications_active_rounded,
                              size: 10,
                              color: const Color(0xFFFF9500),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Active reminder',
                              style: TextStyle(
                                fontSize: 10,
                                color: const Color(0xFFFF9500),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Action Buttons
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Call Button
                  GestureDetector(
                    onTap: onCall,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF34C759).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.phone_rounded,
                        size: 16,
                        color: Color(0xFF34C759),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Edit Button
                  GestureDetector(
                    onTap: onEdit,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF007AFF).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.edit_rounded,
                        size: 16,
                        color: Color(0xFF007AFF),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getSourceIcon(String source) {
    switch (source.toLowerCase()) {
      case 'facebook':
      case 'fb':
        return Icons.facebook;
      case 'whatsapp':
      case 'wa':
        return Icons.chat;
      case 'instagram':
      case 'insta':
        return Icons.camera_alt;
      case 'google':
        return Icons.search;
      case 'website':
      case 'web':
        return Icons.language;
      case 'referral':
      case 'reference':
        return Icons.people;
      case 'walk-in':
      case 'walkin':
        return Icons.store;
      case 'phone':
      case 'call':
        return Icons.phone;
      case 'email':
        return Icons.email;
      case 'advertisement':
      case 'ad':
        return Icons.campaign;
      case 'broker':
        return Icons.business;
      default:
        return Icons.source;
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