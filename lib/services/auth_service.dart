import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../models/master_invitation_model.dart';

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
          role: 'user',    // Default role is user
          status: 'pending',    // Pending until linked to master
          createdAt: DateTime.now(),
        );

        print("📄 Creating Firestore document with data: ${user.toMap()}");

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

      if (e.toString().contains('PigeonUserDetails')) {
        print("🔄 PigeonUserDetails error detected, but user was created. Creating Firestore document...");

        final currentUser = _auth.currentUser;
        if (currentUser != null) {
          try {
            final user = UserModel(
              uid: currentUser.uid,
              name: name,
              email: email,
              role: 'user',
              status: 'pending',
              createdAt: DateTime.now(),
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

  // Get all masters (for user to choose from)
  Future<List<UserModel>> getAllMasters() async {
    try {
      print("👑 Fetching all masters");
      final snapshot = await _firestore
          .collection('users')
          .where('role', isEqualTo: 'master')
          .where('status', isEqualTo: 'active')
          .get();

      final masters = snapshot.docs
          .map((doc) => UserModel.fromMap(doc.data(), doc.id))
          .toList();

      print("✅ Found ${masters.length} masters");
      return masters;
    } catch (e) {
      print("❌ Error fetching masters: $e");
      throw 'Failed to get masters: $e';
    }
  }

  // Send invitation to master
  Future<void> sendMasterInvitation(String masterUID, String? message) async {
    try {
      final currentUserData = await getUserData(_auth.currentUser!.uid);
      final masterData = await getUserData(masterUID);

      if (currentUserData == null || masterData == null) {
        throw 'User or Master data not found';
      }

      if (!currentUserData.isUser) {
        throw 'Only users can send master invitations';
      }

      if (!masterData.isMaster) {
        throw 'Target user is not a master';
      }

      // Check if invitation already exists
      final existingInvite = await _firestore
          .collection('master_invitations')
          .where('fromUserUID', isEqualTo: currentUserData.uid)
          .where('toMasterUID', isEqualTo: masterUID)
          .where('status', isEqualTo: 'pending')
          .get();

      if (existingInvite.docs.isNotEmpty) {
        throw 'Invitation already sent to this master';
      }

      final invitation = MasterInvitationModel(
        id: '',
        fromUserUID: currentUserData.uid,
        fromUserName: currentUserData.name,
        fromUserEmail: currentUserData.email,
        toMasterUID: masterUID,
        toMasterName: masterData.name,
        toMasterEmail: masterData.email,
        status: 'pending',
        createdAt: DateTime.now(),
        message: message,
      );

      await _firestore.collection('master_invitations').add(invitation.toMap());

      // Update user's pending invites
      await _firestore.collection('users').doc(currentUserData.uid).update({
        'pendingInvites': FieldValue.arrayUnion([masterUID])
      });

      print("✅ Master invitation sent successfully");
    } catch (e) {
      print("❌ Error sending master invitation: $e");
      throw 'Failed to send invitation: $e';
    }
  }

  // Get pending invitations for a master
  Future<List<MasterInvitationModel>> getPendingInvitations(String masterUID) async {
    try {
      final snapshot = await _firestore
          .collection('master_invitations')
          .where('toMasterUID', isEqualTo: masterUID)
          .where('status', isEqualTo: 'pending')
          .orderBy('createdAt', descending: true)
          .get();

      return snapshot.docs
          .map((doc) => MasterInvitationModel.fromMap(doc.data(), doc.id))
          .toList();
    } catch (e) {
      print("❌ Error fetching pending invitations: $e");
      throw 'Failed to get pending invitations: $e';
    }
  }

  // Accept master invitation
  Future<void> acceptMasterInvitation(String invitationId) async {
    try {
      final inviteDoc = await _firestore.collection('master_invitations').doc(invitationId).get();

      if (!inviteDoc.exists) {
        throw 'Invitation not found';
      }

      final invitation = MasterInvitationModel.fromMap(inviteDoc.data()!, invitationId);

      // Update invitation status
      await _firestore.collection('master_invitations').doc(invitationId).update({
        'status': 'accepted',
        'respondedAt': FieldValue.serverTimestamp(),
      });

      // Link user to master
      await _firestore.collection('users').doc(invitation.fromUserUID).update({
        'masterUID': invitation.toMasterUID,
        'status': 'active',
        'linkedAt': FieldValue.serverTimestamp(),
        'pendingInvites': FieldValue.arrayRemove([invitation.toMasterUID])
      });

      // Decline any other pending invitations from this user
      final otherInvites = await _firestore
          .collection('master_invitations')
          .where('fromUserUID', isEqualTo: invitation.fromUserUID)
          .where('status', isEqualTo: 'pending')
          .get();

      final batch = _firestore.batch();
      for (var doc in otherInvites.docs) {
        if (doc.id != invitationId) {
          batch.update(doc.reference, {
            'status': 'declined',
            'respondedAt': FieldValue.serverTimestamp(),
          });
        }
      }
      await batch.commit();

      print("✅ Master invitation accepted successfully");
    } catch (e) {
      print("❌ Error accepting master invitation: $e");
      throw 'Failed to accept invitation: $e';
    }
  }

  // Decline master invitation
  Future<void> declineMasterInvitation(String invitationId) async {
    try {
      final inviteDoc = await _firestore.collection('master_invitations').doc(invitationId).get();

      if (!inviteDoc.exists) {
        throw 'Invitation not found';
      }

      final invitation = MasterInvitationModel.fromMap(inviteDoc.data()!, invitationId);

      await _firestore.collection('master_invitations').doc(invitationId).update({
        'status': 'declined',
        'respondedAt': FieldValue.serverTimestamp(),
      });

      // Remove from user's pending invites
      await _firestore.collection('users').doc(invitation.fromUserUID).update({
        'pendingInvites': FieldValue.arrayRemove([invitation.toMasterUID])
      });

      print("✅ Master invitation declined successfully");
    } catch (e) {
      print("❌ Error declining master invitation: $e");
      throw 'Failed to decline invitation: $e';
    }
  }

  // Get users under a master
  Future<List<UserModel>> getUsersUnderMaster(String masterUID) async {
    try {
      final snapshot = await _firestore
          .collection('users')
          .where('masterUID', isEqualTo: masterUID)
          .where('status', isEqualTo: 'active')
          .get();

      return snapshot.docs
          .map((doc) => UserModel.fromMap(doc.data(), doc.id))
          .toList();
    } catch (e) {
      print("❌ Error fetching users under master: $e");
      throw 'Failed to get users under master: $e';
    }
  }

  // Remove user from master (only master can do this)
  Future<void> removeUserFromMaster(String userUID) async {
    try {
      await _firestore.collection('users').doc(userUID).update({
        'masterUID': null,
        'status': 'pending',
        'linkedAt': null,
      });

      print("✅ User removed from master successfully");
    } catch (e) {
      print("❌ Error removing user from master: $e");
      throw 'Failed to remove user from master: $e';
    }
  }

  // Get all users for assignment (role-based)
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