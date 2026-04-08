import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class CardEvent {
  final String type; // 'door-card' or 'tool-card'
  final String cardId;
  const CardEvent({required this.type, required this.cardId});
}

/// Maintains a persistent WebSocket connection to the Electron kiosk server
/// and exposes card scan events as typed streams.
///
/// Call [connect] once at app startup. The connection will automatically
/// reconnect on drop.
class CardEventService {
  static const _wsUrl = 'ws://localhost:4000/card-events';
  static const _reconnectDelay = Duration(seconds: 2);

  static final _controller = StreamController<CardEvent>.broadcast();
  static WebSocketChannel? _channel;
  static bool _disposed = false;

  /// Connects to the WebSocket server and begins forwarding events.
  static void connect() {
    if (_disposed) return;
    try {
      _channel = WebSocketChannel.connect(Uri.parse(_wsUrl));
      _channel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message as String) as Map<String, dynamic>;
            _controller.add(CardEvent(
              type: data['type'] as String,
              cardId: data['cardId'] as String,
            ));
          } catch (_) {
            // Ignore malformed messages
          }
        },
        onError: (_) => _scheduleReconnect(),
        onDone: () => _scheduleReconnect(),
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  static void _scheduleReconnect() {
    if (_disposed) return;
    Future.delayed(_reconnectDelay, connect);
  }

  /// All card events from both readers.
  static Stream<CardEvent> get events => _controller.stream;

  /// Only door card scans (from the HID reader).
  static Stream<String> get doorCardScans =>
      events.where((e) => e.type == 'door-card').map((e) => e.cardId);

  /// Only tool card scans (from the MFRC522 reader).
  static Stream<String> get toolCardScans =>
      events.where((e) => e.type == 'tool-card').map((e) => e.cardId);
}
