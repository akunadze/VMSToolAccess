import 'package:flutter/material.dart';
import 'keyboard_controller.dart';

/// Large-font text input that drives the on-screen keyboard instead of the
/// system keyboard. Tapping the field registers it with the nearest
/// [KeyboardScope] and shows the keyboard panel at the bottom of the screen.
class KioskTextField extends StatefulWidget {
  final String label;
  final TextEditingController controller;
  final String? hint;
  final bool isRequired;
  final bool obscureText;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;

  const KioskTextField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.isRequired = false,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.validator,
  });

  @override
  State<KioskTextField> createState() => _KioskTextFieldState();
}

class _KioskTextFieldState extends State<KioskTextField> {
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode.addListener(() {
      if (_focusNode.hasFocus) {
        KeyboardScope.of(context).show(widget.controller);
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  void _requestKeyboard() {
    // Bring the on-screen keyboard up for this field
    KeyboardScope.of(context).show(widget.controller);
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _requestKeyboard,
      child: TextFormField(
        controller: widget.controller,
        focusNode: _focusNode,
        // readOnly prevents the system keyboard from appearing; all input comes
        // from the on-screen keyboard via KeyboardController.insertText().
        readOnly: true,
        showCursor: true,
        obscureText: widget.obscureText,
        style: const TextStyle(fontSize: 22),
        decoration: InputDecoration(
          labelText: widget.isRequired ? '${widget.label} *' : widget.label,
          hintText: widget.hint,
          labelStyle: const TextStyle(fontSize: 20),
          border: const OutlineInputBorder(),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          suffixIcon: IconButton(
            icon: const Icon(Icons.keyboard, size: 28),
            tooltip: 'Open keyboard',
            onPressed: _requestKeyboard,
          ),
        ),
        validator: widget.validator,
      ),
    );
  }
}
