import 'package:flutter/material.dart';
import 'package:flutter/widget_previews.dart';

@Preview(name: 'KioskButton')
Widget previewKioskButton() => KioskButton(
      label: 'Check Out Tool',
      icon: Icons.build,
      onPressed: () {},
    );

/// Large, touch-friendly button for the kiosk home menu.
class KioskButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const KioskButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 120,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 40),
            const SizedBox(width: 20),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
