import 'package:flutter/material.dart';
import 'package:flutter/widget_previews.dart';
import 'keyboard_controller.dart';

enum _ShiftState { off, once, locked }
enum _KeyboardMode { letters, numbers }

// ---------------------------------------------------------------------------
// Key layout definition
// ---------------------------------------------------------------------------

class _Key {
  final String display;
  final String? chars; // null = special key handled by type
  final _KeyType type;
  final double flex;

  const _Key(this.display,
      {this.chars, this.type = _KeyType.char, this.flex = 1.0});
}

enum _KeyType { char, shift, backspace, space, done, modeToggle }

const _lettersRows = [
  [
    _Key('q', chars: 'q'), _Key('w', chars: 'w'), _Key('e', chars: 'e'),
    _Key('r', chars: 'r'), _Key('t', chars: 't'), _Key('y', chars: 'y'),
    _Key('u', chars: 'u'), _Key('i', chars: 'i'), _Key('o', chars: 'o'),
    _Key('p', chars: 'p'),
  ],
  [
    _Key('a', chars: 'a'), _Key('s', chars: 's'), _Key('d', chars: 'd'),
    _Key('f', chars: 'f'), _Key('g', chars: 'g'), _Key('h', chars: 'h'),
    _Key('j', chars: 'j'), _Key('k', chars: 'k'), _Key('l', chars: 'l'),
  ],
  [
    _Key('⇧', type: _KeyType.shift, flex: 1.5),
    _Key('z', chars: 'z'), _Key('x', chars: 'x'), _Key('c', chars: 'c'),
    _Key('v', chars: 'v'), _Key('b', chars: 'b'), _Key('n', chars: 'n'),
    _Key('m', chars: 'm'),
    _Key('⌫', type: _KeyType.backspace, flex: 1.5),
  ],
  [
    _Key('123', type: _KeyType.modeToggle, flex: 2.0),
    _Key('', type: _KeyType.space, flex: 5.0),
    _Key('Done', type: _KeyType.done, flex: 2.0),
  ],
];

const _numbersRows = [
  [
    _Key('1', chars: '1'), _Key('2', chars: '2'), _Key('3', chars: '3'),
    _Key('4', chars: '4'), _Key('5', chars: '5'), _Key('6', chars: '6'),
    _Key('7', chars: '7'), _Key('8', chars: '8'), _Key('9', chars: '9'),
    _Key('0', chars: '0'),
  ],
  [
    _Key('@', chars: '@'), _Key('.', chars: '.'), _Key('-', chars: '-'),
    _Key('_', chars: '_'), _Key('#', chars: '#'), _Key('!', chars: '!'),
    _Key('?', chars: '?'), _Key('/', chars: '/'), _Key('+', chars: '+'),
    _Key('=', chars: '='),
  ],
  [
    _Key('⌫  Backspace', type: _KeyType.backspace, flex: 10.0),
  ],
  [
    _Key('ABC', type: _KeyType.modeToggle, flex: 2.0),
    _Key('', type: _KeyType.space, flex: 5.0),
    _Key('Done', type: _KeyType.done, flex: 2.0),
  ],
];

// ---------------------------------------------------------------------------
// OnScreenKeyboard widget
// ---------------------------------------------------------------------------

@Preview(name: 'OnScreenKeyboard – letters')
Widget previewOnScreenKeyboardLetters() =>
    OnScreenKeyboard(controller: KeyboardController());

@Preview(name: 'OnScreenKeyboard – numbers')
Widget previewOnScreenKeyboardNumbers() {
  final ctrl = KeyboardController();
  return OnScreenKeyboard(controller: ctrl);
}

class OnScreenKeyboard extends StatefulWidget {
  final KeyboardController controller;

  const OnScreenKeyboard({super.key, required this.controller});

  @override
  State<OnScreenKeyboard> createState() => _OnScreenKeyboardState();
}

class _OnScreenKeyboardState extends State<OnScreenKeyboard> {
  _ShiftState _shift = _ShiftState.off;
  _KeyboardMode _mode = _KeyboardMode.letters;

  void _handleKey(_Key key) {
    switch (key.type) {
      case _KeyType.char:
        String char = key.chars!;
        if (_mode == _KeyboardMode.letters &&
            _shift != _ShiftState.off) {
          char = char.toUpperCase();
          if (_shift == _ShiftState.once) {
            setState(() => _shift = _ShiftState.off);
          }
        }
        widget.controller.insertText(char);

      case _KeyType.shift:
        setState(() {
          _shift = switch (_shift) {
            _ShiftState.off => _ShiftState.once,
            _ShiftState.once => _ShiftState.locked,
            _ShiftState.locked => _ShiftState.off,
          };
        });

      case _KeyType.backspace:
        widget.controller.backspace();

      case _KeyType.space:
        widget.controller.insertText(' ');

      case _KeyType.done:
        widget.controller.hide();

      case _KeyType.modeToggle:
        setState(() {
          _mode = _mode == _KeyboardMode.letters
              ? _KeyboardMode.numbers
              : _KeyboardMode.letters;
        });
    }
  }

  Color _keyColor(_Key key, ThemeData theme) {
    return switch (key.type) {
      _KeyType.done => theme.colorScheme.primary,
      _KeyType.shift when _shift == _ShiftState.locked =>
        theme.colorScheme.secondary,
      _KeyType.shift when _shift == _ShiftState.once =>
        theme.colorScheme.primaryContainer,
      _KeyType.backspace || _KeyType.modeToggle => Colors.grey.shade300,
      _ => Colors.white,
    };
  }

  Color _keyTextColor(_Key key, ThemeData theme) {
    return switch (key.type) {
      _KeyType.done => theme.colorScheme.onPrimary,
      _KeyType.shift when _shift == _ShiftState.locked =>
        theme.colorScheme.onSecondary,
      _ => Colors.black87,
    };
  }

  Widget _buildKey(_Key key, ThemeData theme) {
    final bg = _keyColor(key, theme);
    final fg = _keyTextColor(key, theme);

    // Choose display label
    String label = key.display;
    if (key.type == _KeyType.char &&
        _mode == _KeyboardMode.letters &&
        _shift != _ShiftState.off) {
      label = label.toUpperCase();
    }

    return Expanded(
      flex: (key.flex * 10).round(),
      child: Padding(
        padding: const EdgeInsets.all(2.5),
        child: Material(
          color: bg,
          borderRadius: BorderRadius.circular(7),
          elevation: 1,
          child: InkWell(
            borderRadius: BorderRadius.circular(7),
            onTap: () => _handleKey(key),
            child: Center(
              child: key.type == _KeyType.space
                  ? const Icon(Icons.space_bar, size: 22, color: Colors.black54)
                  : Text(
                      label,
                      style: TextStyle(
                        fontSize: key.type == _KeyType.char ? 18 : 15,
                        fontWeight: FontWeight.w500,
                        color: fg,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rows = _mode == _KeyboardMode.letters ? _lettersRows : _numbersRows;

    return Container(
      color: Colors.grey.shade200,
      padding: const EdgeInsets.fromLTRB(6, 6, 6, 10),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: rows.map((row) {
          return SizedBox(
            height: 52,
            child: Row(
              children: row.map((key) => _buildKey(key, theme)).toList(),
            ),
          );
        }).toList(),
      ),
    );
  }
}
