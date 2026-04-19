import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

export interface SRSData {
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReview: Date;
}

/**
 * Simplified SM-2 Algorithm
 * @param quality User rating from 0 to 5
 * @param currentRepetition Current number of successful repetitions
 * @param currentInterval Current interval in days
 * @param currentEaseFactor Current ease factor
 */
export function calculateSRS(
  quality: number,
  currentRepetition: number,
  currentInterval: number,
  currentEaseFactor: number
): SRSData {
  let repetition = currentRepetition;
  let interval = currentInterval;
  let easeFactor = currentEaseFactor;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition++;
  } else {
    repetition = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    repetition,
    interval,
    easeFactor,
    nextReview,
  };
}

export async function updateWordSRS(
  wordId: string,
  quality: number,
  currentRepetition: number = 0,
  currentInterval: number = 0,
  currentEaseFactor: number = 2.5
) {
  const result = calculateSRS(quality, currentRepetition, currentInterval, currentEaseFactor);
  
  const docRef = doc(db, 'savedWords', wordId);
  await updateDoc(docRef, {
    repetition: result.repetition,
    interval: result.interval,
    easeFactor: result.easeFactor,
    nextReview: Timestamp.fromDate(result.nextReview),
  });
}
