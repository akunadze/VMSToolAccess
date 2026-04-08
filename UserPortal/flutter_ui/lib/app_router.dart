import 'package:go_router/go_router.dart';
import 'screens/home_screen.dart';
import 'screens/manage_account_screen.dart';
import 'screens/create_account_screen.dart';
import 'screens/replace_card_screen.dart';
import 'screens/found_card_screen.dart';

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
      builder: (ctx, state) => const ManageAccountScreen(),
    ),
    GoRoute(
      path: '/create-account',
      builder: (ctx, state) => const CreateAccountScreen(),
    ),
    GoRoute(
      path: '/replace-card',
      builder: (ctx, state) => const ReplaceCardScreen(),
    ),
    GoRoute(
      path: '/found-card',
      builder: (ctx, state) => const FoundCardScreen(),
    ),
  ],
);
