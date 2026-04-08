import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'keyboard_controller.dart';
import 'on_screen_keyboard.dart';

/// Common scaffold used by all kiosk screens.
///
/// Hosts the [KeyboardController] and [KeyboardScope] so any [KioskTextField]
/// inside can register itself and receive on-screen keyboard input.
/// The keyboard panel slides in at the bottom when a field is focused.
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

  @override
  void dispose() {
    _keyboardController.dispose();
    super.dispose();
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
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
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
                        context.go('/home');
                      },
                    )
                  : null,
            ),
            body: SafeArea(
              child: Column(
                children: [
                  Expanded(child: widget.child),
                  AnimatedSize(
                    duration: const Duration(milliseconds: 150),
                    curve: Curves.easeOut,
                    child: _keyboardController.isVisible
                        ? OnScreenKeyboard(controller: _keyboardController)
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
