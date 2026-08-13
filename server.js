const express = require("express");
const http = require("http");
const session = require("express-session");
const { Server } = require("socket.io");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;

// =====================================================
// CONFIG
// =====================================================

const TEACHER_USERNAME =
  process.env.TEACHER_USERNAME || "teacher";

const TEACHER_PASSWORD =
  process.env.TEACHER_PASSWORD || "Capgemini@123";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "capgemini-round1-secret-2026";

// =====================================================
// MIDDLEWARE
// =====================================================

app.set("trust proxy", 1);

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 8 * 60 * 60 * 1000
    }
  })
);

// =====================================================
// ROOT STATIC FILES
// NO PUBLIC FOLDER
// =====================================================

app.use(
  express.static(__dirname, {
    index: false
  })
);

// =====================================================
// DATA
// =====================================================

const exams = new Map();
const students = new Map();

// =====================================================
// QUESTIONS
// =====================================================

const QUESTIONS = [
  {
    q: "A data analyst has values 10,20,30,40,50. What is the mean?",
    o: ["20", "25", "30", "35"],
    a: 2
  },
  {
    q: "Which SQL clause filters grouped results?",
    o: ["WHERE", "HAVING", "ORDER BY", "GROUP BY"],
    a: 1
  },
  {
    q: "What does INNER JOIN return?",
    o: [
      "All left rows",
      "All right rows",
      "Matching rows from both tables",
      "Duplicate rows only"
    ],
    a: 2
  },
  {
    q: "₹800 cost and ₹920 selling price. Profit percentage?",
    o: ["10%", "12%", "15%", "20%"],
    a: 2
  },
  {
    q: "Next number: 2,6,12,20,30,?",
    o: ["36", "40", "42", "44"],
    a: 2
  },
  {
    q: "Which Python library is commonly used for tabular data?",
    o: ["Pandas", "Flask", "Requests", "PyGame"],
    a: 0
  },
  {
    q: "Which measure is least affected by outliers?",
    o: ["Mean", "Median", "Variance", "Range"],
    a: 1
  },
  {
    q: "180 km in 3 hours gives average speed?",
    o: ["50", "60", "70", "90"],
    a: 1
  },
  {
    q: "SQL command to remove rows?",
    o: ["DROP", "DELETE", "REMOVE", "CLEAR"],
    a: 1
  },
  {
    q: "Probability of a head on one fair coin toss?",
    o: ["0", "1/4", "1/2", "1"],
    a: 2
  },
  {
    q: "Chart commonly used to show a trend over time?",
    o: ["Line", "Pie", "Table", "Gauge"],
    a: 0
  },
  {
    q: "Normalization mainly reduces?",
    o: ["Redundancy", "Security", "Charts", "Queries"],
    a: 0
  },
  {
    q: "5 workers take 12 days. 10 workers take?",
    o: ["3", "5", "6", "24"],
    a: 2
  },
  {
    q: "Which is supervised learning?",
    o: [
      "Labeled churn prediction",
      "Unlabeled grouping",
      "PCA",
      "Association rules"
    ],
    a: 0
  },
  {
    q: "CSV commonly means?",
    o: [
      "Common System Variable",
      "Comma-Separated Values",
      "Column Storage Version",
      "Central Source View"
    ],
    a: 1
  },
  {
    q: "SQL function to count rows?",
    o: ["SUM()", "COUNT()", "TOTAL()", "ROWS()"],
    a: 1
  },
  {
    q: "Ratio 2:3, total 50. Larger part?",
    o: ["20", "25", "30", "35"],
    a: 2
  },
  {
    q: "A yes/no value is commonly a?",
    o: ["Boolean", "Float", "Array", "Character"],
    a: 0
  },
  {
    q: "Median of 3,7,9,12,15?",
    o: ["7", "9", "10", "12"],
    a: 1
  },
  {
    q: "SQL clause used for sorting?",
    o: ["SORT", "ORDER BY", "GROUP", "ARRANGE"],
    a: 1
  },
  {
    q: "Number increased by 20% becomes 240. Original?",
    o: ["180", "200", "220", "288"],
    a: 1
  },
  {
    q: "Key that uniquely identifies a table row?",
    o: [
      "Foreign key",
      "Primary key",
      "Index only",
      "Composite value always"
    ],
    a: 1
  },
  {
    q: "Main purpose of a dashboard?",
    o: [
      "Store passwords",
      "Present key metrics visually",
      "Compile code",
      "Create tables"
    ],
    a: 1
  },
  {
    q: "Python structure for key-value pairs?",
    o: ["List", "Tuple", "Dictionary", "Set"],
    a: 2
  },
  {
    q: "3 red and 2 blue balls. Probability of red?",
    o: ["2/5", "3/5", "1/2", "3/2"],
    a: 1
  },
  {
    q: "SQL keyword removing duplicate SELECT rows?",
    o: ["UNIQUE", "DISTINCT", "DEDUP", "ONLY"],
    a: 1
  },
  {
    q: "15% of 400?",
    o: ["40", "50", "60", "75"],
    a: 2
  },
  {
    q: "Classification accuracy is?",
    o: [
      "Correct/total",
      "Total/incorrect",
      "Mean features",
      "Maximum value"
    ],
    a: 0
  },
  {
    q: "Pandas command for first rows?",
    o: [
      "df.start()",
      "df.head()",
      "df.first()",
      "df.top()"
    ],
    a: 1
  },
  {
    q: "12 items cost ₹360. Cost of 5?",
    o: ["₹120", "₹150", "₹180", "₹200"],
    a: 1
  }
];

