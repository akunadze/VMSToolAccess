import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/kiosk_api.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/kiosk_text_field.dart';
import '../widgets/door_card_scan_prompt.dart';
import '../widgets/tool_card_scan_prompt.dart';

enum _Step { scanDoor, enterInfo, scanTool, toolScanError, success, error }

class CreateAccountScreen extends StatefulWidget {
  const CreateAccountScreen({super.key});

  @override
  State<CreateAccountScreen> createState() => _CreateAccountScreenState();
}

class _CreateAccountScreenState extends State<CreateAccountScreen> {
  _Step _step = _Step.scanDoor;

  String? _doorCard;
  String? _errorMessage;

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _isLoading = false;
  int _toolScanAttempt = 0;

  void _fillDevData() {
    if (!kDebugMode) return;
    final rng = Random();
    final n = rng.nextInt(9000) + 1000;
    _nameController.text = 'Test User $n';
    _emailController.text = 'testuser$n@example.com';
    _phoneController.text = '415555${n.toString().padLeft(4, '0')}';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _onDoorCardScanned(String cardId) async {
    setState(() => _isLoading = true);
    try {
      final result = await KioskApi.lookupDoorCard(cardId);
      if (!mounted) return;
      if (result['found'] == true) {
        setState(() {
          _step = _Step.error;
          _errorMessage =
              'An account already exists for this door card (${result['name']}).\n\nPlease see an administrator for assistance.';
        });
      } else {
        setState(() {
          _doorCard = cardId;
          _step = _Step.enterInfo;
        });
      }
    } on KioskApiException catch (e) {
      setState(() {
        _step = _Step.error;
        _errorMessage = e.message;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _onInfoSubmitted() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _step = _Step.scanTool);
  }

  Future<void> _onToolCardScanned(String cardId) async {
    setState(() => _isLoading = true);
    try {
      await KioskApi.createAccount(
        doorCard: _doorCard!,
        toolCard: cardId,
        name: _nameController.text.trim(),
        email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        phone: _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.replaceAll(RegExp(r'\D'), ''),
      );
      if (!mounted) return;
      setState(() => _step = _Step.success);
    } on KioskApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _step = _Step.toolScanError;
        _errorMessage = e.message;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    switch (_step) {
      case _Step.scanDoor:
        return DoorCardScanPrompt(onCardScanned: _onDoorCardScanned);

      case _Step.enterInfo:
        return SingleChildScrollView(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: GestureDetector(
                  onDoubleTap: _fillDevData,
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Enter your details',
                          style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),
                        KioskTextField(
                          label: 'Full Name',
                          controller: _nameController,
                          isRequired: true,
                          validator: (v) =>
                              (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                        ),
                        const SizedBox(height: 20),
                        KioskTextField(
                          label: 'Phone Number',
                          controller: _phoneController,
                          hint: '10 digits, e.g. 4155550123',
                          keyboardType: TextInputType.phone,
                          validator: (v) {
                            if (v == null || v.isEmpty) return null;
                            final digits = v.replaceAll(RegExp(r'\D'), '');
                            if (digits.length != 10) return 'Enter a 10-digit phone number';
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),
                        KioskTextField(
                          label: 'Email Address',
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 40),
                        SizedBox(
                          height: 64,
                          child: ElevatedButton(
                            onPressed: _onInfoSubmitted,
                            style: ElevatedButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'Next — Scan Tool Card',
                              style: TextStyle(fontSize: 20),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );

      case _Step.scanTool:
        return ToolCardScanPrompt(
          key: ValueKey(_toolScanAttempt),
          message: 'Place the tool card flat on the RFID reader',
          onCardScanned: _onToolCardScanned,
        );

      case _Step.toolScanError:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 100, color: Colors.red),
                const SizedBox(height: 24),
                Text(
                  _errorMessage ?? 'An unexpected error occurred.',
                  style: const TextStyle(fontSize: 22),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                ElevatedButton(
                  onPressed: () => setState(() {
                    _toolScanAttempt++;
                    _step = _Step.scanTool;
                  }),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Try Again', style: TextStyle(fontSize: 22)),
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => context.go('/home'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Back to Menu', style: TextStyle(fontSize: 22)),
                ),
              ],
            ),
          ),
        );

      case _Step.success:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, size: 100, color: Colors.green),
                const SizedBox(height: 24),
                const Text(
                  'Account created!',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  'Welcome, ${_nameController.text.trim()}.\nYour door card and tool card are now registered.',
                  style: const TextStyle(fontSize: 20),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Done', style: TextStyle(fontSize: 22)),
                ),
              ],
            ),
          ),
        );

      case _Step.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 100, color: Colors.red),
                const SizedBox(height: 24),
                Text(
                  _errorMessage ?? 'An unexpected error occurred.',
                  style: const TextStyle(fontSize: 22),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Back to Menu', style: TextStyle(fontSize: 22)),
                ),
              ],
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return KioskScaffold(
      title: 'Create a New Account',
      child: _buildBody(),
    );
  }
}
