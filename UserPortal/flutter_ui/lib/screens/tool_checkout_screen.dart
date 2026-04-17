import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/kiosk_api.dart';
import '../api/card_events.dart';
import '../widgets/kiosk_scaffold.dart';

enum _Step { selectTools, scanUserCards, confirm, success, error }

class ToolCheckoutScreen extends StatefulWidget {
  final int userId;
  final String userName;
  final List<Map<String, dynamic>> authorizedTools;

  const ToolCheckoutScreen({
    super.key,
    required this.userId,
    required this.userName,
    required this.authorizedTools,
  });

  @override
  State<ToolCheckoutScreen> createState() => _ToolCheckoutScreenState();
}

class _ToolCheckoutScreenState extends State<ToolCheckoutScreen> {
  _Step _step = _Step.selectTools;
  bool _isLoading = false;
  String? _errorMessage;

  final ScrollController _toolListScrollController = ScrollController();
  final Set<int> _selectedToolIds = {};

  final List<Map<String, dynamic>> _scannedUsers = [];
  String? _lastScanMessage;
  StreamSubscription<String>? _toolCardSubscription;

  @override
  void dispose() {
    _toolCardSubscription?.cancel();
    _toolListScrollController.dispose();
    super.dispose();
  }

  void _startListeningForUserCards() {
    _toolCardSubscription?.cancel();
    _toolCardSubscription = CardEventService.toolCardScans.listen((cardId) {
      if (mounted) _onUserCardScanned(cardId);
    });
  }

  void _stopListeningForUserCards() {
    _toolCardSubscription?.cancel();
    _toolCardSubscription = null;
  }

