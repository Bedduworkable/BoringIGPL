import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Get current user
  User? get currentUser => _auth.currentUser;

  // Auth state changes
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Sign in with email and password
  Future<UserModel?> signInWithEmailAndPassword(String email, String password) async {
    try {
      print("🔐 Attempting sign in for: $email");
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        print("✅ Sign in successful, fetching user data...");
        return await getUserData(credential.user!.uid);
      }
      return null;
    } on FirebaseAuthException catch (e) {
      print("❌ Firebase Auth error during sign in: ${e.code} - ${e.message}");
      throw _handleAuthException(e);
    } catch (e) {
      print("❌ General error during sign in: $e");
      throw 'Sign in failed: $e';
    }
  }

  // Register with email and password
  Future<UserModel?> registerWithEmailAndPassword(
      String email,
      String password,
      String name,
      ) async {
    try {
      print("📝 Starting registration for: $email with name: '$name'");

      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        print("✅ Firebase user created: ${credential.user!.uid}");

        final user = UserModel(
          uid: credential.user!.uid,
          name: name,
          email: email,
          role: 'employee',    // Add default role
          status: 'active',    // Add default status
        );

        print("📄 Creating Firestore document with data: ${user.toMap()}");

// Add explicit error handling for Firestore write
        try {
          await _firestore
              .collection('users')
              .doc(credential.user!.uid)
              .set(user.toMap());

          print("✅ Firestore document created successfully");
          return user;

        } catch (firestoreError) {
          print("❌ Firestore error: $firestoreError");
          throw 'Failed to create user profile: $firestoreError';
        }
      }
      return null;
    } on FirebaseAuthException catch (e) {
      print("❌ Firebase Auth error during registration: ${e.code} - ${e.message}");
      throw _handleAuthException(e);
    } catch (e) {
      print("❌ General error during registration: $e");

      // Handle the specific PigeonUserDetails error
      if (e.toString().contains('PigeonUserDetails')) {
        print("🔄 PigeonUserDetails error detected, but user was created. Creating Firestore document...");

        // User was actually created successfully, just create the document
        final currentUser = _auth.currentUser;
        if (currentUser != null) {
          try {
            final user = UserModel(
              uid: currentUser.uid,
              name: name,
              email: email,
              role: 'employee',    // Add default role
              status: 'active',    // Add default status
            );

            await _firestore
                .collection('users')
                .doc(currentUser.uid)
                .set(user.toMap());

            print("✅ Firestore document created after PigeonUserDetails error");
            return user;
          } catch (firestoreError) {
            print("❌ Failed to create document after PigeonUserDetails error: $firestoreError");
          }
        }
      }

      throw 'Registration failed: $e';
    }
  }

  // Get user data from Firestore
  Future<UserModel?> getUserData(String uid) async {
    try {
      print("📥 Fetching user data for UID: $uid");
      final doc = await _firestore.collection('users').doc(uid).get();

      if (doc.exists) {
        print("✅ User document found: ${doc.data()}");
        return UserModel.fromMap(doc.data()!, uid);
      } else {
        print("❌ User document not found for UID: $uid");
        return null;
      }
    } catch (e) {
      print("❌ Error fetching user data: $e");
      throw 'Failed to get user data: $e';
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      print("🚪 Signing out user");
      await _auth.signOut();
      print("✅ Sign out successful");
    } catch (e) {
      print("❌ Error during sign out: $e");
      throw 'Sign out failed: $e';
    }
  }

  // Get all users for assignment
  Future<List<UserModel>> getAllUsers() async {
    try {
      print("👥 Fetching all users");
      final snapshot = await _firestore.collection('users').get();
      final users = snapshot.docs
          .map((doc) => UserModel.fromMap(doc.data(), doc.id))
          .toList();
      print("✅ Found ${users.length} users");
      return users;
    } catch (e) {
      print("❌ Error fetching users: $e");
      throw 'Failed to get users: $e';
    }
  }

  String _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return 'No user found with this email.';
      case 'wrong-password':
        return 'Wrong password provided.';
      case 'email-already-in-use':
        return 'An account already exists with this email.';
      case 'weak-password':
        return 'The password provided is too weak.';
      case 'invalid-email':
        return 'The email address is not valid.';
      case 'permission-denied':
        return 'Permission denied. Please check your account settings.';
      case 'unavailable':
        return 'Service temporarily unavailable. Please try again.';
      default:
        return 'Authentication failed: ${e.message}';
    }
  }
}