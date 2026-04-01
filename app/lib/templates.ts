export type Template = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  remixHint: string;
  html: string;
};

const SNAKE: Template = {
  id: 'snake',
  title: 'Snake',
  emoji: '🐍',
  description: 'Classic snake — eat, grow, don\'t crash',
  remixHint: 'e.g. make the snake a dragon, add a speed boost power-up, change the theme to space...',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Snake</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f0f1a;color:#eee;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:12px;user-select:none}
.title-row{display:flex;align-items:center;gap:10px}
.title-row h1{font-size:28px;font-weight:900;background:linear-gradient(135deg,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.title-icon{animation:sway 2s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
#meta{display:flex;gap:32px;font-size:15px;color:#a78bfa;font-weight:600}
canvas{border:2px solid #3b0764;border-radius:10px;display:block}
#btn{background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;border:none;padding:12px 32px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s}
#btn:hover{opacity:.85}
#msg{font-size:13px;color:#6b7280;height:20px}
#dpad{display:none;gap:4px;flex-direction:column;align-items:center}
.drow{display:flex;gap:4px}
.dpad-btn{background:#1e1b4b;border:1px solid #4c1d95;color:#a78bfa;width:48px;height:48px;border-radius:10px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.dpad-btn:active{background:#4c1d95}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
.score-pop{animation:pulse .3s ease-out}
</style>
</head>
<body>
<div class="title-row">
  <svg class="title-icon" width="36" height="36" viewBox="0 0 36 36"><path d="M6 18c0-3 2-6 6-6s4 3 6 3 2-3 6-3 6 3 6 6-2 6-6 6-4-3-6-3-2 3-6 3-6-3-6-6z" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="15" r="2" fill="#f472b6"/><circle cx="28" cy="21" r="2" fill="#f472b6"/></svg>
  <h1>Snake</h1>
</div>
<div id="meta"><span>Score: <b id="score">0</b></span><span>Best: <b id="best">0</b></span></div>
<canvas id="c" width="360" height="360"></canvas>
<button id="btn">Start Game</button>
<div id="msg">Arrow keys or WASD to move</div>
<div id="dpad">
  <div class="drow"><div class="dpad-btn" id="up">▲</div></div>
  <div class="drow"><div class="dpad-btn" id="left">◀</div><div class="dpad-btn" id="down">▼</div><div class="dpad-btn" id="right">▶</div></div>
</div>
<script>
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const GRID=18,COLS=20,ROWS=20;
let snake,dir,nextDir,food,score,best=0,running=false,loop,foodAnim=0;

function init(){
  snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  dir={x:1,y:0};nextDir={x:1,y:0};score=0;
  document.getElementById('score').textContent='0';
  spawnFood();running=true;
  document.getElementById('btn').textContent='Restart';
  document.getElementById('msg').textContent='Arrow keys or WASD to move';
  if(loop)clearInterval(loop);
  loop=setInterval(tick,130);
}

function spawnFood(){
  do{food={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}}
  while(snake.some(s=>s.x===food.x&&s.y===food.y));
  foodAnim=0;
}

function tick(){
  dir=nextDir;foodAnim+=0.15;
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)){
    clearInterval(loop);running=false;
    if(score>best){best=score;document.getElementById('best').textContent=best;}
    document.getElementById('msg').textContent='Game over! Score: '+score;
    draw();return;
  }
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){
    score+=10;
    const el=document.getElementById('score');el.textContent=score;
    el.classList.remove('score-pop');void el.offsetWidth;el.classList.add('score-pop');
    spawnFood();
  }else{snake.pop();}
  draw();
}

function draw(){
  ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,canvas.width,canvas.height);
  // grid dots
  ctx.fillStyle='#1a1a2e';
  for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){
    ctx.beginPath();ctx.arc(x*GRID+GRID/2,y*GRID+GRID/2,1,0,Math.PI*2);ctx.fill();
  }
  // food with pulse glow
  const pulse=1+Math.sin(foodAnim)*0.2;
  const fx=food.x*GRID+GRID/2,fy=food.y*GRID+GRID/2;
  ctx.save();
  ctx.shadowColor='#f472b6';ctx.shadowBlur=12*pulse;
  ctx.fillStyle='#f472b6';
  ctx.beginPath();ctx.arc(fx,fy,(GRID/2-2)*pulse,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.fillStyle='#fda4af';
  ctx.beginPath();ctx.arc(fx-2,fy-2,3,0,Math.PI*2);ctx.fill();
  // snake with gradient body + eyes on head
  snake.forEach((s,i)=>{
    const t=i/snake.length;
    ctx.fillStyle=\`hsl(\${265-t*40},75%,\${58-t*18}%)\`;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(s.x*GRID+1,s.y*GRID+1,GRID-2,GRID-2,4);
    else ctx.rect(s.x*GRID+1,s.y*GRID+1,GRID-2,GRID-2);
    ctx.fill();
    if(i===0){
      // eyes on head
      const cx=s.x*GRID+GRID/2,cy=s.y*GRID+GRID/2;
      const ex=dir.x*3,ey=dir.y*3;
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(cx-3+ex,cy-3+ey,2.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx+3+ex,cy-3+ey,2.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#0a0a14';
      ctx.beginPath();ctx.arc(cx-3+ex*1.2,cy-3+ey*1.2,1.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx+3+ex*1.2,cy-3+ey*1.2,1.2,0,Math.PI*2);ctx.fill();
    }
  });
  if(!running&&snake.length>3){
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#a78bfa';ctx.font='bold 22px system-ui';ctx.textAlign='center';
    ctx.fillText('Game Over',canvas.width/2,canvas.height/2-12);
    ctx.fillStyle='#e2e8f0';ctx.font='16px system-ui';
    ctx.fillText('Press Restart to play again',canvas.width/2,canvas.height/2+16);
  }
}

function setDir(d){if(!(d.x===-dir.x&&d.y===-dir.y))nextDir=d;}
document.addEventListener('keydown',e=>{
  const k={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},
    w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0},
    W:{x:0,y:-1},S:{x:0,y:1},A:{x:-1,y:0},D:{x:1,y:0}};
  if(k[e.key]){setDir(k[e.key]);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();}
});
document.getElementById('btn').onclick=init;
if('ontouchstart'in window){document.getElementById('dpad').style.display='flex';}
document.getElementById('up').onclick=()=>setDir({x:0,y:-1});
document.getElementById('down').onclick=()=>setDir({x:0,y:1});
document.getElementById('left').onclick=()=>setDir({x:-1,y:0});
document.getElementById('right').onclick=()=>setDir({x:1,y:0});
ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle='#3b0764';
for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){
  ctx.beginPath();ctx.arc(x*GRID+GRID/2,y*GRID+GRID/2,1,0,Math.PI*2);ctx.fill();
}
ctx.fillStyle='#7c3aed';ctx.font='bold 20px system-ui';ctx.textAlign='center';
ctx.fillText('Press Start Game',canvas.width/2,canvas.height/2);
</script>
</body>
</html>`,
};

const MATH_QUIZ: Template = {
  id: 'math-quiz',
  title: 'Math Quiz',
  emoji: '⚡',
  description: 'Speed math — how many can you answer in 30s?',
  remixHint: 'e.g. make it multiplication only, add a harder mode, change the theme to money problems...',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Math Quiz</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:20px;padding:20px}
.title-row{display:flex;align-items:center;gap:10px}
.title-row h1{font-size:30px;font-weight:900;color:#818cf8}
.title-icon{animation:zap 1.5s ease-in-out infinite}
@keyframes zap{0%,100%{filter:drop-shadow(0 0 4px #818cf8)}50%{filter:drop-shadow(0 0 12px #c4b5fd)}}
.card{background:#1e293b;border-radius:20px;padding:32px;text-align:center;width:100%;max-width:400px;display:flex;flex-direction:column;align-items:center;gap:16px}
#question{font-size:52px;font-weight:900;color:#fff;letter-spacing:-1px}
#answer{font-size:28px;background:#0f172a;border:2px solid #4f46e5;color:#fff;padding:12px 20px;border-radius:14px;width:180px;text-align:center;outline:none;transition:border-color .15s}
#answer:focus{border-color:#818cf8}
.bar-wrap{width:100%;background:#0f172a;border-radius:99px;height:8px;overflow:hidden}
#bar{height:100%;background:linear-gradient(90deg,#4f46e5,#818cf8);border-radius:99px;transition:width 1s linear}
#meta{display:flex;gap:24px;font-size:15px;font-weight:700}
.meta-icon{width:18px;height:18px;vertical-align:middle;margin-right:2px}
#correct{color:#4ade80}#wrong{color:#f87171}#timeleft{color:#818cf8}
#feedback{font-size:20px;font-weight:700;height:28px;transition:transform .2s}
.fb-pop{animation:fbpop .3s ease-out}
@keyframes fbpop{0%{transform:scale(1.4)}100%{transform:scale(1)}}
button{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;padding:14px 36px;border-radius:14px;font-size:17px;font-weight:700;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.85}
.result-icon{animation:trophy 1s ease-in-out infinite}
@keyframes trophy{0%,100%{transform:rotate(-5deg) scale(1)}50%{transform:rotate(5deg) scale(1.1)}}
</style>
</head>
<body>
<div class="title-row">
  <svg class="title-icon" width="36" height="36" viewBox="0 0 36 36"><path d="M18 4l3 10h10l-8 6 3 10-8-6-8 6 3-10-8-6h10z" fill="#818cf8" opacity="0.3"/><path d="M18 6v12M12 12h12" stroke="#818cf8" stroke-width="3" stroke-linecap="round"/><path d="M13 21h10" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/></svg>
  <h1>Math Quiz</h1>
</div>
<div class="card" id="start-card">
  <p style="color:#94a3b8;line-height:1.5">Answer as many math questions as you can in <b style="color:#818cf8">30 seconds</b>!</p>
  <button id="startBtn">Start Quiz</button>
</div>
<div class="card" id="game-card" style="display:none">
  <div id="meta">
    <span><svg class="meta-icon" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#4ade80" stroke-width="2"/><path d="M7 10l2 2 4-4" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span id="correct">0</span></span>
    <span><svg class="meta-icon" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#818cf8" stroke-width="2"/><path d="M10 6v5l3 2" stroke="#818cf8" stroke-width="2" stroke-linecap="round"/></svg><span id="timeleft">30</span>s</span>
    <span><svg class="meta-icon" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#f87171" stroke-width="2"/><path d="M7 7l6 6M13 7l-6 6" stroke="#f87171" stroke-width="2" stroke-linecap="round"/></svg><span id="wrong">0</span></span>
  </div>
  <div class="bar-wrap"><div id="bar" style="width:100%"></div></div>
  <div id="question">2 + 3</div>
  <input id="answer" type="number" inputmode="numeric" placeholder="?" />
  <div id="feedback"></div>
</div>
<div class="card" id="result-card" style="display:none">
  <div id="resultIcon" class="result-icon"></div>
  <div id="resultTitle" style="font-size:24px;font-weight:900"></div>
  <div id="resultMsg" style="color:#94a3b8"></div>
  <button id="restartBtn">Play Again</button>
</div>
<script>
const trophySvg='<svg width="56" height="56" viewBox="0 0 56 56"><path d="M16 8h24v4c0 8-5 16-12 18-7-2-12-10-12-18V8z" fill="#eab308" opacity="0.8"/><path d="M16 12H8c0 6 3 10 8 12M40 12h8c0 6-3 10-8 12" stroke="#eab308" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="22" y="30" width="12" height="4" rx="2" fill="#ca8a04"/><rect x="18" y="34" width="20" height="4" rx="2" fill="#a16207"/></svg>';
const starSvg='<svg width="56" height="56" viewBox="0 0 56 56"><path d="M28 8l6 14h14l-11 9 4 15-13-9-13 9 4-15L8 22h14z" fill="#818cf8"/></svg>';
const flexSvg='<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="20" fill="#7c3aed" opacity="0.3"/><path d="M20 32c2-8 6-14 8-14s6 6 8 14" stroke="#a78bfa" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="22" cy="22" r="2" fill="#c4b5fd"/><circle cx="34" cy="22" r="2" fill="#c4b5fd"/></svg>';
let score=0,wrongs=0,timeLeft=30,timer,a,b,op,answered=false;
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function genQ(){
  const ops=['+','-','\\u00d7'];
  op=ops[Math.floor(Math.random()*ops.length)];
  if(op==='+'){a=rand(1,50);b=rand(1,50);}
  else if(op==='-'){a=rand(10,60);b=rand(1,a);}
  else{a=rand(2,12);b=rand(2,12);}
  document.getElementById('question').textContent=a+' '+op+' '+b+' = ?';
  document.getElementById('answer').value='';
  document.getElementById('answer').focus();
  answered=false;
}
function getAns(){return op==='+'?a+b:op==='-'?a-b:a*b;}
function check(){
  if(answered)return;
  const v=parseInt(document.getElementById('answer').value,10);
  if(isNaN(v))return;
  answered=true;
  const fb=document.getElementById('feedback');
  fb.classList.remove('fb-pop');void fb.offsetWidth;fb.classList.add('fb-pop');
  if(v===getAns()){
    score++;document.getElementById('correct').textContent=score;
    fb.textContent='Correct!';fb.style.color='#4ade80';
  }else{
    wrongs++;document.getElementById('wrong').textContent=wrongs;
    fb.textContent='Was '+getAns();fb.style.color='#f87171';
  }
  setTimeout(()=>{fb.textContent='';genQ();},500);
}
function startGame(){
  score=0;wrongs=0;timeLeft=30;
  document.getElementById('correct').textContent='0';
  document.getElementById('wrong').textContent='0';
  document.getElementById('start-card').style.display='none';
  document.getElementById('result-card').style.display='none';
  document.getElementById('game-card').style.display='flex';
  document.getElementById('bar').style.width='100%';
  genQ();
  timer=setInterval(()=>{
    timeLeft--;
    document.getElementById('timeleft').textContent=timeLeft;
    document.getElementById('bar').style.width=(timeLeft/30*100)+'%';
    if(timeLeft<=0){
      clearInterval(timer);
      document.getElementById('game-card').style.display='none';
      document.getElementById('result-card').style.display='flex';
      const pct=score/(score+wrongs||1);
      document.getElementById('resultIcon').innerHTML=pct>=.8?trophySvg:pct>=.5?starSvg:flexSvg;
      document.getElementById('resultTitle').textContent=score+' correct!';
      document.getElementById('resultMsg').textContent='You missed '+wrongs+'. Try to beat your score!';
    }
  },1000);
}
document.getElementById('startBtn').onclick=startGame;
document.getElementById('restartBtn').onclick=startGame;
document.getElementById('answer').addEventListener('keydown',e=>{if(e.key==='Enter')check();});
</script>
</body>
</html>`,
};

const TRIVIA: Template = {
  id: 'trivia',
  title: 'Trivia',
  emoji: '🧠',
  description: '10 questions. How many can you get right?',
  remixHint: 'e.g. make it about movies, sports, science, history, or a specific decade...',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trivia</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0c1a2e;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;padding:20px}
.title-row{display:flex;align-items:center;gap:10px}
.title-row h1{font-size:28px;font-weight:900;color:#38bdf8}
.title-icon{animation:think 2s ease-in-out infinite}
@keyframes think{0%,100%{filter:drop-shadow(0 0 6px #38bdf8)}50%{filter:drop-shadow(0 0 14px #7dd3fc)}}
.card{background:#0f2444;border:1px solid #1e3a5f;border-radius:20px;padding:28px;width:100%;max-width:520px}
#progress{font-size:13px;color:#64748b;margin-bottom:8px}
#progressbar{width:100%;height:4px;background:#1e3a5f;border-radius:99px;margin-bottom:20px;overflow:hidden}
#pbar{height:100%;background:linear-gradient(90deg,#0284c7,#38bdf8);border-radius:99px;transition:width .4s}
#question{font-size:20px;font-weight:700;line-height:1.4;margin-bottom:20px}
.opt{background:#0a1628;border:2px solid #1e3a5f;color:#cbd5e1;padding:13px 16px;border-radius:12px;width:100%;font-size:15px;cursor:pointer;text-align:left;margin-bottom:8px;transition:all .2s;display:flex;align-items:center;gap:10px}
.opt:hover:not(:disabled){border-color:#38bdf8;background:#0f2f52;transform:translateX(4px)}
.opt.correct{background:#14532d;border-color:#4ade80;color:#fff}
.opt.correct .opt-letter{background:#4ade80;color:#14532d}
.opt.wrong{background:#450a0a;border-color:#f87171;color:#fff}
.opt.wrong .opt-letter{background:#f87171;color:#450a0a}
.opt-letter{width:28px;height:28px;border-radius:8px;background:#1e3a5f;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;transition:all .2s}
#feedback{text-align:center;font-size:15px;font-weight:700;height:22px;margin:4px 0}
#nextBtn{background:linear-gradient(135deg,#0284c7,#7c3aed);color:#fff;border:none;padding:12px 28px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;display:none;margin-top:8px;transition:transform .15s}
#nextBtn:hover{transform:translateY(-1px)}
button.primary{background:linear-gradient(135deg,#0284c7,#7c3aed);color:#fff;border:none;padding:14px 36px;border-radius:14px;font-size:17px;font-weight:700;cursor:pointer;transition:transform .15s}
button.primary:hover{transform:translateY(-1px)}
.result-icon{animation:resultBounce 1s ease-in-out infinite}
@keyframes resultBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.slide-in{animation:slideIn .3s ease-out}
@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<div class="title-row">
  <svg class="title-icon" width="36" height="36" viewBox="0 0 36 36"><ellipse cx="18" cy="16" rx="13" ry="11" fill="#0284c7" opacity="0.3"/><path d="M8 16c0-6 4.5-11 10-11s10 5 10 11-4 8-6 10c-1 1-1 2-1 3h-6c0-1 0-2-1-3-2-2-6-4-6-10z" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/><path d="M15 29h6" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/><path d="M15 32h6" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="15" r="3" fill="none" stroke="#7dd3fc" stroke-width="1.5"/><path d="M18 12v-2M22 15h2M14 15h-2" stroke="#7dd3fc" stroke-width="1.5" stroke-linecap="round"/></svg>
  <h1>Trivia</h1>
</div>
<div class="card" id="start-card">
  <p style="color:#64748b;line-height:1.5;margin-bottom:20px">10 questions on science, history, geography & pop culture. How many can you get?</p>
  <button class="primary" id="startBtn">Let's Go!</button>
</div>
<div class="card" id="game-card" style="display:none">
  <div id="progress">Question 1 of 10</div>
  <div id="progressbar"><div id="pbar" style="width:10%"></div></div>
  <div id="question"></div>
  <div id="options"></div>
  <div id="feedback"></div>
  <button id="nextBtn">Next &#8594;</button>
</div>
<div class="card" id="result-card" style="display:none;text-align:center">
  <div id="resultIcon" class="result-icon" style="margin-bottom:12px"></div>
  <div id="resultTitle" style="font-size:26px;font-weight:900;margin-bottom:8px;color:#38bdf8"></div>
  <div id="resultScore" style="font-size:17px;color:#94a3b8;margin-bottom:24px"></div>
  <button class="primary" id="restartBtn">Play Again</button>
</div>
<script>
const trophySvg='<svg width="56" height="56" viewBox="0 0 56 56"><path d="M16 8h24v4c0 8-5 16-12 18-7-2-12-10-12-18V8z" fill="#eab308" opacity="0.8"/><path d="M16 12H8c0 6 3 10 8 12M40 12h8c0 6-3 10-8 12" stroke="#eab308" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="22" y="30" width="12" height="4" rx="2" fill="#ca8a04"/><rect x="18" y="34" width="20" height="4" rx="2" fill="#a16207"/></svg>';
const starSvg='<svg width="56" height="56" viewBox="0 0 56 56"><path d="M28 8l6 14h14l-11 9 4 15-13-9-13 9 4-15L8 22h14z" fill="#38bdf8"/></svg>';
const thumbsSvg='<svg width="56" height="56" viewBox="0 0 56 56"><path d="M20 28l6-16c1-2 4-2 5 0l2 8h10c2 0 4 2 3 4l-4 16c-1 2-3 3-5 3H20V28z" fill="#0284c7" opacity="0.7"/><rect x="10" y="28" width="8" height="20" rx="3" fill="#38bdf8"/></svg>';
const tryAgainSvg='<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="20" fill="#1e3a5f"/><path d="M20 24c2-6 8-8 14-4" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M34 16v5h-5" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const letters=['A','B','C','D'];
const QS=[
  {q:"Which planet is known as the Red Planet?",o:["Venus","Jupiter","Mars","Saturn"],a:2},
  {q:"How many sides does a hexagon have?",o:["5","6","7","8"],a:1},
  {q:"What is the chemical symbol for gold?",o:["Go","Gd","Au","Ag"],a:2},
  {q:"Who painted the Mona Lisa?",o:["Michelangelo","Van Gogh","Raphael","Leonardo da Vinci"],a:3},
  {q:"What is the fastest land animal?",o:["Lion","Cheetah","Pronghorn","Greyhound"],a:1},
  {q:"Which country has the most natural lakes?",o:["Russia","Brazil","USA","Canada"],a:3},
  {q:"What year did the first iPhone launch?",o:["2005","2006","2007","2008"],a:2},
  {q:"How many bones are in the adult human body?",o:["196","206","216","226"],a:1},
  {q:"What is the square root of 144?",o:["11","12","13","14"],a:1},
  {q:"Which ocean is the largest?",o:["Atlantic","Indian","Arctic","Pacific"],a:3},
];
let cur=0,score=0,answered=false;
function showQ(){
  const q=QS[cur];
  document.getElementById('progress').textContent='Question '+(cur+1)+' of '+QS.length;
  document.getElementById('pbar').style.width=((cur+1)/QS.length*100)+'%';
  document.getElementById('question').textContent=q.q;
  document.getElementById('feedback').textContent='';
  document.getElementById('nextBtn').style.display='none';
  answered=false;
  const opts=document.getElementById('options');
  opts.innerHTML='';
  q.o.forEach((o,i)=>{
    const btn=document.createElement('button');
    btn.className='opt slide-in';
    btn.style.animationDelay=(i*0.05)+'s';
    btn.innerHTML='<span class="opt-letter">'+letters[i]+'</span>'+o;
    btn.onclick=()=>pick(i,btn,q.a);
    opts.appendChild(btn);
  });
}
function pick(idx,btn,correct){
  if(answered)return;answered=true;
  document.querySelectorAll('.opt').forEach(b=>b.disabled=true);
  if(idx===correct){btn.classList.add('correct');score++;document.getElementById('feedback').style.color='#4ade80';document.getElementById('feedback').textContent='Correct!';}
  else{btn.classList.add('wrong');document.querySelectorAll('.opt')[correct].classList.add('correct');document.getElementById('feedback').style.color='#f87171';document.getElementById('feedback').textContent='Wrong!';}
  document.getElementById('nextBtn').style.display='block';
}
function next(){cur++;if(cur>=QS.length){showResult();}else{showQ();}}
function showResult(){
  document.getElementById('game-card').style.display='none';
  document.getElementById('result-card').style.display='block';
  const p=score/QS.length;
  document.getElementById('resultIcon').innerHTML=p>=.9?trophySvg:p>=.7?starSvg:p>=.5?thumbsSvg:tryAgainSvg;
  document.getElementById('resultTitle').textContent=p>=.9?'Perfect!':p>=.7?'Great job!':p>=.5?'Not bad!':'Keep going!';
  document.getElementById('resultScore').textContent='You got '+score+' out of '+QS.length+' correct.';
}
function start(){cur=0;score=0;document.getElementById('start-card').style.display='none';document.getElementById('result-card').style.display='none';document.getElementById('game-card').style.display='block';showQ();}
document.getElementById('startBtn').onclick=start;
document.getElementById('restartBtn').onclick=start;
document.getElementById('nextBtn').onclick=next;
</script>
</body>
</html>`,
};

const BLANK: Template = {
  id: 'blank',
  title: 'From Scratch',
  emoji: '✨',
  description: 'Describe any game and AI builds it',
  remixHint: 'Describe the game you want to make...',
  html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Blank</title>
<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0f1a;color:#a78bfa;font-family:system-ui,sans-serif;font-size:18px;text-align:center;padding:24px}</style>
</head><body><p>Describe your game in the sidebar and hit Generate ✨</p></body></html>`,
};

export const TEMPLATES: Template[] = [SNAKE, MATH_QUIZ, TRIVIA, BLANK];
export function getTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
