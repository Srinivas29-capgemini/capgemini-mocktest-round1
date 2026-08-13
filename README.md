# Capgemini Mocktest Round 1

Fresh Render-ready demo exam system.

Teacher:
- URL: /
- Username: `teacher`
- Password: `Capgemini@123`

Student:
- URL: /student
- Teacher creates an exam, starts it, then copies the student link.
- Default exam duration: 120 minutes.
- 30 MCQs included.
- Camera and microphone permission are requested.
- Teacher dashboard shows student status and periodic webcam snapshots.

Render:
Build command: `npm install`
Start command: `npm start`

For a real high-stakes exam, replace the in-memory store with a persistent database and production session store, and use a proper WebRTC/video infrastructure.
