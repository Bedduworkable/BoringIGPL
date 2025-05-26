import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/leads_provider.dart';
import '../providers/auth_provider.dart';
import '../models/lead_model.dart';

class AddEditLeadScreen extends ConsumerStatefulWidget {
  final LeadModel? lead;

  const AddEditLeadScreen({this.lead, super.key});

  @override
  ConsumerState<AddEditLeadScreen> createState() => _AddEditLeadScreenState();
}

class _AddEditLeadScreenState extends ConsumerState<AddEditLeadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _budgetController = TextEditingController();
  final _locationController = TextEditingController();

  String _selectedPropertyType = 'Apartment';
  String _selectedSource = 'Website';
  LeadStatus _selectedStatus = LeadStatus.newLead;
  bool _isLoading = false;

  final List<String> _propertyTypes = [
    'Apartment',
    'Villa',
    'Independent House',
    'Plot',
    'Commercial',
    'Office Space',
  ];

  final List<String> _sources = [
    'Website',
    'Referral',
    'Social Media',
    'Advertisement',
    'Walk-in',
    'Phone Call',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.lead != null) {
      _populateFields();
    }
  }

  void _populateFields() {
    final lead = widget.lead!;
    _nameController.text = lead.name;
    _phoneController.text = lead.phone;
    _budgetController.text = lead.budget == 'Not specified' ? '' : lead.budget;
    _locationController.text = lead.location == 'Not specified' ? '' : lead.location;
    _selectedPropertyType = lead.propertyType.isNotEmpty ? lead.propertyType : _propertyTypes.first;
    _selectedSource = lead.source.isNotEmpty ? lead.source : _sources.first;
    _selectedStatus = lead.status;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _budgetController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _saveLead() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // Get current user with better error handling
      final authState = ref.read(authProvider);
      String? currentUserId;

      await authState.when(
        data: (user) async {
          if (user != null) {
            currentUserId = user.uid;
          }
        },
        loading: () async {},
        error: (error, stack) async {},
      );

      if (currentUserId == null) {
        throw 'Please login again to continue';
      }

      final leadData = LeadModel(
        id: widget.lead?.id ?? '',
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        budget: _budgetController.text.trim().isEmpty ? 'Not specified' : _budgetController.text.trim(),
        location: _locationController.text.trim().isEmpty ? 'Not specified' : _locationController.text.trim(),
        propertyType: _selectedPropertyType,
        source: _selectedSource,
        status: _selectedStatus,
        createdBy: widget.lead?.createdBy ?? currentUserId!,
        assignedTo: widget.lead?.assignedTo ?? currentUserId!,
        remarks: widget.lead?.remarks ?? [],
        reminders: widget.lead?.reminders ?? [],
        createdAt: widget.lead?.createdAt ?? DateTime.now(),
      );

      print("💾 Saving lead: ${leadData.name}");

      if (widget.lead != null) {
        await ref.read(leadsNotifierProvider.notifier)
            .updateLead(widget.lead!.id, leadData);
        print("✅ Lead updated successfully");
      } else {
        await ref.read(leadsNotifierProvider.notifier).addLead(leadData);
        print("✅ Lead added successfully");
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.lead != null ? 'Lead updated successfully' : 'Lead added successfully'),
            backgroundColor: const Color(0xFF34C759),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      print("❌ Error saving lead: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: const Color(0xFFFF3B30),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
                    child: Text(
                      widget.lead != null ? 'Edit Lead' : 'Add New Lead',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1D1D1F),
                      ),
                    ),
                  ),
                  Container(
                    height: 44,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _saveLead,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isLoading
                            ? const Color(0xFF8E8E93)
                            : const Color(0xFF007AFF),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                          : const Text(
                        'Save',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Form Content
            Expanded(
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      // Basic Information Card
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
                              'Basic Information',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1D1D1F),
                              ),
                            ),
                            const SizedBox(height: 20),
                            _ModernTextField(
                              controller: _nameController,
                              label: 'Full Name',
                              icon: Icons.person_outline,
                              isRequired: true,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter the name';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            _ModernTextField(
                              controller: _phoneController,
                              label: 'Phone Number',
                              icon: Icons.phone_outlined,
                              isRequired: true,
                              keyboardType: TextInputType.phone,
                              maxLength: 10,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter phone number';
                                }
                                if (value.length != 10) {
                                  return 'Phone number must be exactly 10 digits';
                                }
                                if (!RegExp(r'^[0-9]+$').hasMatch(value)) {
                                  return 'Phone number can only contain digits';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            _ModernTextField(
                              controller: _budgetController,
                              label: 'Budget',
                              icon: Icons.currency_rupee_outlined,
                              hintText: 'e.g., 50 Lakh, 1 Crore',
                            ),
                            const SizedBox(height: 16),
                            _ModernTextField(
                              controller: _locationController,
                              label: 'Location',
                              icon: Icons.location_on_outlined,
                              hintText: 'e.g., Jubilee Hills, Hyderabad',
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
                            _ModernDropdown<String>(
                              value: _selectedPropertyType,
                              label: 'Property Type',
                              icon: Icons.home_outlined,
                              items: _propertyTypes,
                              onChanged: (value) {
                                setState(() {
                                  _selectedPropertyType = value!;
                                });
                              },
                            ),
                            const SizedBox(height: 16),
                            _ModernDropdown<String>(
                              value: _selectedSource,
                              label: 'Lead Source',
                              icon: Icons.source_outlined,
                              items: _sources,
                              onChanged: (value) {
                                setState(() {
                                  _selectedSource = value!;
                                });
                              },
                            ),
                            const SizedBox(height: 16),
                            _ModernDropdown<LeadStatus>(
                              value: _selectedStatus,
                              label: 'Status',
                              icon: Icons.flag_outlined,
                              items: LeadStatus.values,
                              itemBuilder: (status) => _getStatusText(status),
                              onChanged: (value) {
                                setState(() {
                                  _selectedStatus = value!;
                                });
                              },
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Save Button
                      Container(
                        margin: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _saveLead,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isLoading
                                ? const Color(0xFF8E8E93)
                                : const Color(0xFF007AFF),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: _isLoading
                              ? const CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          )
                              : Text(
                            widget.lead != null ? 'Update Lead' : 'Add Lead',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getStatusText(LeadStatus status) {
    switch (status) {
      case LeadStatus.newLead:
        return 'New';
      case LeadStatus.followUp:
        return 'Follow-up';
      case LeadStatus.visit:
        return 'Visit';
      case LeadStatus.booked:
        return 'Booked';
      case LeadStatus.dropped:
        return 'Dropped';
    }
  }
}

class _ModernTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String? hintText;
  final bool isRequired;
  final TextInputType? keyboardType;
  final int? maxLength;
  final String? Function(String?)? validator;

  const _ModernTextField({
    required this.controller,
    required this.label,
    required this.icon,
    this.hintText,
    this.isRequired = false,
    this.keyboardType,
    this.maxLength,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
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
              label + (isRequired ? ' *' : ''),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D1D1F),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          maxLength: maxLength,
          validator: validator,
          decoration: InputDecoration(
            hintText: hintText,
            prefixIcon: Icon(
              icon,
              color: const Color(0xFF8E8E93),
              size: 20,
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
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFFFF3B30),
                width: 1,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            counterText: '', // Hide counter
          ),
          style: const TextStyle(
            fontSize: 16,
            color: Color(0xFF1D1D1F),
          ),
        ),
      ],
    );
  }
}

class _ModernDropdown<T> extends StatelessWidget {
  final T value;
  final String label;
  final IconData icon;
  final List<T> items;
  final String Function(T)? itemBuilder;
  final void Function(T?) onChanged;

  const _ModernDropdown({
    required this.value,
    required this.label,
    required this.icon,
    required this.items,
    this.itemBuilder,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
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
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D1D1F),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<T>(
          value: value,
          decoration: InputDecoration(
            prefixIcon: Icon(
              icon,
              color: const Color(0xFF8E8E93),
              size: 20,
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
              vertical: 16,
            ),
          ),
          items: items.map((item) {
            return DropdownMenuItem<T>(
              value: item,
              child: Text(
                itemBuilder?.call(item) ?? item.toString(),
                style: const TextStyle(
                  fontSize: 16,
                  color: Color(0xFF1D1D1F),
                ),
              ),
            );
          }).toList(),
          onChanged: onChanged,
          style: const TextStyle(
            fontSize: 16,
            color: Color(0xFF1D1D1F),
          ),
        ),
      ],
    );
  }
}