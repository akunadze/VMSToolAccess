import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/widget_previews.dart';
import '../api/card_events.dart';

@Preview(name: 'DoorCardScanPrompt')
Widget previewDoorCardScanPrompt() => DoorCardScanPrompt(onCardScanned: (_) {});

/// Displays a "Please scan your door card" prompt and listens for a door card
/// scan event from the HID reader.
class DoorCardScanPrompt extends StatefulWidget {
  final void Function(String cardId) onCardScanned;

  const DoorCardScanPrompt({
    super.key,
    required this.onCardScanned,
  });

  @override
  State<DoorCardScanPrompt> createState() => _DoorCardScanPromptState();
}

class _DoorCardScanPromptState extends State<DoorCardScanPrompt>
    with SingleTickerProviderStateMixin {
  StreamSubscription<String>? _subscription;
  late final AnimationController _animController;
  late final Animation<double> _cardProgress;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..repeat();
    // Sequence: slide in → hold at reader → snap back
    _cardProgress = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 50,
      ),
      TweenSequenceItem(tween: ConstantTween(1.0), weight: 20),
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 0.0)
            .chain(CurveTween(curve: Curves.easeIn)),
        weight: 30,
      ),
    ]).animate(_animController);
    _subscription = CardEventService.doorCardScans.listen((cardId) {
      if (mounted) widget.onCardScanned(cardId);
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.badge, size: 100, color: primaryColor),
            const SizedBox(height: 32),
            const Text(
              'Please scan your door card',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Hold your card near the reader on the left',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            AnimatedBuilder(
              animation: _cardProgress,
              builder: (context, _) => CustomPaint(
                size: const Size(320, 180),
                painter: _CardReaderPainter(
                  progress: _cardProgress.value,
                  primaryColor: primaryColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardReaderPainter extends CustomPainter {
  final double progress;
  final Color primaryColor;

  const _CardReaderPainter({
    required this.progress,
    required this.primaryColor,
  });

  static const _readerX = 8.0;
  static const _readerW = 28.0;
  static const _readerH = 80.0;
  static const _screenX = 52.0;   // wider gap from reader
  static const _screenH = 148.0;
  static const _screenW = 92.5;  // 800:1280 = 5:8 → 148 × 5/8
  static const _cardW = 59.0;  // portrait ID badge (CR80 rotated)
  static const _cardH = 94.0;

  @override
  void paint(Canvas canvas, Size size) {
    final cy = size.height / 2;
    final readerTop = cy - _readerH / 2;
    _drawScreen(canvas, cy);
    _drawReader(canvas, _readerX, readerTop);
    _drawWaves(canvas, _readerX + _readerW, cy);
    _drawCard(canvas, size.width, cy);
  }

  // Halves the RGB components of a colour, leaving alpha unchanged.
  Color _dim(Color c) => Color.fromARGB(
        (c.a * 255.0).round().clamp(0, 255),
        (c.r * 255.0).round().clamp(0, 255) ~/ 2,
        (c.g * 255.0).round().clamp(0, 255) ~/ 2,
        (c.b * 255.0).round().clamp(0, 255) ~/ 2,
      );

  void _drawScreen(Canvas canvas, double cy) {
    const bezel = 10.0;
    final screenY = cy - _screenH / 2;
    final outerRect = Rect.fromLTWH(_screenX, screenY, _screenW, _screenH);
    final outerRR = RRect.fromRectAndRadius(outerRect, const Radius.circular(9));

    // Ambient glow (outside bezel – unchanged)
    canvas.drawRRect(
      RRect.fromRectAndRadius(outerRect.inflate(7), const Radius.circular(16)),
      Paint()
        ..color = primaryColor.withValues(alpha: 0.13)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9),
    );

    // Bezel (unchanged)
    canvas.drawRRect(outerRR, Paint()..color = const Color(0xFF1C1C1C));
    canvas.drawRRect(
      outerRR,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.07)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0,
    );

    // Display area – all colours below are pre-dimmed to 50 % brightness
    final disp = Rect.fromLTWH(
      _screenX + bezel,
      screenY + bezel,
      _screenW - bezel * 2,
      _screenH - bezel * 2,
    );
    // Background: 0xFFF4F6FF → each channel ÷ 2 = 0xFF7A7B7F
    canvas.drawRRect(
      RRect.fromRectAndRadius(disp, const Radius.circular(4)),
      Paint()..color = const Color(0xFF7A7B7F),
    );

    // App bar
    canvas.drawRect(
      Rect.fromLTWH(disp.left, disp.top, disp.width, 16),
      Paint()..color = _dim(primaryColor),
    );
    // Title stub: white → 0x7F7F7F, same alpha
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(disp.left + 6, disp.top + 5, disp.width * 0.44, 6),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFF7F7F7F).withValues(alpha: 0.65),
    );

    // Menu buttons – 3 rows × 2 columns
    const btnH = 21.0;
    const gap = 4.0;
    const pad = 4.0;
    final btnW = (disp.width - pad * 2 - gap) / 2;
    final btnTop = disp.top + 16 + gap;
    // Button fill: white → 0x7F7F7F
    final btnFill = Paint()..color = const Color(0xFF7F7F7F);
    // Button border: 0xFFC8D0EC → 0xFF646876
    final btnBorder = Paint()
      ..color = const Color(0xFF646876)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;

    for (int row = 0; row < 3; row++) {
      for (int col = 0; col < 2; col++) {
        final bx = disp.left + pad + col * (btnW + gap);
        final by = btnTop + row * (btnH + gap);
        final br = RRect.fromRectAndRadius(
          Rect.fromLTWH(bx, by, btnW, btnH),
          const Radius.circular(3),
        );
        canvas.drawRRect(br, btnFill);
        canvas.drawRRect(br, btnBorder);
        // Icon stub
        canvas.drawCircle(
          Offset(bx + 8, by + btnH / 2),
          4,
          Paint()..color = _dim(primaryColor).withValues(alpha: 0.28),
        );
        // Label stub: 0xFFD8DEEE → 0xFF6C6F77
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(bx + 16, by + btnH / 2 - 3, btnW - 20, 6),
            const Radius.circular(2),
          ),
          Paint()..color = const Color(0xFF6C6F77),
        );
      }
    }
  }

  void _drawReader(Canvas canvas, double x, double top) {
    final rect = Rect.fromLTWH(x, top, _readerW, _readerH);
    final rr = RRect.fromRectAndRadius(rect, const Radius.circular(6));

    // Body
    canvas.drawRRect(rr, Paint()..color = const Color(0xFF222222));

    // Edge highlight
    canvas.drawRRect(
      rr,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.09)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0,
    );

    final ledCenter = Offset(x + _readerW / 2, top + 13);
    final ledOn = progress > 0.62 && progress < 0.92;

    // LED glow
    if (ledOn) {
      canvas.drawCircle(
        ledCenter,
        9,
        Paint()
          ..color = Colors.greenAccent.withValues(alpha: 0.28)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
      );
    }
    // LED dot
    canvas.drawCircle(
      ledCenter,
      4.5,
      Paint()..color = ledOn ? Colors.greenAccent : const Color(0xFF383838),
    );

    // HID logo bar
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(x + 6, top + _readerH - 20, _readerW - 12, 8),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFF383838),
    );

    // Mount bracket stubs (top and bottom, flush with screen edge)
    final bracketPaint = Paint()..color = const Color(0xFF1A1A1A);
    canvas.drawRect(Rect.fromLTWH(x + 6, top - 7, _readerW - 12, 9), bracketPaint);
    canvas.drawRect(Rect.fromLTWH(x + 6, top + _readerH - 2, _readerW - 12, 9), bracketPaint);
  }

  void _drawWaves(Canvas canvas, double ox, double oy) {
    if (progress < 0.3) return;
    final t = ((progress - 0.3) / 0.35).clamp(0.0, 1.0);

    for (int i = 0; i < 3; i++) {
      final r = 14.0 + i * 11.0;
      final alpha = t * (1.0 - i * 0.28);
      canvas.drawArc(
        Rect.fromCenter(center: Offset(ox, oy), width: r * 2, height: r * 2),
        -math.pi / 3,
        2 * math.pi / 3,
        false,
        Paint()
          ..color = primaryColor.withValues(alpha: alpha * 0.75)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  void _drawCard(Canvas canvas, double canvasW, double cy) {
    const endX = _readerX + _readerW + 6.0;
    final startX = canvasW - _cardW - 8.0;
    final cardX = endX + (startX - endX) * (1.0 - progress);
    final cardY = cy - _cardH / 2;

    final rect = Rect.fromLTWH(cardX, cardY, _cardW, _cardH);
    final rr = RRect.fromRectAndRadius(rect, const Radius.circular(5));

    // Drop shadow
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect.shift(const Offset(3, 3)), const Radius.circular(5)),
      Paint()..color = Colors.black.withValues(alpha: 0.18),
    );

    // Badge body
    canvas.drawRRect(rr, Paint()..color = Colors.white);
    canvas.drawRRect(
      rr,
      Paint()
        ..color = const Color(0xFFC5CEEA)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0,
    );

    // Header band – light olive
    canvas.drawRRect(
      RRect.fromRectAndCorners(
        Rect.fromLTWH(cardX, cardY, _cardW, 20),
        topLeft: const Radius.circular(5),
        topRight: const Radius.circular(5),
      ),
      Paint()..color = const Color(0xFFB5B84A),
    );

    // Lanyard hole punched through header
    final holeCx = cardX + _cardW / 2;
    final holeCy = cardY + 7;
    canvas.drawCircle(Offset(holeCx, holeCy), 3.5,
        Paint()..color = Colors.white.withValues(alpha: 0.85));
    canvas.drawCircle(
      Offset(holeCx, holeCy),
      3.5,
      Paint()
        ..color = const Color(0xFFB5B84A).withValues(alpha: 0.6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8,
    );

    // Photo placeholder
    const photoW = 30.0;
    const photoH = 34.0;
    final photoX = cardX + (_cardW - photoW) / 2;
    final photoY = cardY + 24.0;
    final photoRect = Rect.fromLTWH(photoX, photoY, photoW, photoH);
    final photoRR = RRect.fromRectAndRadius(photoRect, const Radius.circular(2));
    canvas.drawRRect(photoRR, Paint()..color = const Color(0xFFE4E9F5));

    // Person silhouette clipped to photo
    canvas.save();
    canvas.clipRRect(photoRR);
    // Head
    canvas.drawCircle(
      Offset(photoX + photoW / 2, photoY + 11),
      7.5,
      Paint()..color = const Color(0xFFB8C3D8),
    );
    // Shoulders
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(photoX + photoW / 2, photoY + photoH + 4),
        width: photoW * 0.9,
        height: 18,
      ),
      Paint()..color = const Color(0xFFB8C3D8),
    );
    canvas.restore();

    // Name stripe
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cardX + 7, cardY + 62, _cardW - 14, 6),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFFD4DAF0),
    );

    // Title / org stripe (shorter)
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cardX + 11, cardY + 71, _cardW - 24, 4),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFFE2E6F4),
    );

    // ID number stripe at bottom
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cardX + 7, cardY + _cardH - 11, _cardW - 14, 4),
        const Radius.circular(1),
      ),
      Paint()..color = const Color(0xFFD4DAF0),
    );
  }

  @override
  bool shouldRepaint(_CardReaderPainter old) =>
      old.progress != progress || old.primaryColor != primaryColor;
}
