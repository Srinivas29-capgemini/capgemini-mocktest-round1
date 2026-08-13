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
// RENDER / PROXY
// =====================================================

app.set("trust proxy", 1);

// =====================================================
// TEACHER LOGIN
// =====================================================

const TEACHER_USERNAME =
  process.env.TEACHER_USERNAME || "teacher";

const TEACHER_PASSWORD =
  process.env.TEACHER_PASSWORD || "Capgemini@123";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "capgemini-round1-session-secret-2026";

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json({ limit: "2mb" }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",

      // Works correctly with Render
      secure: false,

      maxAge: 8 * 60 * 60 * 1000
    }
  })
);

// =====================================================
// NO PUBLIC FOLDER
// Files are in the root of the repository
// =====================================================

app.use(express.static(__dirname));

// =====================================================
// DATA
// =====================================================

const exams = new Map();
const students = new Map();

// =====================================================
// 30 CAPGEMINI ROUND 1 QUESTIONS
// =====================================================

const Q = [

  [
    "A data analyst has values 10,20,30,40,50. What is the mean?",
    ["20", "25", "30", "35"],
    2
  ],

  [
    "Which SQL clause filters grouped results?",
    ["WHERE", "HAVING", "ORDER BY", "GROUP BY"],
    1
  ],

  [
    "What does INNER JOIN return?",
    [
      "All left rows",
      "All right rows",
      "Matching rows from both tables",
      "Duplicate rows only"
    ],
    2
  ],

  [
    "₹800 cost and ₹920 selling price. Profit percentage?",
    ["10%", "12%", "15%", "20%"],
    2
  ],

  [
    "Next number: 2,6,12,20,30,?",
    ["36", "40", "42", "44"],
    2
  ],

  [
    "Which Python library is commonly used for tabular data?",
    ["Pandas", "Flask", "Requests", "PyGame"],
    0
  ],

  [
    "Which measure is least affected by outliers?",
    ["Mean", "Median", "Variance", "Range"],
    1
  ],

  [
    "180 km in 3 hours gives average speed?",
    ["50", "60", "70", "90"],
    1
  ],

  [
    "SQL command to remove rows?",
    ["DROP", "DELETE", "REMOVE", "CLEAR"],
    1
  ],

  [
    "Probability of a head on one fair coin toss?",
    ["0", "1/4", "1/2", "1"],
    2
  ],

  [
    "Chart commonly used to show a trend over time?",
    ["Line", "Pie", "Table", "Gauge"],
    0
  ],

  [
    "Normalization mainly reduces?",
    ["Redundancy", "Security", "Charts", "Queries"],
    0
  ],

  [
    "5 workers take 12 days. 10 workers take?",
    ["3", "5", "6", "24"],
    2
  ],

  [
    "Which is supervised learning?",
    [
      "Labeled churn prediction",
      "Unlabeled grouping",
      "PCA",
      "Association rules"
    ],
    0
  ],

  [
    "CSV commonly means?",
    [
      "Common System Variable",
      "Comma-Separated Values",
      "Column Storage Version",
      "Central Source View"
    ],
    1
  ],

  [
    "SQL function to count rows?",
    ["SUM()", "COUNT()", "TOTAL()", "ROWS()"],
    1
  ],

  [
    "Ratio 2:3, total 50. Larger part?",
    ["20", "25", "30", "35"],
    2
  ],

  [
    "A yes/no value is commonly a?",
    ["Boolean", "Float", "Array", "Character"],
    0
  ],

  [
    "Median of 3,7,9,12,15?",
    ["7", "9", "10", "12"],
    1
  ],

  [
    "SQL clause used for sorting?",
    ["SORT", "ORDER BY", "GROUP", "ARRANGE"],
    1
  ],

  [
    "Number increased by 20% becomes 240. Original?",
    ["180", "200", "220", "288"],
    1
  ],

  [
    "Key that uniquely identifies a table row?",
    [
      "Foreign key",
      "Primary key",
      "Index only",
      "Composite value always"
    ],
    1
  ],

  [
    "Main purpose of a dashboard?",
    [
      "Store passwords",
      "Present key metrics visually",
      "Compile code",
      "Create tables"
    ],
    1
  ],

  [
    "Python structure for key-value pairs?",
    ["List", "Tuple", "Dictionary", "Set"],
    2
  ],

  [
    "3 red and 2 blue balls. Probability of red?",
    ["2/5", "3/5", "1/2", "3/2"],
    1
  ],

  [
    "SQL keyword removing duplicate SELECT rows?",
    ["UNIQUE", "DISTINCT", "DEDUP", "ONLY"],
    1
  ],

  [
    "15% of 400?",
    ["40", "50", "60", "75"],
    2
  ],

  [
    "Classification accuracy is?",
    [
      "Correct/total",
      "Total/incorrect",
      "Mean features",
      "Maximum value"
    ],
    0
  ],

  [
    "Pandas command for first rows?",
    ["df.start()", "df.head()", "df.first()", "df.top()"],
    1
  ],

  [
    "12 items cost ₹360. Cost of 5?",
    ["₹120", "₹150", "₹180", "₹200"],
    1
  ]

].map(x => ({
  q: x[0],
  o: x[1],
  a: x[2]
}));