// =====================================================
// TEACHER AUTH
// =====================================================

function requireTeacher(req, res, next) {

  if (
    req.session &&
    req.session.teacher === true
  ) {
    return next();
  }

  return res.status(401).json({
    error: "Unauthorized"
  });
}

// =====================================================
// EXAM CODE
// =====================================================

function generateExamCode() {

  let code;

  do {
    code = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

  } while (exams.has(code));

  return code;
}

// =====================================================
// PUBLIC STUDENT DATA
// =====================================================

function publicStudent(student) {

  return {
    id: student.id,
    name: student.name,
    code: student.code,
    joinedAt: student.joinedAt,
    camera: student.camera,
    microphone: student.microphone,
    submitted: student.submitted,
    score: student.score,
    lastSnapshot: student.lastSnapshot
  };
}

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {

  res.json({
    ok: true,
    service: "Capgemini Mocktest Round 1",
    time: new Date().toISOString()
  });

});

// =====================================================
// TEACHER SESSION
// =====================================================

app.get("/api/teacher/session", (req, res) => {

  res.json({
    loggedIn:
      !!(
        req.session &&
        req.session.teacher === true
      )
  });

});

// =====================================================
// TEACHER LOGIN
// =====================================================

app.post("/api/teacher/login", (req, res) => {

  const username =
    String(req.body?.username || "").trim();

  const password =
    String(req.body?.password || "");

  if (
    username === TEACHER_USERNAME &&
    password === TEACHER_PASSWORD
  ) {

    req.session.teacher = true;
    req.session.username = username;

    return req.session.save(err => {

      if (err) {

        console.error(
          "Session save error:",
          err
        );

        return res.status(500).json({
          error: "Could not create teacher session"
        });
      }

      return res.json({
        ok: true
      });

    });
  }

  return res.status(401).json({
    error: "Invalid username or password"
  });

});

// =====================================================
// TEACHER LOGOUT
// =====================================================

