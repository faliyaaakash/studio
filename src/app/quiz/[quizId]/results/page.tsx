"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Quiz, Attempt } from "@/lib/types";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Download, ShieldAlert, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
const PASS_COLOR = "#22c55e"; // green-500
const FAIL_COLOR = "#ef4444"; // red-500

export default function QuizAnalyticsPage() {
    const { quizId } = useParams<{ quizId: string }>();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [passingThreshold, setPassingThreshold] = useState(50);

    useEffect(() => {
        if (!quizId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Quiz
                const quizRef = doc(db, "quizzes", quizId);
                const quizSnap = await getDoc(quizRef);
                if (quizSnap.exists()) {
                    setQuiz({ id: quizSnap.id, ...quizSnap.data() } as Quiz);
                }

                // Fetch Attempts
                const attemptsQuery = query(
                    collection(db, "attempts"),
                    where("quizId", "==", quizId),
                    orderBy("submittedAt", "desc")
                );
                const attemptsSnap = await getDocs(attemptsQuery);
                const attemptsData = attemptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attempt));
                setAttempts(attemptsData);

            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [quizId]);

    // --- Statistics Calculation ---
    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
        ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions) * 100, 0) / totalAttempts)
        : 0;

    const passedAttempts = attempts.filter(a => ((a.score / a.totalQuestions) * 100) >= passingThreshold).length;
    const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

    const cheatingIncidents = attempts.reduce((acc, curr) => acc + (curr.cheatingViolations > 0 ? 1 : 0), 0);

    // --- Charts Data ---
    const passFailData = [
        { name: "Passed", value: passedAttempts },
        { name: "Failed", value: totalAttempts - passedAttempts },
    ];

    // Score Distribution (0-20%, 21-40%, etc.)
    const scoreDistribution = [
        { name: "0-20%", count: 0 },
        { name: "21-40%", count: 0 },
        { name: "41-60%", count: 0 },
        { name: "61-80%", count: 0 },
        { name: "81-100%", count: 0 },
    ];

    attempts.forEach(a => {
        const percentage = (a.score / a.totalQuestions) * 100;
        if (percentage <= 20) scoreDistribution[0].count++;
        else if (percentage <= 40) scoreDistribution[1].count++;
        else if (percentage <= 60) scoreDistribution[2].count++;
        else if (percentage <= 80) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
    });

    // --- Export Functions ---
    const handleExportExcel = () => {
        if (!quiz || attempts.length === 0) return;

        const data = attempts.map(a => {
            const pct = (a.score / a.totalQuestions) * 100;
            return {
                "Student Name": a.userName || "Anonymous",
                "Submission Date": format(a.submittedAt.toDate(), "PPpp"),
                "Score": `${a.score}/${a.totalQuestions}`,
                "Percentage": `${Math.round(pct)}%`,
                "Status": pct >= passingThreshold ? "Passed" : "Failed",
                "Duration (min)": (a.timeTakenSeconds / 60).toFixed(1),
                "Cheating Violations": a.cheatingViolations
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
        XLSX.writeFile(workbook, `${quiz.title}_Report.xlsx`);
    };

    const handleExportPDF = () => {
        if (!quiz || attempts.length === 0) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(`${quiz.title} - Performance Report`, 14, 20);

        doc.setFontSize(11);
        doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 30);
        doc.text(`Total Attempts: ${totalAttempts}`, 14, 36);
        doc.text(`Average Score: ${avgScore}%`, 14, 42);

        // Table
        const tableData = attempts.map(a => {
            const pct = Math.round((a.score / a.totalQuestions) * 100);
            return [
                a.userName || "Anonymous",
                format(a.submittedAt.toDate(), "MMM d, p"),
                `${a.score}/${a.totalQuestions}`,
                `${pct}%`,
                pct >= passingThreshold ? "Passed" : "Failed",
                a.cheatingViolations > 0 ? a.cheatingViolations.toString() : "-"
            ];
        });

        autoTable(doc, {
            head: [["Student Name", "Date", "Score", "%", "Status", "Violations"]],
            body: tableData,
            startY: 50,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [22, 163, 74] } // Green-600 like
        });

        doc.save(`${quiz.title}_Report.pdf`);
    };

    // --- Filtered Table Data ---
    const filteredAttempts = attempts.filter(attempt => {
        const matchesSearch = (attempt.userName || "Anonymous").toLowerCase().includes(searchTerm.toLowerCase());
        const pct = (attempt.score / attempt.totalQuestions) * 100;
        const isPassed = pct >= passingThreshold;

        if (filterStatus === "passed") return matchesSearch && isPassed;
        if (filterStatus === "failed") return matchesSearch && !isPassed;
        return matchesSearch;
    });

    if (loading) {
        return <div className="container mx-auto py-8 text-center space-y-4">
            <Skeleton className="h-12 w-1/2 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
        </div>
    }

    if (!quiz) {
        return <div className="container mx-auto py-8 text-center">Quiz not found</div>
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">{quiz.title} Analytics</h1>
                    <p className="text-muted-foreground">Comprehensive performance report</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportExcel}>
                        <Download className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF}>
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                    <Button variant="default" asChild>
                        <Link href="/dashboard">Back to Dashboard</Link>
                    </Button>
                </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalAttempts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgScore}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pass Rate (&gt;{passingThreshold}%)</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{passRate}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cheating Incidents</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{cheatingIncidents}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Score Distribution</CardTitle>
                        <CardDescription>Number of students by score range</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Pass vs Fail Ratio</CardTitle>
                            <CardDescription>Based on {passingThreshold}% threshold</CardDescription>
                        </div>
                        <div className="w-[150px] space-y-2">
                            <span className="text-xs text-muted-foreground">Adjust Pass %: <span className="font-bold">{passingThreshold}%</span></span>
                            <Slider
                                defaultValue={[50]}
                                value={[passingThreshold]}
                                onValueChange={(vals) => setPassingThreshold(vals[0])}
                                max={100}
                                step={5}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={passFailData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell key="cell-pass" fill={PASS_COLOR} />
                                    <Cell key="cell-fail" fill={FAIL_COLOR} />
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Attempts List */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle>Student Attempts</CardTitle>
                            <CardDescription>Detailed list of all submissions</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search student..."
                                className="max-w-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="passed">Passed</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead className="text-center">Score</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Violations</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAttempts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No attempts found.
                                    </TableCell>
                                </TableRow>
                            ) : filteredAttempts.map((attempt) => {
                                const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
                                const isCheater = attempt.cheatingViolations > 0;
                                const isPassed = pct >= passingThreshold;
                                return (
                                    <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">{attempt.userName || "Anonymous"}</TableCell>
                                        <TableCell>{format(attempt.submittedAt.toDate(), "MMM d, p")}</TableCell>
                                        <TableCell>{Math.floor(attempt.timeTakenSeconds / 60)}m {attempt.timeTakenSeconds % 60}s</TableCell>
                                        <TableCell className="text-center">
                                            <span className={pct >= 70 ? "text-green-600 font-bold" : pct >= 50 ? "text-amber-600 font-bold" : "text-destructive font-bold"}>
                                                {attempt.score}/{attempt.totalQuestions} ({pct}%)
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={isPassed ? "default" : "destructive"}>
                                                {isPassed ? "Passed" : "Failed"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isCheater ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <ShieldAlert className="h-3 w-3" /> {attempt.cheatingViolations}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/results/${attempt.id}`}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
