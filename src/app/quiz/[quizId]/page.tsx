
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, orderBy } from "firebase/firestore";
import type { Quiz } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ShieldAlert, Timer, CheckCircle, RotateCw, Trash, Pencil } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function QuizStartPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAttempts, setUserAttempts] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null);

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
        if (user) {
          try {
            const attemptsQuery = query(
              collection(db, "attempts"),
              where("quizId", "==", quizId),
              where("userId", "==", user.uid),
              orderBy("submittedAt", "desc")
            );
            const attemptsSnap = await getDocs(attemptsQuery);
            setUserAttempts(attemptsSnap.size);
            if (!attemptsSnap.empty) {
              setLastAttemptId(attemptsSnap.docs[0].id);
            }
          } catch (err) {
            console.log("Error fetching attempts (likely index issue):", err);
            // Fallback if index missing
            const attemptsQueryFallback = query(
              collection(db, "attempts"),
              where("quizId", "==", quizId),
              where("userId", "==", user.uid)
            );
            const attemptsSnapFallback = await getDocs(attemptsQueryFallback);
            setUserAttempts(attemptsSnapFallback.size);
            if (!attemptsSnapFallback.empty) {
              // Client side sort if needed, or just take one
              setLastAttemptId(attemptsSnapFallback.docs[0].id);
            }
          }
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

  const handleDelete = async () => {
    if (!quizId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      toast({
        title: "Quiz Deleted",
        description: "The quiz has been successfully deleted.",
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the quiz. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  if (loading || !quiz) {
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
  }

  if (error || !quiz) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Error</CardTitle>
          </CardHeader>
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-2xl">Login Required</CardTitle>
            <CardDescription>You must be logged in to take this quiz.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-muted-foreground">
              Please sign in to access <strong>{quiz.title}</strong>.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild size="lg" className="w-full">
                <Link href={`/login?redirect=/quiz/${quizId}`}>Login</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href={`/signup?redirect=/quiz/${quizId}`}>Create Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = quiz.expiresAt && quiz.expiresAt.toDate() < new Date();
  const hasExceededAttempts = quiz.maxAttempts !== null && userAttempts >= quiz.maxAttempts;
  const isCreator = user.uid === quiz.createdBy;
  const canAttempt = !isExpired && !hasExceededAttempts;

  if (!canAttempt && !isCreator) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Quiz Not Available</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">
              {isExpired ? "This quiz has expired." : `You have reached the maximum of ${quiz.maxAttempts} attempts for this quiz.`}
            </p>
            <div className="flex flex-col gap-3">
              {lastAttemptId && (
                <Button asChild variant="default" className="w-full">
                  <Link href={`/results/${lastAttemptId}`}>View Your Previous Result</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
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
    <div className="container mx-auto py-12 flex items-center justify-center min-h-[calc(100vh-3.5rem)] relative">
      <Card className="w-full max-w-2xl relative">
        <CardHeader className="text-center relative">
          {isCreator && (
            <div className="absolute top-4 right-4 flex gap-2">
              <Button variant="ghost" size="icon" asChild title="Edit Quiz">
                <Link href={`/edit-quiz/${quizId}`}>
                  <Pencil className="h-5 w-5 text-muted-foreground hover:text-primary" />
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Delete Quiz" disabled={isDeleting}>
                    <Trash className="h-5 w-5 text-destructive hover:text-red-700" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{quiz.title}</strong>? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          <CardTitle className="text-3xl font-headline pt-6">{quiz.title}</CardTitle>
          <CardDescription className="text-base pt-2">{quiz.description}</CardDescription>
          {(!canAttempt && isCreator) && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm border border-yellow-200">
              <strong>Creator Mode:</strong> This quiz is currently unavailable to regular users
              ({isExpired ? "Expired" : "Max attempts reached"}), but you can still access it.
            </div>
          )}
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
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="text-sm text-muted-foreground pl-4">
                    <ul className="list-disc list-inside space-y-2">
                      <li>The timer will start as soon as you proceed.</li>
                      <li>Do not switch tabs or minimize the browser.</li>
                      <li>Your first violation will result in a warning.</li>
                      <li>A second violation will automatically submit your quiz.</li>
                    </ul>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Link href={`/quiz/${quizId}/take`}>I understand, proceed</Link>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : <StartButton />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