app.post("/api/teacher/logout", (req, res) => {

  req.session.destroy(err => {

    if (err) {
      return res.status(500).json({
        error: "Logout failed"
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      ok: true
    });

  });

});

// =====================================================
// GET EXAMS
// =====================================================

app.get(
  "/api/exams",
  requireTeacher,
  (req, res) => {

    const result =
      [...exams.values()].map(exam => ({
        id: exam.id,
        code: exam.code,
        title: exam.title,
        duration: exam.duration,
        questionCount: exam.questions.length,
        active: exam.active,
        createdAt: exam.createdAt,
        startedAt: exam.startedAt || null
      }));

    res.json(result);
  }
);

// =====================================================
// CREATE EXAM
// IMPORTANT:
// NEW EXAM IS ACTIVE IMMEDIATELY
// =====================================================

app.post(
  "/api/exams",
  requireTeacher,
  (req, res) => {

    const title =
      String(
        req.body?.title ||
        "Capgemini Round 1 Mock Test"
      ).trim();

    let duration =
      Number(
        req.body?.duration || 120
      );

    if (!Number.isFinite(duration)) {
      duration = 120;
    }

    duration = Math.max(
      1,
      Math.min(300, duration)
    );

    const now = Date.now();

    const exam = {

      id: crypto.randomUUID(),

      code: generateExamCode(),

      title,

      duration,

      questions: QUESTIONS,

      active: true,

      createdAt: now,

      startedAt: now
    };

    exams.set(
      exam.code,
      exam
    );

    io.emit(
      "exam-created",
      {
        code: exam.code,
        title: exam.title,
        duration: exam.duration
      }
    );

    return res.json({

      ok: true,

      exam: {

        id: exam.id,

        code: exam.code,

        title: exam.title,

        duration: exam.duration,

        questionCount:
          exam.questions.length,

        active: exam.active,

        startedAt: exam.startedAt
      }

    });

  }
);

// =====================================================
// START EXAM
// =====================================================

app.post(
  "/api/exams/:code/start",
  requireTeacher,
  (req, res) => {

    const code =
      String(
        req.params.code || ""
      ).trim().toUpperCase();

    const exam =
      exams.get(code);

    if (!exam) {

      return res.status(404).json({
        error: "Exam not found"
      });
    }

    exam.active = true;
    exam.startedAt = Date.now();

    io.emit(
      "exam-started",
      {
        code: exam.code,
        startedAt: exam.startedAt
      }
    );

    return res.json({
      ok: true,
      code: exam.code,
      active: true,
      startedAt: exam.startedAt
    });

  }
);

// =====================================================
// STOP EXAM
// =====================================================

app.post(
  "/api/exams/:code/stop",
  requireTeacher,
  (req, res) => {

    const code =
      String(
        req.params.code || ""
      ).trim().toUpperCase();

    const exam =
      exams.get(code);

    if (!exam) {

      return res.status(404).json({
        error: "Exam not found"
      });
    }

    exam.active = false;

    io.emit(
      "exam-stopped",
      {
        code: exam.code
      }
    );

    return res.json({
      ok: true,
      code: exam.code,
      active: false
    });

  }
);

// =====================================================
// STUDENT EXAM DETAILS
// =====================================================

app.get(
  "/api/student/exam/:code",
  (req, res) => {

    const code =
      String(
        req.params.code || ""
      ).trim().toUpperCase();

    const exam =
      exams.get(code);

    if (!exam) {

      return res.status(404).json({
        error: "Invalid exam code"
      });
    }

    if (!exam.active) {

      return res.status(403).json({
        error: "Exam is not active"
      });
    }

    return res.json({

      title: exam.title,

      code: exam.code,

      duration: exam.duration,

      startedAt:
        exam.startedAt || null,

      questions:
        exam.questions.map(
          question => ({
            q: question.q,
            o: question.o
          })
        )
    });

  }
);

// =====================================================
// STUDENT JOIN
// =====================================================

app.post(
  "/api/student/join",
  (req, res) => {

    const code =
      String(
        req.body?.code || ""
      ).trim().toUpperCase();

    const name =
      String(
        req.body?.name ||
        "Student"
      ).trim().slice(0, 80);

    if (!code) {

      return res.status(400).json({
        error: "Exam code is required"
      });
    }

    const exam =
      exams.get(code);

    if (!exam) {

      return res.status(404).json({
        error: "Invalid exam code"
      });
    }

    if (!exam.active) {

      return res.status(403).json({
        error: "Exam is not active"
      });
    }

    const student = {

      id: crypto.randomUUID(),

      name,

      code: exam.code,

      joinedAt: Date.now(),

      camera: false,

      microphone: false,

      lastSnapshot: null,

      submitted: false,

      score: null
    };

    students.set(
      student.id,
      student
    );

    io.emit(
      "student-update",
      publicStudent(student)
    );

    return res.json({

      ok: true,

      studentId:
        student.id,

      code:
        exam.code,

      title:
        exam.title,

      duration:
        exam.duration,

      startedAt:
        exam.startedAt
    });

  }
);

// =====================================================
// TEACHER STUDENTS
// =====================================================

app.get(
  "/api/teacher/students",
  requireTeacher,
  (req, res) => {

    res.json(
      [...students.values()]
        .map(publicStudent)
    );

  }
);

// =====================================================
// STUDENT CAMERA / MIC STATUS
// =====================================================

app.post(
  "/api/student/status",
  (req, res) => {

    const studentId =
      req.body?.studentId;

    const student =
      students.get(studentId);

    if (!student) {

      return res.status(404).json({
        error: "Student session not found"
      });
    }

    student.camera =
      !!req.body.camera;

    student.microphone =
      !!req.body.microphone;

    io.emit(
      "student-update",
      publicStudent(student)
    );

    res.json({
      ok: true
    });

  }
);

// =====================================================
// STUDENT WEBCAM SNAPSHOT
// =====================================================

app.post(
  "/api/student/snapshot",
  (req, res) => {

    const studentId =
      req.body?.studentId;

    const student =
      students.get(studentId);

    if (!student) {

      return res.status(404).json({
        error: "Student session not found"
      });
    }

    if (
      typeof req.body.image === "string" &&
      req.body.image.length < 180000
    ) {

      student.lastSnapshot =
        req.body.image;
    }

    student.camera = true;

    io.emit(
      "student-update",
      publicStudent(student)
    );

    res.json({
      ok: true
    });

  }
);

// =====================================================
// STUDENT SUBMIT
// =====================================================

app.post(
  "/api/student/submit",
  (req, res) => {

    const studentId =
      req.body?.studentId;

    const student =
      students.get(studentId);

    if (!student) {

      return res.status(404).json({
        error: "Student session not found"
      });
    }

    const exam =
      exams.get(student.code);

    if (!exam) {

      return res.status(404).json({
        error: "Exam not found"
      });
    }

    if (student.submitted) {

      return res.json({

        ok: true,

        score: student.score,

        total:
          exam.questions.length,

        alreadySubmitted: true
      });
    }

    const answers =
      req.body?.answers || [];

    let score = 0;

    exam.questions.forEach(
      (question, index) => {

        if (
          Number(answers[index]) ===
          question.a
        ) {
          score++;
        }

      }
    );

    student.submitted = true;

    student.score = score;

    io.emit(
      "student-update",
      publicStudent(student)
    );

    return res.json({

      ok: true,

      score,

      total:
        exam.questions.length
    });

  }
);

// =====================================================
// TEACHER PAGE
// =====================================================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "teacher.html"
    )
  );

});

