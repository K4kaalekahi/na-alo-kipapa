import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

export interface UserProgress {
  userId: string;
  points: number;
  streak: number;
  lastActive: any;
  badges: string[];
  displayName?: string | null;
  photoURL?: string | null;
  isPublic?: boolean;
}

export async function getUserProgress(userId: string): Promise<UserProgress | null> {
  const docRef = doc(db, 'userProgress', userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProgress;
  }
  return null;
}

export async function getAllUserProgress(limitCount: number = 5): Promise<UserProgress[]> {
  const q = query(
    collection(db, 'userProgress'), 
    where('isPublic', '==', true),
    orderBy('points', 'desc'), 
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as UserProgress);
}

export async function initializeProgress(userId: string, displayName?: string, photoURL?: string) {
  const docRef = doc(db, 'userProgress', userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    await setDoc(docRef, {
      userId,
      points: 0,
      streak: 0,
      lastActive: serverTimestamp(),
      badges: [],
      displayName: displayName || 'Learner',
      photoURL: photoURL || null,
      isPublic: true
    });
  } else if (displayName || photoURL) {
    // Sync display name if missing or updated
    const data = docSnap.data();
    if (data.displayName !== displayName || data.photoURL !== photoURL) {
      await updateDoc(docRef, {
        displayName: displayName || data.displayName || 'Learner',
        photoURL: photoURL || data.photoURL || null
      });
    }
  }
}

export async function addPoints(userId: string, amount: number) {
  const docRef = doc(db, 'userProgress', userId);
  await updateDoc(docRef, {
    points: increment(amount),
    lastActive: serverTimestamp()
  });
  
  // Check for badges
  const progress = await getUserProgress(userId);
  if (progress) {
    const newBadges = [...progress.badges];
    if (progress.points >= 100 && !newBadges.includes('Novice')) {
      newBadges.push('Novice');
    }
    if (progress.points >= 500 && !newBadges.includes('Scholar')) {
      newBadges.push('Scholar');
    }
    if (progress.points >= 1000 && !newBadges.includes('Sage')) {
      newBadges.push('Sage');
    }
    
    if (newBadges.length > progress.badges.length) {
      await updateDoc(docRef, { badges: newBadges });
    }
  }
}

export async function updateStreak(userId: string) {
  const docRef = doc(db, 'userProgress', userId);
  const progress = await getUserProgress(userId);
  
  if (progress) {
    const lastActive = progress.lastActive?.toDate();
    const now = new Date();
    
    if (lastActive) {
      // Create dates without time for comparison
      const lastDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffInDays = Math.floor((nowDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 1) {
        await updateDoc(docRef, { streak: increment(1) });
      } else if (diffInDays > 1) {
        await updateDoc(docRef, { streak: 1 });
      }
    } else {
      await updateDoc(docRef, { streak: 1 });
    }
    
    await updateDoc(docRef, { lastActive: serverTimestamp() });
  }
}
