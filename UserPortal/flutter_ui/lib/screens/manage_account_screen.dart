import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/kiosk_button.dart';

class ManageAccountScreen extends StatelessWidget {
  const ManageAccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return KioskScaffold(
      title: 'Manage Existing Account',
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'What would you like to do?',
                  style: TextStyle(fontSize: 24, color: Colors.black54),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),
                KioskButton(
                  label: 'Replace a Lost or Damaged Tool Card',
                  icon: Icons.credit_card_off,
                  onPressed: () => context.go('/replace-card'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
