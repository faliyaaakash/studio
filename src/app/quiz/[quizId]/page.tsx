
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { Quiz } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ShieldAlert, Timer, CheckCircle, RotateCw } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizStartPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAttempts, setUserAttempts] = useState(0);

  useEffect(() => {
    if (!quizId) return;

    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const quizRef = doc(db, "quizzes", quizId);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
          setError("Quiz not found.");
          return;
        }

        const quizData = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
        setQuiz(quizData);

        // Fetch user's previous attempts if logged in
        if (user && quizData.maxAttempts) {
            const attemptsQuery = query(
                collection(db, "attempts"),
                where("quizId", "==", quizId),
                where("userId", "==", user.uid)
            );
            const attemptsSnap = await getDocs(attemptsQuery);
            setUserAttempts(attemptsSnap.size);
        }

      } catch (e) {
        console.error("Error fetching quiz", e);
        setError("Failed to load quiz details.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId, user]);

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Card className="w-full max-w-2xl">
           <CardHeader className="text-center">
             <Skeleton className="h-8 w-3/4 mx-auto" />
             <Skeleton className="h-4 w-full mt-2 mx-auto" />
           </CardHeader>
           <CardContent className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
             </div>
             <Skeleton className="h-20 w-full" />
             <div className="text-center">
                <Skeleton className="h-12 w-40 mx-auto" />
             </div>
           </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quiz) {
    return (
       <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
        <Card className="w-full max-w-md p-6">
          <CardTitle className="text-2xl text-destructive">Error</CardTitle>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{error || "An unknown error occurred."}</p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = quiz.expiresAt && quiz.expiresAt.toDate() < new Date();
  const hasExceededAttempts = quiz.maxAttempts !== null && userAttempts >= quiz.maxAttempts;
  const canAttempt = !isExpired && !hasExceededAttempts;

  if (!canAttempt) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Quiz Not Available</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {isExpired ? "This quiz has expired." : `You have reached the maximum of ${quiz.maxAttempts} attempts for this quiz.`}
            </p>
            <Button asChild className="mt-6">
                <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const StartButton = () => (
     <Button asChild className="w-full md:w-auto" size="lg">
        <Link href={`/quiz/${quizId}/take`}>Start Quiz</Link>
     </Button>
  );

  return (
    <div className="container mx-auto py-12 flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">{quiz.title}</CardTitle>
          <CardDescription className="text-base pt-2">{quiz.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <Timer className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">Duration</h3>
              <p className="text-muted-foreground">{quiz.durationMinutes} minutes</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <CheckCircle className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">Questions</h3>
              <p className="text-muted-foreground">{quiz.questionCount} questions</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <RotateCw className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">Attempts</h3>
              <p className="text-muted-foreground">{quiz.maxAttempts ? `${userAttempts} / ${quiz.maxAttempts} taken` : "Unlimited"}</p>
            </div>
          </div>
          {quiz.cheatingProtection && (
            <div className="flex items-start gap-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <ShieldAlert className="h-6 w-6 text-amber-600 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-700">Cheating Protection Enabled</h3>
                <p className="text-sm text-muted-foreground">
                  Switching tabs, minimizing the window, or losing focus will be monitored. The quiz will be automatically submitted after a warning.
                </p>
              </div>
            </div>
          )}
          <div className="text-center pt-4">
            {quiz.cheatingProtection ? (
               <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button className="w-full md:w-auto" size="lg">Start Quiz</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you ready to begin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Please read the rules carefully before starting.
                        <ul className="mt-4 list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            <li>The timer will start as soon as you proceed.</li>
                            <li>Do not switch tabs or minimize the browser.</li>
                            <li>Your first violation will result in a warning.</li>
                            <li>A second violation will automatically submit your quiz.</li>
                        </ul>
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                       <Link href={`/quiz/${quizId}/take`}>I understand, proceed</Link>
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            ) : <StartButton /> }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
