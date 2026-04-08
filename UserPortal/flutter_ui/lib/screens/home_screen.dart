import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/kiosk_button.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return KioskScaffold(
      title: 'Tool Library Kiosk',
      showBackButton: false,
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
                  'How can we help you today?',
                  style: TextStyle(fontSize: 24, color: Colors.black54),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),
                KioskButton(
                  label: 'Create a New Account',
                  icon: Icons.person_add,
                  onPressed: () => context.go('/create-account'),
                ),
                const SizedBox(height: 24),
                KioskButton(
                  label: 'Manage an Existing Account',
                  icon: Icons.manage_accounts,
                  onPressed: () => context.go('/manage-account'),
                ),
                const SizedBox(height: 24),
                KioskButton(
                  label: 'I Found a Lost Tool Card',
                  icon: Icons.search,
                  onPressed: () => context.go('/found-card'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
