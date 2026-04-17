import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/kiosk_api.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/tool_card_scan_prompt.dart';

enum _Step { confirm, scanTool, toolScanError, success }

class ReplaceCardScreen extends StatefulWidget {
  final int userId;
  final String userName;

  const ReplaceCardScreen({
    super.key,
    required this.userId,
    required this.userName,
  });

  @override
  State<ReplaceCardScreen> createState() => _ReplaceCardScreenState();
}

class _ReplaceCardScreenState extends State<ReplaceCardScreen> {
  _Step _step = _Step.confirm;
  String? _errorMessage;
  bool _isLoading = false;
  int _toolScanAttempt = 0;

  Future<void> _onToolCardScanned(String cardId) async {
    setState(() => _isLoading = true);
    try {
      await KioskApi.replaceCard(userId: widget.userId, newToolCard: cardId);
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
      case _Step.confirm:
        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Padding(
              padding: const EdgeInsets.all(48),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person, size: 80, color: Colors.blue),
                  const SizedBox(height: 24),
                  Text(
                    'Account found: ${widget.userName}',
                    style: const TextStyle(
                        fontSize: 26, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Scan your new tool card to replace the old one.\nYour previous card will be deactivated immediately.',
                    style: TextStyle(fontSize: 20),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      OutlinedButton(
                        onPressed: () => context.pop(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Cancel',
                            style: TextStyle(fontSize: 20)),
                      ),
                      const SizedBox(width: 24),
                      ElevatedButton(
                        onPressed: () =>
                            setState(() => _step = _Step.scanTool),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Continue',
                            style: TextStyle(fontSize: 20)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );

      case _Step.scanTool:
        return ToolCardScanPrompt(
          key: ValueKey(_toolScanAttempt),
          message: 'Place the new tool card flat on the RFID reader',
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
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Try Again', style: TextStyle(fontSize: 22)),
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => context.go('/home'),
                  style: OutlinedButton.styleFrom(
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
                  'Tool card replaced!',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  'Your new card is now active, ${widget.userName}.\nYour old card has been deactivated.',
                  style: const TextStyle(fontSize: 20),
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
                  child: const Text('Done', style: TextStyle(fontSize: 22)),
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
      title: 'Replace a Tool Card',
      child: _buildBody(),
    );
  }
}
