import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/kiosk_api.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/kiosk_button.dart';
import '../widgets/door_card_scan_prompt.dart';

enum _Step { scanDoor, menu, error }

class ManageAccountScreen extends StatefulWidget {
  final int? userId;
  final String? userName;
  final List<Map<String, dynamic>>? tools;
  final List<Map<String, dynamic>>? checkoutTools;

  const ManageAccountScreen({super.key, this.userId, this.userName, this.tools, this.checkoutTools});

  @override
  State<ManageAccountScreen> createState() => _ManageAccountScreenState();
}

class _ManageAccountScreenState extends State<ManageAccountScreen> {
  late _Step _step;
  bool _isLoading = false;
  int? _userId;
  String? _userName;
  List<Map<String, dynamic>> _tools = [];
  List<Map<String, dynamic>> _checkoutTools = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.userId != null) {
      _userId = widget.userId;
      _userName = widget.userName;
      _tools = widget.tools ?? [];
      _checkoutTools = widget.checkoutTools ?? [];
      _step = _Step.menu;
    } else {
      _step = _Step.scanDoor;
    }
  }

  Future<void> _onDoorCardScanned(String cardId) async {
    setState(() => _isLoading = true);
    try {
      final result = await KioskApi.getUserTools(cardId);
      final resultCheckout = await KioskApi.checkoutGetUserTools(cardId);
      if (!mounted) return;
      if (result['found'] != true) {
        setState(() {
          _step = _Step.error;
          _errorMessage =
              'No account found for this door card.\n\nIf you are new, please select "Create a New Account" from the menu.';
        });
        return;
      }
      setState(() {
        _userId = result['userId'] as int;
        _userName = result['name'] as String;
        _tools = (result['tools'] as List<dynamic>).cast<Map<String, dynamic>>();
        if (resultCheckout['found'] == true) {
          _checkoutTools = (resultCheckout['tools'] as List<dynamic>).cast<Map<String, dynamic>>();
        }
        _step = _Step.menu;
      });
    } on KioskApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _step = _Step.error;
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

      case _Step.menu:
        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Welcome, $_userName!',
                    style: const TextStyle(
                        fontSize: 28, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'What would you like to do?',
                    style: TextStyle(fontSize: 20, color: Colors.black54),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
                  KioskButton(
                    label: 'Replace a Lost or Damaged Tool Card',
                    icon: Icons.credit_card_off,
                    onPressed: () => context.push(
                      '/replace-card',
                      extra: {'userId': _userId, 'name': _userName},
                    ),
                  ),
                  const SizedBox(height: 24),
                  KioskButton(
                    label: 'What Tools Am I Authorized to Use?',
                    icon: Icons.build_outlined,
                    onPressed: () => context.push(
                      '/my-tools',
                      extra: {'userId': _userId, 'name': _userName, 'tools': _tools},
                    ),
                  ),
                  const SizedBox(height: 24),
                  KioskButton(
                    label: 'Tool Checkout',
                    icon: Icons.handshake,
                    onPressed: () => context.push(
                      '/tool-checkout',
                      extra: {'userId': _userId, 'name': _userName, 'tools': _checkoutTools},
                    ),
                  ),
                ],
              ),
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
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Back to Menu',
                      style: TextStyle(fontSize: 22)),
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
      title: 'Manage Existing Account',
      child: _buildBody(),
    );
  }
}
