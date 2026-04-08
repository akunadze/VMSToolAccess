import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/kiosk_api.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/tool_card_scan_prompt.dart';

enum _Step { scanTool, success, error }

class FoundCardScreen extends StatefulWidget {
  const FoundCardScreen({super.key});

  @override
  State<FoundCardScreen> createState() => _FoundCardScreenState();
}

class _FoundCardScreenState extends State<FoundCardScreen> {
  _Step _step = _Step.scanTool;

  bool _wasRegistered = false;
  String? _ownerName;
  String? _errorMessage;
  bool _isLoading = false;

  Future<void> _onToolCardScanned(String cardId) async {
    setState(() => _isLoading = true);
    try {
      final result = await KioskApi.reportFoundCard(cardId);
      if (!mounted) return;
      setState(() {
        _wasRegistered = result['wasRegistered'] == true;
        _ownerName = result['userName'] as String?;
        _step = _Step.success;
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
      case _Step.scanTool:
        return ToolCardScanPrompt(
          message: 'Hold the found card flat on the RFID reader',
          onCardScanned: _onToolCardScanned,
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
                  'Thank you for returning the card!',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  _wasRegistered
                      ? 'This card belonged to ${_ownerName ?? 'a registered member'}.\nIt has been deactivated so they can be issued a replacement.\n\nPlease leave the card at the front desk.'
                      : 'This card was not registered in our system.\nPlease leave the card at the front desk.',
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
      title: 'I Found a Lost Tool Card',
      child: _buildBody(),
    );
  }
}
