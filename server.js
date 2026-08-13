const express=require("express"),http=require("http"),session=require("express-session"),{Server}=require("socket.io"),path=require("path"),crypto=require("crypto");
const app=express(),server=http.createServer(app),io=new Server(server),PORT=process.env.PORT||10000;
const TU=process.env.TEACHER_USERNAME||"teacher",TP=process.env.TEACHER_PASSWORD||"Capgemini@123";
app.use(express.json({limit:"2mb"})); app.use(session({secret:process.env.SESSION_SECRET||"change-this-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:28800000}})); app.use(express.static(path.join(__dirname,"public")));
const exams=new Map(),students=new Map();
const Q=[
["A data analyst has values 10,20,30,40,50. What is the mean?",["20","25","30","35"],2],
["Which SQL clause filters grouped results?",["WHERE","HAVING","ORDER BY","GROUP BY"],1],
["What does INNER JOIN return?",["All left rows","All right rows","Matching rows from both tables","Duplicate rows only"],2],
["₹800 cost and ₹920 selling price. Profit percentage?",["10%","12%","15%","20%"],2],
["Next number: 2,6,12,20,30,?",["36","40","42","44"],2],
["Which Python library is commonly used for tabular data?",["Pandas","Flask","Requests","PyGame"],0],
["Which measure is least affected by outliers?",["Mean","Median","Variance","Range"],1],
["180 km in 3 hours gives average speed?",["50","60","70","90"],1],
["SQL command to remove rows?",["DROP","DELETE","REMOVE","CLEAR"],1],
["Probability of a head on one fair coin toss?",["0","1/4","1/2","1"],2],
["Chart commonly used to show a trend over time?",["Line","Pie","Table","Gauge"],0],
["Normalization mainly reduces?",["Redundancy","Security","Charts","Queries"],0],
["5 workers take 12 days. 10 workers take?",["3","5","6","24"],2],
["Which is supervised learning?",["Labeled churn prediction","Unlabeled grouping","PCA","Association rules"],0],
["CSV commonly means?",["Common System Variable","Comma-Separated Values","Column Storage Version","Central Source View"],1],
["SQL function to count rows?",["SUM()","COUNT()","TOTAL()","ROWS()"],1],
["Ratio 2:3, total 50. Larger part?",["20","25","30","35"],2],
["A yes/no value is commonly a?",["Boolean","Float","Array","Character"],0],
["Median of 3,7,9,12,15?",["7","9","10","12"],1],
["SQL clause used for sorting?",["SORT","ORDER BY","GROUP","ARRANGE"],1],
["Number increased by 20% becomes 240. Original?",["180","200","220","288"],1],
["Key that uniquely identifies a table row?",["Foreign key","Primary key","Index only","Composite value always"],1],
["Main purpose of a dashboard?",["Store passwords","Present key metrics visually","Compile code","Create tables"],1],
["Python structure for key-value pairs?",["List","Tuple","Dictionary","Set"],2],
["3 red and 2 blue balls. Probability of red?",["2/5","3/5","1/2","3/2"],1],
["SQL keyword removing duplicate SELECT rows?",["UNIQUE","DISTINCT","DEDUP","ONLY"],1],
["15% of 400?",["40","50","60","75"],2],
["Classification accuracy is?",["Correct/total","Total/incorrect","Mean features","Maximum value"],0],
["Pandas command for first rows?",["df.start()","df.head()","df.first()","df.top()"],1],
["12 items cost ₹360. Cost of 5?",["₹120","₹150","₹180","₹200"],1]
].map(x=>({q:x[0],o:x[1],a:x[2]}));
function teacher(req,res,next){if(req.session.teacher)return next();res.status(401).json({error:"Unauthorized"});}
function code(){return crypto.randomBytes(3).toString("hex").toUpperCase();}
function pub(s){return {id:s.id,name:s.name,code:s.code,joinedAt:s.joinedAt,camera:s.camera,microphone:s.microphone,submitted:s.submitted,score:s.score,lastSnapshot:s.lastSnapshot};}
app.get("/api/health",(q,r)=>r.json({ok:true}));
app.post("/api/teacher/login",(q,r)=>{let{username,password}=q.body||{};if(username===TU&&password===TP){q.session.teacher=true;return r.json({ok:true})}r.status(401).json({error:"Invalid username or password"});});
app.post("/api/teacher/logout",(q,r)=>q.session.destroy(()=>r.json({ok:true})));
app.get("/api/exams",teacher,(q,r)=>r.json([...exams.values()].map(e=>({id:e.id,code:e.code,title:e.title,duration:e.duration,questionCount:e.questions.length,active:e.active}))));
app.post("/api/exams",teacher,(q,r)=>{let e={id:crypto.randomUUID(),code:code(),title:String(q.body.title||"Capgemini Round 1 Demo"),duration:Math.max(1,Math.min(300,Number(q.body.duration||120))),questions:Q,active:false};exams.set(e.code,e);r.json({ok:true,exam:{...e,questions:undefined}})});
app.post("/api/exams/:code/start",teacher,(q,r)=>{let e=exams.get(q.params.code);if(!e)return r.status(404).json({error:"Exam not found"});e.active=true;io.emit("exam-started",{code:e.code});r.json({ok:true})});
app.post("/api/exams/:code/stop",teacher,(q,r)=>{let e=exams.get(q.params.code);if(!e)return r.status(404).json({error:"Exam not found"});e.active=false;io.emit("exam-stopped",{code:e.code});r.json({ok:true})});
app.get("/api/student/exam/:code",(q,r)=>{let e=exams.get(q.params.code.toUpperCase());if(!e)return r.status(404).json({error:"Invalid exam code"});if(!e.active)return r.status(403).json({error:"Exam has not been started"});r.json({title:e.title,code:e.code,duration:e.duration,questions:e.questions.map(({q,o})=>({q,o}))})});
app.post("/api/student/join",(q,r)=>{let e=exams.get(String(q.body.code||"").toUpperCase());if(!e)return r.status(404).json({error:"Invalid exam code"});if(!e.active)return r.status(403).json({error:"Exam is not active"});let s={id:crypto.randomUUID(),name:String(q.body.name||"Student").slice(0,80),code:e.code,joinedAt:Date.now(),camera:false,microphone:false,lastSnapshot:null,submitted:false,score:null};students.set(s.id,s);r.json({ok:true,studentId:s.id,code:e.code,duration:e.duration})});
app.get("/api/teacher/students",teacher,(q,r)=>r.json([...students.values()].map(pub)));
app.post("/api/student/status",(q,r)=>{let s=students.get(q.body.studentId);if(!s)return r.status(404).json({error:"Student session not found"});s.camera=!!q.body.camera;s.microphone=!!q.body.microphone;io.emit("student-update",pub(s));r.json({ok:true})});
app.post("/api/student/snapshot",(q,r)=>{let s=students.get(q.body.studentId);if(!s)return r.status(404).json({error:"Student session not found"});if(typeof q.body.image==="string"&&q.body.image.length<180000)s.lastSnapshot=q.body.image;s.camera=true;io.emit("student-update",pub(s));r.json({ok:true})});
app.post("/api/student/submit",(q,r)=>{let s=students.get(q.body.studentId),e=s&&exams.get(s.code);if(!e)return r.status(404).json({error:"Session not found"});let score=e.questions.reduce((n,x,i)=>n+(Number(q.body.answers?.[i])===x.a?1:0),0);s.submitted=true;s.score=score;io.emit("student-update",pub(s));r.json({ok:true,score,total:e.questions.length})});
app.get("/",(q,r)=>r.sendFile(path.join(__dirname,"public","teacher.html")));app.get("/student",(q,r)=>r.sendFile(path.join(__dirname,"public","student.html")));
server.listen(PORT,()=>console.log("Capgemini Round 1 server running on "+PORT));
