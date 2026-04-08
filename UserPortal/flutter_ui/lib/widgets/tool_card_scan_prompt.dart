import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/card_events.dart';

/// Displays a "Please scan your tool card" prompt and listens for a tool card
/// scan event from the MFRC522 reader.
///
/// Navigates back to /home automatically after [timeout] with no interaction.
class ToolCardScanPrompt extends StatefulWidget {
  final void Function(String cardId) onCardScanned;
  final String message;
  final Duration timeout;

  const ToolCardScanPrompt({
    super.key,
    required this.onCardScanned,
    this.message = 'Hold the card near the RFID reader',
    this.timeout = const Duration(seconds: 60),
  });

  @override
  State<ToolCardScanPrompt> createState() => _ToolCardScanPromptState();
}

class _ToolCardScanPromptState extends State<ToolCardScanPrompt> {
  StreamSubscription<String>? _subscription;
  Timer? _timeoutTimer;

  @override
  void initState() {
    super.initState();
    _subscription = CardEventService.toolCardScans.listen((cardId) {
      if (mounted) widget.onCardScanned(cardId);
    });
    _timeoutTimer = Timer(widget.timeout, () {
      if (mounted) context.go('/home');
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _timeoutTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.credit_card,
              size: 100,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 32),
            const Text(
              'Please scan your tool card',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              widget.message,
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            const CircularProgressIndicator(strokeWidth: 3),
          ],
        ),
      ),
    );
  }
}
