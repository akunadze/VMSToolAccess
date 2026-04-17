import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/card_events.dart';
import 'keyboard_controller.dart';
import 'on_screen_keyboard.dart';

const _kInactivityTimeout = Duration(seconds: 20);
const _kWarningDuration = Duration(seconds: 10);

/// Common scaffold used by all kiosk screens.
///
/// Hosts the [KeyboardController] and [KeyboardScope] so any [KioskTextField]
/// inside can register itself and receive on-screen keyboard input.
/// The keyboard panel slides in at the bottom when a field is focused.
///
/// Also manages an inactivity timer: after [_kInactivityTimeout] with no
/// pointer activity, a warning overlay is shown. If the user does not cancel
/// within [_kWarningDuration], the app navigates back to /home.
class KioskScaffold extends StatefulWidget {
  final String title;
  final Widget child;
  final bool showBackButton;

  const KioskScaffold({
    super.key,
    required this.title,
    required this.child,
    this.showBackButton = true,
  });

  @override
  State<KioskScaffold> createState() => _KioskScaffoldState();
}

class _KioskScaffoldState extends State<KioskScaffold> {
  final _keyboardController = KeyboardController();

  Timer? _inactivityTimer;
  Timer? _warningTicker;
  bool _showingWarning = false;
  int _warningSecondsLeft = _kWarningDuration.inSeconds;
  StreamSubscription<CardEvent>? _cardSubscription;

  bool get _timerActive => widget.showBackButton;

  @override
  void initState() {
    super.initState();
    if (_timerActive) {
      _resetInactivityTimer();
      _cardSubscription = CardEventService.events.listen((_) {
        if (mounted) _resetInactivityTimer();
      });
    }
  }

  @override
  void dispose() {
    _inactivityTimer?.cancel();
    _warningTicker?.cancel();
    _cardSubscription?.cancel();
    _keyboardController.dispose();
    super.dispose();
  }

  void _resetInactivityTimer() {
    _inactivityTimer?.cancel();
    _warningTicker?.cancel();
    if (_showingWarning) {
      setState(() {
        _showingWarning = false;
        _warningSecondsLeft = _kWarningDuration.inSeconds;
      });
    }
    _inactivityTimer = Timer(_kInactivityTimeout, _onInactivityTimeout);
  }

  void _onInactivityTimeout() {
    if (!mounted) return;
    setState(() {
      _showingWarning = true;
      _warningSecondsLeft = _kWarningDuration.inSeconds;
    });
    _warningTicker = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _warningSecondsLeft--);
      if (_warningSecondsLeft <= 0) {
        t.cancel();
        _keyboardController.hide();
        context.go('/home');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardScope(
      controller: _keyboardController,
      child: ListenableBuilder(
        listenable: _keyboardController,
        builder: (context, _) {
          return Scaffold(
            appBar: AppBar(
              title: Text(
                widget.title,
                style: const TextStyle(
                    fontSize: 22, fontWeight: FontWeight.bold),
              ),
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              automaticallyImplyLeading: false,
              leading: widget.showBackButton
                  ? IconButton(
                      icon: const Icon(Icons.arrow_back, size: 32),
                      tooltip: 'Back to menu',
                      onPressed: () {
                        _keyboardController.hide();
                        if (context.canPop()) {
                          context.pop();
                        } else {
                          context.go('/home');
                        }
                      },
                    )
                  : null,
            ),
            body: SafeArea(
              child: Listener(
                behavior: HitTestBehavior.translucent,
                onPointerDown: _timerActive
                    ? (_) => _resetInactivityTimer()
                    : null,
                child: Stack(
                  children: [
                    Column(
                      children: [
                        Expanded(child: widget.child),
                        AnimatedSize(
                          duration: const Duration(milliseconds: 150),
                          curve: Curves.easeOut,
                          child: _keyboardController.isVisible
                              ? OnScreenKeyboard(
                                  controller: _keyboardController)
                              : const SizedBox.shrink(),
                        ),
                      ],
                    ),
                    if (_showingWarning) _buildWarningOverlay(),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWarningOverlay() {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black54,
        child: Center(
          child: Card(
            elevation: 8,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: 48, vertical: 40),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.timer_outlined,
                      size: 64, color: Colors.orange),
                  const SizedBox(height: 20),
                  const Text(
                    'Still there?',
                    style: TextStyle(
                        fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Returning to the home screen in $_warningSecondsLeft second${_warningSecondsLeft == 1 ? '' : 's'}.',
                    style: const TextStyle(
                        fontSize: 20, color: Colors.black54),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: _resetInactivityTimer,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 48, vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Stay',
                        style: TextStyle(fontSize: 22)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
