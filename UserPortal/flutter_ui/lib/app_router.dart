import 'package:go_router/go_router.dart';
import 'screens/home_screen.dart';
import 'screens/manage_account_screen.dart';
import 'screens/create_account_screen.dart';
import 'screens/replace_card_screen.dart';
import 'screens/found_card_screen.dart';
import 'screens/tool_checkout_screen.dart';
import 'screens/my_tools_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/home',
  redirect: (ctx, state) {
    if (state.matchedLocation == '/') return '/home';
    return null;
  },
  routes: [
    GoRoute(
      path: '/home',
      builder: (ctx, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/manage-account',
      builder: (ctx, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return ManageAccountScreen(
          userId: extra?['userId'] as int?,
          userName: extra?['name'] as String?,
          tools: (extra?['tools'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>(),
        );
      },
    ),
    GoRoute(
      path: '/create-account',
      builder: (ctx, state) => const CreateAccountScreen(),
    ),
    GoRoute(
      path: '/replace-card',
      builder: (ctx, state) {
        final extra = state.extra as Map<String, dynamic>;
        return ReplaceCardScreen(
          userId: extra['userId'] as int,
          userName: extra['name'] as String,
        );
      },
    ),
    GoRoute(
      path: '/found-card',
      builder: (ctx, state) => const FoundCardScreen(),
    ),
    GoRoute(
      path: '/tool-checkout',
      builder: (ctx, state) {
        final extra = state.extra as Map<String, dynamic>;
        return ToolCheckoutScreen(
          userId: extra['userId'] as int,
          userName: extra['name'] as String,
          authorizedTools: (extra['tools'] as List<dynamic>)
              .cast<Map<String, dynamic>>(),
        );
      },
    ),
    GoRoute(
      path: '/my-tools',
      builder: (ctx, state) {
        final extra = state.extra as Map<String, dynamic>;
        return MyToolsScreen(
          userId: extra['userId'] as int,
          userName: extra['name'] as String,
          tools: (extra['tools'] as List<dynamic>).cast<Map<String, dynamic>>(),
        );
      },
    ),
  ],
);
