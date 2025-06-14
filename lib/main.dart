import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/master_selection_screen.dart';
import 'screens/master_invitations_screen.dart';
import 'screens/lead_detail_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/leads_provider.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp();
    print("🔥 Firebase initialized successfully");

    // Initialize notifications
    await NotificationService.initialize();
    await NotificationService.requestPermissions();
    print("🔔 Notifications initialized successfully");
  } catch (e) {
    print("❌ Initialization error: $e");
  }

  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerStatefulWidget {
  const MyApp({super.key});

  @override
  ConsumerState<MyApp> createState() => _MyAppState();
}

class _MyAppState extends ConsumerState<MyApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    _setupNotificationHandling();
  }

  void _setupNotificationHandling() {
    // Handle notification clicks when app is opened from notification
    NotificationService.onNotificationClick = (String? payload) {
      print("🔔 Notification clicked with payload: $payload");
      if (payload != null && payload.startsWith('lead_reminder:')) {
        final leadId = payload.split(':')[1];
        _navigateToLeadReminders(leadId);
      }
    };
  }

  void _navigateToLeadReminders(String leadId) {
    print("🔍 Navigating to lead reminders for: $leadId");

    // Wait for the widget tree to be ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Get the current context and leads
      final context = _navigatorKey.currentContext;
      if (context != null) {
        final leadsAsync = ref.read(leadsProvider);
        leadsAsync.when(
          data: (leads) {
            final lead = leads.where((l) => l.id == leadId).firstOrNull;
            if (lead != null) {
              // Navigate to the lead detail screen with reminders tab
              _navigatorKey.currentState?.push(
                MaterialPageRoute(
                  builder: (context) => DefaultTabController(
                    length: 3,
                    initialIndex: 2, // Start with reminders tab (index 2)
                    child: LeadDetailScreen(lead: lead),
                  ),
                ),
              );
            } else {
              print("❌ Lead not found with ID: $leadId");
            }
          },
          loading: () => print("⏳ Leads still loading..."),
          error: (error, _) => print("❌ Error loading leads: $error"),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: 'Real Estate CRM',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          elevation: 2,
        ),
      ),
      home: authState.when(
        data: (user) {
          print("🔐 Auth state: ${user != null ? 'Logged in' : 'Not logged in'}");

          if (user == null) {
            return const LoginScreen();
          }

          // Check user's current state and navigate accordingly
          return ref.watch(currentUserProvider).when(
            data: (userData) {
              if (userData == null) {
                return const LoginScreen();
              }

              print("👤 User role: ${userData.role}, Status: ${userData.status}");

              // Role-based navigation
              switch (userData.role) {
                case 'admin':
                // Admin goes directly to dashboard
                  return const DashboardScreen();

                case 'master':
                // Master goes to dashboard (they can manage their team)
                  return const DashboardScreen();

                case 'user':
                // Check if user is linked to a master
                  if (userData.isLinkedToMaster) {
                    // User is linked, go to dashboard
                    return const DashboardScreen();
                  } else {
                    // User needs to select a master
                    return const MasterSelectionScreen();
                  }

                default:
                // Unknown role, show login
                  return const LoginScreen();
              }
            },
            loading: () {
              print("⏳ User data loading...");
              return const Scaffold(
                body: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 16),
                      Text('Loading user data...'),
                    ],
                  ),
                ),
              );
            },
            error: (error, stack) {
              print("❌ User data error: $error");
              return const LoginScreen();
            },
          );
        },
        loading: () {
          print("⏳ Auth state: Loading...");
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Initializing...'),
                ],
              ),
            ),
          );
        },
        error: (error, stack) {
          print("❌ Auth error: $error");
          return const LoginScreen();
        },
      ),
      debugShowCheckedModeBanner: false,

      // Define app routes for navigation
      routes: {
        '/login': (context) => const LoginScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/master-selection': (context) => const MasterSelectionScreen(),
        '/master-invitations': (context) => const MasterInvitationsScreen(),
      },
    );
  }
}

// Helper widget for navigation based on user role
class RoleBasedNavigator extends ConsumerWidget {
  const RoleBasedNavigator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(currentUserProvider).when(
      data: (userData) {
        if (userData == null) {
          return const LoginScreen();
        }

        switch (userData.role) {
          case 'admin':
            return const DashboardScreen();
          case 'master':
            return const DashboardScreen();
          case 'user':
            return userData.isLinkedToMaster
                ? const DashboardScreen()
                : const MasterSelectionScreen();
          default:
            return const LoginScreen();
        }
      },
      loading: () => const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading...'),
          ],
        ),
      ),
      error: (_, __) => const LoginScreen(),
    );
  }
}