// =====================================================
// TEACHER AUTHENTICATION
// =====================================================

function teacher(req, res, next) {

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

  let examCode;

  do {
    examCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();
  } while (exams.has(examCode));

  return examCode;
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
    service: "Capgemini Round 1 Mock Test",
    time: new Date().toISOString()
  });

});

// =====================================================
// TEACHER SESSION CHECK
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
        ok: true,
        message: "Teacher login successful"
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
// GET ALL EXAMS
// =====================================================

app.get(
  "/api/exams",
  teacher,
  (req, res) => {

    const result =
      [...exams.values()].map(exam => ({

        id: exam.id,
        code: exam.code,
        title: exam.title,

        duration: exam.duration,

        questionCount:
          exam.questions.length,

        active: exam.active,

        createdAt: exam.createdAt,

        startedAt:
          exam.startedAt || null

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
  teacher,
  (req, res) => {

    const title =
      String(
        req.body?.title ||
        "Capgemini Round 1 Mock Test"
      ).trim();

    const duration =
      Math.max(
        1,
        Math.min(
          300,
          Number(
            req.body?.duration || 120
          )
        )
      );

    const now = Date.now();

    const exam = {

      id: crypto.randomUUID(),

      code: generateExamCode(),

      title,

      duration,

      questions: Q,

      // ==========================================
      // IMPORTANT CHANGE
      // ==========================================

      active: true,

      createdAt: now,

      startedAt: now

    };

    exams.set(
      exam.code,
      exam
    );

    // Tell connected clients
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
  teacher,
  (req, res) => {

    const code =
      String(
        req.params.code || ""
      ).toUpperCase();

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

      startedAt:
        exam.startedAt

    });

  }
);

// =====================================================
// STOP EXAM
// =====================================================

app.post(
  "/api/exams/:code/stop",
  teacher,
  (req, res) => {

    const code =
      String(
        req.params.code || ""
      ).toUpperCase();

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
// STUDENT GET EXAM
// =====================================================

app.get(
  "/api/student/exam/:code",
  (req, res) => {

    const code =
      String(
        req.params.code || ""
      ).toUpperCase();

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
          ({ q, o }) => ({
            q,
            o
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

    const exam =
      exams.get(code);

    if (!exam) {

      return res.status(404).json({
        error: "Invalid exam code"
      });

    }

    // ==========================================
    // EXAM MUST BE ACTIVE
    // ==========================================

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

    // Notify teacher dashboard
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
// TEACHER GET STUDENTS
// =====================================================

app.get(
  "/api/teacher/students",
  teacher,
  (req, res) => {

    return res.json(
      [...students.values()]
        .map(publicStudent)
    );

  }
);

// =====================================================
// STUDENT CAMERA / MICROPHONE STATUS
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

    return res.json({
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

    return res.json({
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
        error: "Session not found"
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
      req.body?.answers || {};

    const score =
      exam.questions.reduce(
        (total, question, index) => {

          return (
            total +
            (
              Number(
                answers[index]
              ) === question.a
                ? 1
                : 0
            )
          );

        },
        0
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
// ROOT
// =====================================================

app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "teacher.html"
      )
    );

  }
);

// =====================================================
// TEACHER PAGE
// /teacher
// =====================================================

app.get(
  "/teacher",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "teacher.html"
      )
    );

  }
);

// =====================================================
// STUDENT PAGE
// =====================================================

app.get(
  "/student",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "student.html"
      )
    );

  }
);

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
// ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      err
    );

    res.status(500).json({
      error: "Internal server error"
    });

  }
);

// =====================================================
// START SERVER
// =====================================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Capgemini Round 1 server running on port ${PORT}`
    );

    console.log(
      `Teacher username: ${TEACHER_USERNAME}`
    );

  }
);
