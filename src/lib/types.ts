import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type QuestionType = "mcq" | "msq" | "tf" | "text";

export interface QuestionOption {
  value: string;
}

export interface Question {
  id: string;
  questionText: string;
  type: QuestionType;
  imageUrl?: string;
  options: QuestionOption[];
  correctAnswers: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  durationMinutes: number;
  maxAttempts: number | null;
  cheatingProtection: boolean;
  expiresAt: Timestamp | null;
  createdAt: Timestamp;
  questions: Question[];
  questionCount: number;
}

export interface Answer {
  questionId: string;
  value: string | string[];
}

export interface Attempt {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  userName: string | null;
  answers: Answer[];
  score: number;
  totalQuestions: number;
  cheatingViolations: number;
  startedAt: Timestamp;
  submittedAt: Timestamp;
  timeTakenSeconds: number;
}

export interface AttemptResult extends Attempt {
    questions: (Question & { userAnswer: string | string[] | null, isCorrect: boolean })[];
}
