
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Quiz, Attempt } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizResultsDashboard() {
  const { quizId } = useParams<{ quizId: string }>();
  const [quizDetails, setQuizDetails] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        // Fetch quiz details
        const quizRef = doc(db, "quizzes", quizId);
        const quizSnap = await getDoc(quizRef);
        if (quizSnap.exists()) {
          setQuizDetails({ id: quizSnap.id, ...quizSnap.data() } as Quiz);
        } else {
          throw new Error("Quiz not found");
        }

        // Fetch all attempts for this quiz
        const attemptsQuery = query(
          collection(db, "attempts"),
          where("quizId", "==", quizId),
          orderBy("submittedAt", "desc")
        );
        const attemptsSnap = await getDocs(attemptsQuery);
        const attemptsData = attemptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attempt));
        setAttempts(attemptsData);

      } catch (error) {
        console.error("Error fetching quiz results: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [quizId]);

  const averageScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, acc) => sum + (acc.score / acc.totalQuestions) * 100, 0) / attempts.length)
    : 0;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-8 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!quizDetails) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Quiz not found</h2>
        <Button asChild className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline">Results for "{quizDetails.title}"</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attempts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Attempts</CardTitle>
            <CardDescription>A list of all users who attempted this quiz.</CardDescription>
          </div>
          {/* <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button> */}
        </CardHeader>
        <CardContent>
          {attempts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time Taken</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.userName || "Anonymous"}</TableCell>
                    <TableCell>{attempt.score} / {attempt.totalQuestions}</TableCell>
                    <TableCell>{formatTime(attempt.timeTakenSeconds)}</TableCell>
                    <TableCell>
                      <span className={attempt.cheatingViolations > 0 ? "text-destructive font-bold" : ""}>
                        {attempt.cheatingViolations}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{format(attempt.submittedAt.toDate(), "PPP")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No one has attempted this quiz yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
