# **App Name**: QuizWhiz

## Core Features:

- Quiz Creation: Allow users to create quizzes with various question types (MCQ, MSQ, True/False, Short Text) and settings (title, description, timer, attempts, expiration). Store quizzes in Firestore.
- Shareable Quiz Links: Generate unique, shareable links for each quiz (e.g., /quiz/{quizId}) that can be shared with other users.
- Quiz Taking Flow: Implement the quiz-taking flow, including timer countdown, progress saving, auto-submission (timer end, manual submit, cheating violations), and Firestore integration to save attempt data.
- Cheating Prevention: Implement cheating detection (tab switching, window minimize, etc.) with warnings and auto-submission upon second violation. Store cheating logs in Firestore.
- Score Calculation: Calculate scores securely in Cloud Functions, preventing score tampering and ensuring accurate results.
- Result Reporting: Display score, correct/incorrect answers, time taken, and cheating violations to users after quiz submission. Quiz owners can view results and export data.
- Expiration Handling: Manage quiz expiration.  Display a message when a quiz has expired.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) for a trustworthy and intellectual feel.
- Background color: Light gray (#F0F2F5) for a clean and modern look.
- Accent color: Purple (#7E57C2) for highlights and CTAs, creating visual interest.
- Body and headline font: 'Inter' for a modern, neutral feel.
- Use simple, clear icons to represent question types and actions.
- Design a clean and responsive layout that is mobile and desktop compatible.
- Use subtle animations for transitions and feedback, like a progress bar during quiz taking.