
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import type { Quiz, Attempt } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit, Users, BarChart, Copy, Link as LinkIcon, Trash, Pencil } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createdQuizzes, setCreatedQuizzes] = useState<Quiz[]>([]);
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch created quizzes
        const createdQuery = query(collection(db, "quizzes"), where("createdBy", "==", user.uid), orderBy("createdAt", "desc"));
        const createdSnapshot = await getDocs(createdQuery);
        const createdData = createdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
        setCreatedQuizzes(createdData);

        // Fetch attempted quizzes
        const attemptedQuery = query(collection(db, "attempts"), where("userId", "==", user.uid), orderBy("submittedAt", "desc"));
        const attemptedSnapshot = await getDocs(attemptedQuery);
        const attemptedData = attemptedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attempt));
        setAttemptedQuizzes(attemptedData);

      } catch (error: any) {
        console.error("Error fetching dashboard data: ", error);
        toast({
          title: "Data Fetch Error",
          description: error.message || "Could not fetch dashboard data. Check console for details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const copyQuizLink = (quizId: string) => {
    const link = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied!", description: "Quiz link copied to clipboard." });
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      setCreatedQuizzes(prev => prev.filter(q => q.id !== quizId));
      toast({
        title: "Quiz Deleted",
        description: "The quiz has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the quiz. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
          <p className="text-muted-foreground">Manage your quizzes and view your results.</p>
        </div>
        <Button asChild>
          <Link href="/create-quiz">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Quiz
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="my-quizzes">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="my-quizzes">My Quizzes</TabsTrigger>
          <TabsTrigger value="my-attempts">My Attempts</TabsTrigger>
        </TabsList>
        <TabsContent value="my-quizzes" className="mt-6">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[220px] w-full" />)}
            </div>
          ) : createdQuizzes.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {createdQuizzes.map((quiz) => (
                <Card key={quiz.id}>
                  <CardHeader>
                    <CardTitle className="truncate">{quiz.title}</CardTitle>
                    <CardDescription>{quiz.questionCount} questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      <p>Created on {format(quiz.createdAt.toDate(), 'PPP')}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between flex-wrap gap-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyQuizLink(quiz.id)}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/quiz/${quiz.id}/results`}>
                          <BarChart className="mr-2 h-4 w-4" /> Results
                        </Link>
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" asChild title="Edit Quiz">
                        <Link href={`/edit-quiz/${quiz.id}`}>
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Quiz">
                            <Trash className="h-4 w-4 text-destructive hover:text-red-700" />
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
                            <AlertDialogAction onClick={() => handleDeleteQuiz(quiz.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">No Quizzes Yet</h3>
              <p className="text-muted-foreground mt-2">Click "Create New Quiz" to get started.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="my-attempts" className="mt-6">
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : attemptedQuizzes.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz Title</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attemptedQuizzes.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">{attempt.quizTitle}</TableCell>
                        <TableCell className="text-center">{attempt.score}/{attempt.totalQuestions}</TableCell>
                        <TableCell className="text-right">{format(attempt.submittedAt.toDate(), 'PPP')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/results/${attempt.id}`}>View Report</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">No Attempts Yet</h3>
              <p className="text-muted-foreground mt-2">Take a quiz to see your results here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
