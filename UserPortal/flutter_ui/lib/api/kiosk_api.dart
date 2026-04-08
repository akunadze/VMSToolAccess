import 'dart:convert';
import 'package:http/http.dart' as http;

class KioskApiException implements Exception {
  final String message;
  KioskApiException(this.message);

  @override
  String toString() => message;
}

/// All HTTP calls to the local kiosk server at localhost:4000/kiosk-api,
/// which proxies them to the main HTTPS server.
class KioskApi {
  static const _base = 'http://localhost:4000/kiosk-api';

  static Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await http.post(
      Uri.parse('$_base$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    if (decoded['error'] != null) {
      throw KioskApiException(decoded['error'] as String);
    }
    return (decoded['data'] as Map<String, dynamic>?) ?? {};
  }

  /// Look up a user by their door card ID.
  ///
  /// Returns `{ 'found': true, 'userId': int, 'name': String }` if registered,
  /// or `{ 'found': false }` if not.
  static Future<Map<String, dynamic>> lookupDoorCard(String doorCard) =>
      _post('/lookup-door-card', {'doorCard': doorCard});

  /// Create a new account with a door card and tool card both assigned.
  ///
  /// Returns `{ 'userId': int }`.
  static Future<Map<String, dynamic>> createAccount({
    required String doorCard,
    required String toolCard,
    required String name,
    required String password,
    String? email,
    String? phone,
  }) =>
      _post('/create-account', {
        'doorCard': doorCard,
        'toolCard': toolCard,
        'name': name,
        'password': password,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      });

  /// Assign a new tool card to an existing user account.
  static Future<void> replaceCard({
    required int userId,
    required String newToolCard,
    String reason = 'lost',
  }) async {
    await _post('/replace-card', {
      'userId': userId,
      'newToolCard': newToolCard,
      'reason': reason,
    });
  }

  /// Report a found tool card. The card is detached from the owner's account
  /// so they can be issued a replacement.
  ///
  /// Returns `{ 'wasRegistered': bool, 'userName': String? }`.
  static Future<Map<String, dynamic>> reportFoundCard(String toolCard) =>
      _post('/report-found-card', {'toolCard': toolCard});
}
