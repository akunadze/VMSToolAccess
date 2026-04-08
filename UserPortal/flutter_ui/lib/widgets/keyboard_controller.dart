import 'package:flutter/material.dart';

/// Manages which [TextEditingController] the on-screen keyboard is currently
/// feeding input into, and whether the keyboard panel is visible.
class KeyboardController extends ChangeNotifier {
  TextEditingController? _target;

  bool get isVisible => _target != null;
  TextEditingController? get target => _target;

  void show(TextEditingController controller) {
    if (_target == controller) return;
    _target = controller;
    notifyListeners();
  }

  void hide() {
    if (_target == null) return;
    _target = null;
    notifyListeners();
  }

  /// Insert [text] at the current cursor position, replacing any selection.
  void insertText(String text) {
    final ctrl = _target;
    if (ctrl == null) return;
    final v = ctrl.value;
    final start = v.selection.start < 0 ? v.text.length : v.selection.start;
    final end = v.selection.end < 0 ? v.text.length : v.selection.end;
    final newText = v.text.replaceRange(start, end, text);
    ctrl.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: start + text.length),
    );
  }

  /// Delete the character before the cursor, or clear the current selection.
  void backspace() {
    final ctrl = _target;
    if (ctrl == null) return;
    final v = ctrl.value;
    if (v.selection.isCollapsed) {
      final pos = v.selection.start;
      if (pos <= 0) return;
      ctrl.value = TextEditingValue(
        text: v.text.replaceRange(pos - 1, pos, ''),
        selection: TextSelection.collapsed(offset: pos - 1),
      );
    } else {
      final start = v.selection.start;
      ctrl.value = TextEditingValue(
        text: v.text.replaceRange(v.selection.start, v.selection.end, ''),
        selection: TextSelection.collapsed(offset: start),
      );
    }
  }
}

/// Provides a [KeyboardController] to the widget tree so [KioskTextField]
/// can register itself when focused.
class KeyboardScope extends InheritedNotifier<KeyboardController> {
  const KeyboardScope({
    super.key,
    required KeyboardController controller,
    required super.child,
  }) : super(notifier: controller);

  static KeyboardController of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<KeyboardScope>();
    assert(scope != null, 'No KeyboardScope found in widget tree');
    return scope!.notifier!;
  }
}
