
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import type { Quiz, Attempt } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit, Users, BarChart2, Copy, Link as LinkIcon, Trash, Pencil, Search, Trophy, FileText, Clock, MoreVertical, Sparkles, Filter } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createdQuizzes, setCreatedQuizzes] = useState<Quiz[]>([]);
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

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

  const getSortedAndFilteredQuizzes = () => {
    let filtered = createdQuizzes.filter(quiz =>
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortOrder) {
      case "oldest":
        return filtered.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
      case "a-z":
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case "z-a":
        return filtered.sort((a, b) => b.title.localeCompare(a.title));
      case "newest":
      default:
        return filtered.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }
  };

  const filteredQuizzes = getSortedAndFilteredQuizzes();

  const averageScore = attemptedQuizzes.length > 0
    ? Math.round(attemptedQuizzes.reduce((acc, attempt) => acc + (attempt.score / attempt.totalQuestions) * 100, 0) / attemptedQuizzes.length)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-12 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-yellow-300" />
                Welcome back, {user?.displayName || "Creator"}!
              </h1>
              <p className="text-lg opacity-90 text-primary-foreground/80 max-w-2xl">
                Ready to create your next masterpiece? Manage your quizzes and track your performance efficiently.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl border-0">
              <Link href="/create-quiz">
                <PlusCircle className="mr-2 h-5 w-5" />
                Create New Quiz
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-6 space-y-8 -mt-8">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-lg border-l-4 border-l-primary bg-card/95 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes Created</CardTitle>
              <div className="p-2 bg-primary/10 rounded-full">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{createdQuizzes.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-l-4 border-l-accent bg-card/95 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quizzes Taken</CardTitle>
              <div className="p-2 bg-accent/10 rounded-full">
                <Clock className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{attemptedQuizzes.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-l-4 border-l-chart-3 bg-card/95 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Score (Taken)</CardTitle>
              <div className="p-2 bg-chart-3/10 rounded-full">
                <Trophy className="h-4 w-4 text-chart-3" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{averageScore}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="my-quizzes" className="w-full space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2 bg-muted/50 p-1">
              <TabsTrigger value="my-quizzes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">My Quizzes</TabsTrigger>
              <TabsTrigger value="my-attempts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">My Attempts</TabsTrigger>
            </TabsList>

            <TabsContent value="my-quizzes" className="w-full md:w-auto mt-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search quizzes..."
                    className="pl-9 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="a-z">Title (A-Z)</SelectItem>
                    <SelectItem value="z-a">Title (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </div>

          <TabsContent value="my-quizzes" className="animate-in fade-in-50 duration-500 mt-0">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[250px] w-full rounded-xl" />)}
              </div>
            ) : filteredQuizzes.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="group hover:shadow-xl transition-all duration-300 border border-border/50 bg-card overflow-hidden hover:-translate-y-1">
                    <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">
                            <Link href={`/quiz/${quiz.id}`}>{quiz.title}</Link>
                          </CardTitle>
                          <CardDescription className="line-clamp-2 text-xs">
                            {quiz.description || "No description provided."}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyQuizLink(quiz.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/edit-quiz/${quiz.id}`}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Quiz
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/quiz/${quiz.id}/results`}>
                                <BarChart2 className="mr-2 h-4 w-4" /> View Results
                              </Link>
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                  <Trash className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure? This will permanently delete <strong>{quiz.title}</strong> and all its results.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteQuiz(quiz.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span>{quiz.questionCount} Qs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                          <span>{quiz.durationMinutes}m</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 pb-4 flex justify-between items-center text-xs text-muted-foreground border-t bg-muted/20 px-6 py-3">
                      <span>Created {format(quiz.createdAt.toDate(), 'MMM d, yyyy')}</span>
                      {quiz.expiresAt && quiz.expiresAt.toDate() < new Date() ? (
                        <Badge variant="secondary" className="text-xs font-normal">Expired</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal bg-background">Active</Badge>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-card">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">No Quizzes Found</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  {searchTerm ? "Try adjusting your search terms." : "You haven't created any quizzes yet. Get started by creating your first quiz!"}
                </p>
                {!searchTerm && (
                  <Button asChild className="mt-6">
                    <Link href="/create-quiz">Create Quiz</Link>
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-attempts" className="animate-in fade-in-50 duration-500 mt-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : attemptedQuizzes.length > 0 ? (
              <Card className="overflow-hidden border shadow-md">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow>
                        <TableHead className="w-[40%]">Quiz Title</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Date Taken</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attemptedQuizzes.map((attempt) => {
                        const percentage = (attempt.score / attempt.totalQuestions) * 100;
                        return (
                          <TableRow key={attempt.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-semibold text-base">{attempt.quizTitle}</TableCell>
                            <TableCell className="text-center font-mono">
                              <span className={percentage >= 70 ? "text-green-600 font-bold" : percentage >= 40 ? "text-amber-600 font-bold" : "text-red-600 font-bold"}>
                                {attempt.score}/{attempt.totalQuestions}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={percentage >= 50 ? "default" : "destructive"}>
                                {percentage >= 50 ? "Passed" : "Failed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{format(attempt.submittedAt.toDate(), 'MMM d, p')}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
                                <Link href={`/results/${attempt.id}`}>View Result</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-card">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Trophy className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No Attempts Yet</h3>
                <p className="text-muted-foreground mt-2">You haven't taken any quizzes yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
