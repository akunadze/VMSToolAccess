import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/card_events.dart';

/// Displays a "Please scan your door card" prompt and listens for a door card
/// scan event from the HID reader.
///
/// Navigates back to /home automatically after [timeout] with no interaction.
class DoorCardScanPrompt extends StatefulWidget {
  final void Function(String cardId) onCardScanned;
  final Duration timeout;

  const DoorCardScanPrompt({
    super.key,
    required this.onCardScanned,
    this.timeout = const Duration(seconds: 60),
  });

  @override
  State<DoorCardScanPrompt> createState() => _DoorCardScanPromptState();
}

class _DoorCardScanPromptState extends State<DoorCardScanPrompt> {
  StreamSubscription<String>? _subscription;
  Timer? _timeoutTimer;

  @override
  void initState() {
    super.initState();
    _subscription = CardEventService.doorCardScans.listen((cardId) {
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
              Icons.badge,
              size: 100,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 32),
            const Text(
              'Please scan your door card',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Hold your card near the reader on the left',
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
