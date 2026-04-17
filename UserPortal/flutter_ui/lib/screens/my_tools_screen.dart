import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/kiosk_scaffold.dart';

class MyToolsScreen extends StatelessWidget {
  final int userId;
  final String userName;
  final List<Map<String, dynamic>> tools;

  const MyToolsScreen({
    super.key,
    required this.userId,
    required this.userName,
    required this.tools,
  });

  @override
  Widget build(BuildContext context) {
    return KioskScaffold(
      title: 'My Authorized Tools',
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.person, size: 36, color: Colors.blue),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        userName,
                        style: const TextStyle(
                            fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  tools.isEmpty
                      ? 'You are not authorized to use any tools yet.'
                      : 'You are authorized to use ${tools.length} tool(s):',
                  style: const TextStyle(fontSize: 18, color: Colors.black54),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: tools.isEmpty
                      ? const Center(
                          child: Icon(Icons.handyman_outlined,
                              size: 80, color: Colors.black12),
                        )
                      : ListView.separated(
                          itemCount: tools.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            return ListTile(
                              leading: const Icon(Icons.build_outlined,
                                  size: 28, color: Colors.blue),
                              title: Text(
                                tools[index]['name'] as String,
                                style: const TextStyle(fontSize: 20),
                              ),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: ElevatedButton(
                    onPressed: () => context.pop(),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 40, vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Done', style: TextStyle(fontSize: 22)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