app.get("/teacher", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "teacher.html"
    )
  );

});

// =====================================================
// STUDENT PAGE
// IMPORTANT: NO PUBLIC FOLDER
// =====================================================

app.get("/student", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "student.html"
    ),
    err => {

      if (err) {

        console.error(
          "student.html error:",
          err
        );

        if (!res.headersSent) {

          res.status(404).send(
            "student.html not found in repository root"
          );
        }
      }

    }
  );

});

// Also support /student/
//
// This prevents problems when the URL has a trailing slash.

app.get("/student/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "student.html"
    )
  );

});

// =====================================================
// SOCKET.IO
// =====================================================

io.on(
  "connection",
  socket => {

    console.log(
      "Socket connected:",
      socket.id
    );

    socket.on(
      "disconnect",
      () => {

        console.log(
          "Socket disconnected:",
          socket.id
        );

      }
    );

  }
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use(
  (req, res) => {

    if (
      req.path.startsWith("/api/")
    ) {

      return res.status(404).json({
        error: "API route not found",
        path: req.path
      });

    }

    return res.status(404).send(
      "Page not found"
    );

  }
);

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({
      error: "Internal server error"
    });

  }
);

// =====================================================
// START
// =====================================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "======================================"
    );

    console.log(
      "Capgemini Round 1 server running"
    );

    console.log(
      "Port:",
      PORT
    );

    console.log(
      "Teacher:",
      TEACHER_USERNAME
    );

    console.log(
      "Student URL: /student"
    );

    console.log(
      "======================================"
    );

  }
);
