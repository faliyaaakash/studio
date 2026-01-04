
"use client";

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash, PlusCircle, Image as ImageIcon, Calendar as CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import QuestionOptionsEditor from '@/components/quiz/question-options-editor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState } from 'react';

const optionSchema = z.object({
    value: z.string().min(1, "Option text cannot be empty"),
});

const questionSchema = z.object({
    questionText: z.string().min(1, 'Question text is required'),
    imageUrl: z.string().url().optional(),
    imageFile: z.instanceof(File).optional(),
    type: z.enum(['mcq', 'msq', 'tf', 'text']),
    options: z.array(optionSchema).optional(),
    correctAnswers: z.array(z.string()).min(1, 'At least one correct answer is required'),
});

const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  maxAttempts: z.coerce.number().optional().nullable(),
  cheatingProtection: z.boolean().default(false),
  expiresAt: z.date().optional().nullable(),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
});

export type QuizFormValues = z.infer<typeof quizSchema>;

export default function CreateQuizPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageUploads, setImageUploads] = useState<Record<number, boolean>>({});

    const { register, control, handleSubmit, formState: { errors }, setValue, watch } = useForm<QuizFormValues>({
        resolver: zodResolver(quizSchema),
        defaultValues: {
            title: '',
            description: '',
            durationMinutes: 10,
            cheatingProtection: true,
            maxAttempts: null,
            expiresAt: null,
            questions: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'questions',
    });
    
    const watchedQuestions = watch('questions');

    const handleImageUpload = async (file: File, index: number) => {
        if (!file) return;
        setImageUploads(prev => ({...prev, [index]: true}));
        try {
            const imageRef = ref(storage, `quiz_images/${uuidv4()}-${file.name}`);
            await uploadBytes(imageRef, file);
            const downloadURL = await getDownloadURL(imageRef);
            setValue(`questions.${index}.imageUrl`, downloadURL);
            setValue(`questions.${index}.imageFile`, undefined);
        } catch (error) {
            console.error("Image upload failed", error);
            toast({ title: "Image Upload Failed", description: "Could not upload the image. Please try again.", variant: "destructive" });
        } finally {
            setImageUploads(prev => ({...prev, [index]: false}));
        }
    };

    const onSubmit = async (data: QuizFormValues) => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to create a quiz.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        try {
            const quizData = {
                ...data,
                questionCount: data.questions.length,
                questions: data.questions.map(q => {
                    const {imageFile, ...rest} = q; // Omit imageFile from DB record
                    return rest;
                }),
                createdBy: user.uid,
                createdAt: Timestamp.now(),
                expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
                maxAttempts: data.maxAttempts || null,
            };

            await addDoc(collection(db, "quizzes"), quizData);

            toast({
                title: "Quiz Created!",
                description: "Your quiz has been successfully created.",
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Quiz creation failed", error);
            toast({ title: "Error", description: "Failed to create quiz. Please try again.", variant: "destructive" });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6 font-headline">Create a New Quiz</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Details</CardTitle>
                        <CardDescription>Set up the basic information for your quiz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Quiz Title</Label>
                            <Input id="title" {...register('title')} />
                            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" {...register('description')} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                                <Input id="durationMinutes" type="number" {...register('durationMinutes')} />
                                {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxAttempts">Max Attempts (0 or empty for unlimited)</Label>
                                <Input id="maxAttempts" type="number" {...register('maxAttempts')} onChange={(e) => setValue('maxAttempts', e.target.value === '' ? null : Number(e.target.value))} />
                            </div>
                           <div className="space-y-2">
                                <Label>Expiration Date (optional)</Label>
                                 <Controller
                                    control={control}
                                    name="expiresAt"
                                    render={({ field }) => (
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ?? undefined}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                           </div>
                        </div>
                         <div className="flex items-center space-x-2 pt-4">
                                <Controller
                                    control={control}
                                    name="cheatingProtection"
                                    render={({ field }) => (
                                        <Switch
                                            id="cheatingProtection"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <Label htmlFor="cheatingProtection">Enable Cheating Protection</Label>
                            </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Questions</CardTitle>
                        <CardDescription>Add questions to your quiz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 relative bg-card-alt">
                                <CardHeader className="p-2">
                                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => remove(index)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4 p-2">
                                     <div className="space-y-2">
                                        <Label>Question Type</Label>
                                        <Controller
                                            control={control}
                                            name={`questions.${index}.type`}
                                            defaultValue="mcq"
                                            render={({ field }) => (
                                                <Select onValueChange={(value) => {
                                                    field.onChange(value);
                                                    setValue(`questions.${index}.options`, []);
                                                    setValue(`questions.${index}.correctAnswers`, []);
                                                }} defaultValue={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a question type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="mcq">Multiple Choice (Single Answer)</SelectItem>
                                                        <SelectItem value="msq">Multiple Select (Multiple Answers)</SelectItem>
                                                        <SelectItem value="tf">True / False</SelectItem>
                                                        <SelectItem value="text">Short Text</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Question Text</Label>
                                        <Textarea {...register(`questions.${index}.questionText`)} />
                                        {errors.questions?.[index]?.questionText && <p className="text-sm text-destructive">{errors.questions?.[index]?.questionText?.message}</p>}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Image (optional)</Label>
                                        <div className="flex items-center gap-2">
                                            {watchedQuestions[index]?.imageUrl ? (
                                                <div className="relative h-20 w-32">
                                                    <Image src={watchedQuestions[index].imageUrl!} alt={`Question ${index+1} image`} layout="fill" objectFit="cover" className="rounded-md" />
                                                    <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setValue(`questions.${index}.imageUrl`, undefined)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Input
                                                        id={`q-image-${index}`}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], index)}
                                                    />
                                                    <Label htmlFor={`q-image-${index}`} className={cn(buttonVariants({variant: 'outline'}), "cursor-pointer")}>
                                                        <ImageIcon className="mr-2 h-4 w-4" /> {imageUploads[index] ? 'Uploading...' : 'Upload Image'}
                                                    </Label>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <QuestionOptionsEditor questionIndex={index} control={control} register={register} />
                                    {errors.questions?.[index]?.correctAnswers && <p className="text-sm text-destructive">{errors.questions?.[index]?.correctAnswers?.message}</p>}
                                </CardContent>
                            </Card>
                        ))}
                        <Button type="button" variant="outline" onClick={() => append({ id: uuidv4(), questionText: '', type: 'mcq', options: [{value: "Option 1"}, {value: "Option 2"}], correctAnswers: [] })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                        {errors.questions && typeof errors.questions === 'object' && 'message' in errors.questions && <p className="text-sm text-destructive">{errors.questions.message}</p>}
                    </CardContent>
                </Card>
                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? "Creating Quiz..." : "Create Quiz"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