  Future<void> _onUserCardScanned(String cardId) async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _lastScanMessage = null;
    });
    try {
      final result = await KioskApi.checkoutLookupToolCard(cardId);
      if (!mounted) return;
      if (result['found'] != true) {
        setState(() => _lastScanMessage = 'Card not registered. Try another card.');
        return;
      }
      final userId = result['userId'] as int;
      final name = result['name'] as String;
      if (_scannedUsers.any((u) => u['userId'] == userId)) {
        setState(() => _lastScanMessage = '$name is already in the list.');
        return;
      }
      setState(() {
        _scannedUsers.add({'userId': userId, 'name': name});
        _lastScanMessage = '$name added.';
      });
    } on KioskApiException catch (e) {
      if (!mounted) return;
      setState(() => _lastScanMessage = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmCheckout() async {
    setState(() => _isLoading = true);
    try {
      await KioskApi.checkoutAddPermissions(
        toolIds: _selectedToolIds.toList(),
        userIds: _scannedUsers.map((u) => u['userId'] as int).toList(),
      );
      if (!mounted) return;
      setState(() => _step = _Step.success);
    } on KioskApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _step = _Step.error;
        _errorMessage = e.message;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildBody() {
    if (_isLoading && _step != _Step.scanUserCards) {
      return const Center(child: CircularProgressIndicator());
    }

    switch (_step) {
      case _Step.selectTools:
        return Padding(
          padding: const EdgeInsets.all(32),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.person, size: 36, color: Colors.blue),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            widget.userName,
                            style: const TextStyle(
                                fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Select the tools to grant access to:',
                      style: TextStyle(fontSize: 18, color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: Scrollbar(
                        controller: _toolListScrollController,
                        thumbVisibility: true,
                        child: ListView.separated(
                          controller: _toolListScrollController,
                          itemCount: widget.authorizedTools.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final tool = widget.authorizedTools[index];
                            final toolId = tool['id'] as int;
                            final toolName = tool['name'] as String;
                            final selected = _selectedToolIds.contains(toolId);
                            return CheckboxListTile(
                              value: selected,
                              title: Text(toolName,
                                  style: const TextStyle(fontSize: 20)),
                              onChanged: (checked) => setState(() {
                                if (checked == true) {
                                  _selectedToolIds.add(toolId);
                                } else {
                                  _selectedToolIds.remove(toolId);
                                }
                              }),
                              controlAffinity: ListTileControlAffinity.leading,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 32),
              SizedBox(
                width: 160,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ElevatedButton(
                      onPressed: _selectedToolIds.isEmpty
                          ? null
                          : () => setState(() {
                                _step = _Step.scanUserCards;
                                _startListeningForUserCards();
                              }),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Next', style: TextStyle(fontSize: 20)),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () => context.pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child:
                          const Text('Cancel', style: TextStyle(fontSize: 20)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );

      case _Step.scanUserCards:
        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Scan tool cards to add users',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Hold each person\'s card near the RFID reader. Tap Done when finished.',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.credit_card,
                          size: 48,
                          color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 12),
                      if (_isLoading)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        ),
                    ],
                  ),
                  if (_lastScanMessage != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _lastScanMessage!,
                      style: TextStyle(
                        fontSize: 16,
                        color: _lastScanMessage!.contains('added')
                            ? Colors.green[700]
                            : Colors.orange[800],
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 16),
                  if (_scannedUsers.isNotEmpty) ...[
                    Text(
                      'Users to add (${_scannedUsers.length}):',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.separated(
                        itemCount: _scannedUsers.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final user = _scannedUsers[index];
                          return ListTile(
                            leading: const Icon(Icons.person_outline),
                            title: Text(user['name'] as String,
                                style: const TextStyle(fontSize: 18)),
                            trailing: IconButton(
                              icon: const Icon(Icons.remove_circle_outline,
                                  color: Colors.red),
                              onPressed: () =>
                                  setState(() => _scannedUsers.removeAt(index)),
                            ),
                          );
                        },
                      ),
                    ),
                  ] else
                    const Expanded(child: SizedBox()),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: () => setState(() {
                          _stopListeningForUserCards();
                          _step = _Step.selectTools;
                        }),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child:
                            const Text('Back', style: TextStyle(fontSize: 20)),
                      ),
                      const Spacer(),
                      ElevatedButton(
                        onPressed: _scannedUsers.isEmpty
                            ? null
                            : () => setState(() {
                                  _stopListeningForUserCards();
                                  _step = _Step.confirm;
                                }),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 40, vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child:
                            const Text('Done', style: TextStyle(fontSize: 20)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );

      case _Step.confirm:
        final selectedTools = widget.authorizedTools
            .where((t) => _selectedToolIds.contains(t['id'] as int))
            .toList();
        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.checklist, size: 64, color: Colors.blue),
                  const SizedBox(height: 16),
                  const Text(
                    'Confirm Access Grant',
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  _SummarySection(
                    label: 'Tools (${selectedTools.length}):',
                    items:
                        selectedTools.map((t) => t['name'] as String).toList(),
                  ),
                  const SizedBox(height: 16),
                  _SummarySection(
                    label: 'Users to add (${_scannedUsers.length}):',
                    items:
                        _scannedUsers.map((u) => u['name'] as String).toList(),
                  ),
                  const Spacer(),
                  if (_isLoading)
                    const Center(child: CircularProgressIndicator()),
                  if (!_isLoading)
                    Row(
                      children: [
                        OutlinedButton(
                          onPressed: () => setState(() {
                            _step = _Step.scanUserCards;
                            _startListeningForUserCards();
                          }),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 32, vertical: 16),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Back',
                              style: TextStyle(fontSize: 20)),
                        ),
                        const Spacer(),
                        ElevatedButton(
                          onPressed: _confirmCheckout,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 40, vertical: 16),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Confirm',
                              style: TextStyle(fontSize: 20)),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        );

      case _Step.success:
        final selectedTools = widget.authorizedTools
            .where((t) => _selectedToolIds.contains(t['id'] as int))
            .toList();
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, size: 100, color: Colors.green),
                const SizedBox(height: 24),
                const Text(
                  'Access granted!',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  '${_scannedUsers.length} user(s) can now access '
                  '${selectedTools.length} tool(s).',
                  style: const TextStyle(fontSize: 20),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Done', style: TextStyle(fontSize: 22)),
                ),
              ],
            ),
          ),
        );

      case _Step.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 100, color: Colors.red),
                const SizedBox(height: 24),
                Text(
                  _errorMessage ?? 'An unexpected error occurred.',
                  style: const TextStyle(fontSize: 22),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                ElevatedButton(
                  onPressed: () => setState(() => _step = _Step.confirm),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Try Again',
                      style: TextStyle(fontSize: 22)),
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => context.go('/home'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Back to Menu',
                      style: TextStyle(fontSize: 22)),
                ),
              ],
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return KioskScaffold(
      title: 'Tool Checkout',
      child: _buildBody(),
    );
  }
}

class _SummarySection extends StatelessWidget {
  final String label;
  final List<String> items;

  const _SummarySection({required this.label, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
            child: Row(
              children: [
                const Icon(Icons.circle, size: 8, color: Colors.black54),
                const SizedBox(width: 8),
                Expanded(
                    child:
                        Text(item, style: const TextStyle(fontSize: 17))),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
