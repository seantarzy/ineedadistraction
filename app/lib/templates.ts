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
  description: 'Describe a clever little game and AI builds it',
  remixHint: 'Describe the brainy mini-game you want to make...',
  html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Blank</title>
<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0f1a;color:#a78bfa;font-family:system-ui,sans-serif;font-size:18px;text-align:center;padding:24px}</style>
</head><body><p>Describe your brainy game idea in the sidebar and hit Generate ✨</p></body></html>`,
};

const MATH_RACER: Template = {
  id: 'math-racer',
  title: 'Math Racer',
  emoji: '🏎️',
  description: 'Answer math to accelerate — beat rivals that speed up each level',
  remixHint: 'e.g. make it multiplication-only, turn the cars into rockets in space, add a nitro streak bonus, or theme it around money math...',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Math Racer</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:radial-gradient(circle at top,#1e1b4b,#0a0612 65%);color:#f4f0ff;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;user-select:none}
#app{width:min(520px,100%);background:rgba(15,12,32,.9);border:1px solid rgba(168,85,247,.3);border-radius:24px;padding:20px;box-shadow:0 0 40px rgba(168,85,247,.2)}
.title{font-size:26px;font-weight:900;text-align:center;background:linear-gradient(90deg,#c084fc,#f472b6,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{text-align:center;color:#c4b5fd;font-size:13px;margin-bottom:14px;line-height:1.5}
.hud{display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#a5b4fc;margin-bottom:10px}
.hud b{color:#fff}
.speed-wrap{height:8px;background:#0a0612;border-radius:99px;overflow:hidden;margin-bottom:12px;border:1px solid rgba(129,140,248,.2)}
#speed{height:100%;width:15%;background:linear-gradient(90deg,#22d3ee,#a855f7,#ec4899);transition:width .2s}
#track{position:relative;background:#0a0612;border:1px solid rgba(129,140,248,.25);border-radius:16px;padding:8px 0;overflow:hidden;margin-bottom:14px}
.lane{position:relative;height:36px;border-bottom:2px dashed rgba(129,140,248,.14)}
.lane:last-child{border-bottom:none}
.finish{position:absolute;right:30px;top:0;height:100%;width:6px;background:repeating-linear-gradient(45deg,#fff 0 6px,#000 6px 12px);opacity:.35}
.car{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:25px;left:2%;transition:left .12s linear}
#q{font-size:40px;font-weight:900;text-align:center;margin:4px 0 14px;letter-spacing:1px}
#opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.opt{background:linear-gradient(135deg,#6d28d9,#9333ea);color:#fff;border:none;border-radius:14px;padding:16px;font-size:22px;font-weight:800;cursor:pointer;transition:transform .1s,box-shadow .15s;box-shadow:0 6px 16px rgba(124,58,237,.3)}
.opt:hover:not(:disabled){transform:translateY(-2px)}
.opt:active{transform:scale(.97)}
.opt.good{background:linear-gradient(135deg,#059669,#10b981)!important}
.opt.bad{background:linear-gradient(135deg,#dc2626,#f97316)!important}
.msg{text-align:center;font-size:14px;font-weight:700;height:20px;margin-top:10px;color:#c4b5fd}
.cta{width:100%;margin-top:12px;padding:15px;border-radius:16px;border:none;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;font-size:17px;font-weight:800;cursor:pointer;box-shadow:0 0 24px rgba(168,85,247,.35)}
.cta:hover{opacity:.92}
#start,#result{text-align:center}
#result{display:none}
.big{font-size:22px;font-weight:900;margin:8px 0}
</style>
</head>
<body>
<div id="app">
  <div class="title">Math Racer</div>
  <div class="sub">Answer fast to accelerate — wrong answers slow you down!</div>

  <div id="start">
    <p style="color:#cbd5e1;line-height:1.55;margin:6px 0 16px">Solve quick math to boost your car past the rivals. Each level the other racers get faster — how many wins can you stack up?</p>
    <button class="cta" id="startBtn">Start Engine</button>
  </div>

  <div id="game" style="display:none">
    <div class="hud"><span>Level <b id="lvl">1</b></span><span>Place <b id="place">1st</b></span><span>Wins <b id="wins">0</b></span></div>
    <div class="speed-wrap"><div id="speed"></div></div>
    <div id="track"></div>
    <div id="q"></div>
    <div id="opts"></div>
    <div class="msg" id="msg"></div>
  </div>

  <div id="result">
    <div id="badge" style="font-size:50px"></div>
    <div class="big" id="resultTitle"></div>
    <div class="sub" id="resultText" style="margin-bottom:0"></div>
    <button class="cta" id="againBtn">Race Again</button>
  </div>
</div>
<script>
var CARS=['🏎️','🚗','🚙','🛻'];
var BASE=5;
var trackEl=document.getElementById('track');
var qEl=document.getElementById('q'),optsEl=document.getElementById('opts'),msgEl=document.getElementById('msg');
var level=1,wins=0,ans=0,playerSpeed=BASE,running=false,raf=0,lastT=0,cars=[];

function rnd(mn,mx){return Math.floor(Math.random()*(mx-mn+1))+mn;}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function ordinal(n){return n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:(n%10<4?n%10:0)]);}
function setMsg(t,c){msgEl.textContent=t;msgEl.style.color=c||'#c4b5fd';}
function aiBase(){return 7+(level-1)*1.7;}

function buildTrack(){
  trackEl.innerHTML='';cars=[];
  for(var i=0;i<4;i++){
    var lane=document.createElement('div');lane.className='lane';
    var fin=document.createElement('div');fin.className='finish';lane.appendChild(fin);
    var car=document.createElement('div');car.className='car';car.textContent=CARS[i];lane.appendChild(car);
    trackEl.appendChild(lane);
    cars.push({pos:0,el:car,isPlayer:i===0});
  }
}

function newQuestion(){
  var ops=['+','-','×'];
  var op=ops[rnd(0,2)];
  var maxN=8+level*3,a,b;
  if(op==='+'){a=rnd(1,maxN);b=rnd(1,maxN);ans=a+b;}
  else if(op==='-'){a=rnd(2,maxN);b=rnd(1,a);ans=a-b;}
  else{var m=Math.min(12,3+level*2);a=rnd(2,m);b=rnd(2,m);ans=a*b;}
  qEl.textContent=a+' '+op+' '+b;
  var seen={};seen[ans]=1;var opts=[ans];
  while(opts.length<4){var d=ans+rnd(-6,6);if(d>=0&&!seen[d]){seen[d]=1;opts.push(d);}}
  shuffle(opts);
  optsEl.innerHTML='';
  opts.forEach(function(o){
    var btn=document.createElement('button');btn.className='opt';btn.textContent=o;
    btn.onclick=function(){pick(o,btn);};
    optsEl.appendChild(btn);
  });
}

function pick(val,btn){
  if(!running)return;
  if(val===ans){playerSpeed=Math.min(32,playerSpeed+7);btn.classList.add('good');setMsg('Nice! Speed boost','#6ee7b7');}
  else{playerSpeed=Math.max(2,playerSpeed-7);btn.classList.add('bad');setMsg('Oops — slowing down','#fca5a5');}
  var all=document.querySelectorAll('.opt');
  for(var i=0;i<all.length;i++)all[i].disabled=true;
  setTimeout(function(){if(running)newQuestion();},240);
}

function updatePlace(){
  var pp=cars[0].pos,rank=1;
  for(var i=1;i<cars.length;i++)if(cars[i].pos>pp)rank++;
  document.getElementById('place').textContent=ordinal(rank);
}
function updateSpeedBar(){document.getElementById('speed').style.width=Math.min(100,playerSpeed/32*100)+'%';}

function loop(t){
  if(!running)return;
  if(!lastT)lastT=t;
  var dt=Math.min(0.05,(t-lastT)/1000);lastT=t;
  playerSpeed+=(BASE-playerSpeed)*0.7*dt;
  cars[0].pos+=playerSpeed*dt;
  for(var i=1;i<cars.length;i++)cars[i].pos+=(aiBase()+Math.sin(t/450+i*2)*1.3)*dt;
  var maxPos=-1,winner=null;
  for(var j=0;j<cars.length;j++){
    var c=cars[j],p=Math.min(100,c.pos);
    c.el.style.left=(2+p*0.9)+'%';
    if(c.pos>maxPos){maxPos=c.pos;winner=c;}
  }
  updatePlace();updateSpeedBar();
  if(maxPos>=100){endRace(winner.isPlayer);return;}
  raf=requestAnimationFrame(loop);
}

function endRace(won){
  running=false;cancelAnimationFrame(raf);
  if(won){
    wins++;level++;
    document.getElementById('wins').textContent=wins;
    setMsg('🏆 You won! Level '+level+' — rivals faster!','#fde68a');
    setTimeout(startRace,1200);
  }else{showResult();}
}

function showResult(){
  document.getElementById('game').style.display='none';
  var r=document.getElementById('result');r.style.display='block';
  document.getElementById('badge').textContent=wins>=5?'🏆':wins>=3?'🥇':wins>=1?'🎖️':'🏁';
  document.getElementById('resultTitle').textContent=wins===0?'Out of the running!':'You won '+wins+(wins===1?' race':' races')+'!';
  document.getElementById('resultText').textContent='The rivals caught you at level '+level+'. Tap to line up again.';
}

function startRace(){
  buildTrack();
  playerSpeed=BASE;lastT=0;running=true;
  document.getElementById('lvl').textContent=level;
  document.getElementById('wins').textContent=wins;
  document.getElementById('place').textContent='1st';
  document.getElementById('start').style.display='none';
  document.getElementById('result').style.display='none';
  document.getElementById('game').style.display='block';
  setMsg('');
  newQuestion();
  raf=requestAnimationFrame(loop);
}

document.getElementById('startBtn').onclick=function(){level=1;wins=0;startRace();};
document.getElementById('againBtn').onclick=function(){level=1;wins=0;startRace();};
</script>
</body>
</html>`,
};

const MEMORY_SEQUENCE: Template = {
  id: 'memory-sequence',
  title: 'Memory Sequence',
  emoji: '🧩',
  description: 'Watch the pattern light up, then repeat it — it grows each round',
  remixHint: 'e.g. swap the pads for animal emojis, add a 5th or 6th pad, speed it up, or theme the colors and sounds around a mood...',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Memory Sequence</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:radial-gradient(circle at top,#1e1b4b,#0a0612 65%);color:#f4f0ff;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;user-select:none}
#app{width:min(420px,100%);background:rgba(15,12,32,.9);border:1px solid rgba(168,85,247,.3);border-radius:24px;padding:22px;box-shadow:0 0 40px rgba(168,85,247,.2);text-align:center}
.title{font-size:26px;font-weight:900;background:linear-gradient(90deg,#c084fc,#f472b6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{color:#c4b5fd;font-size:13px;margin-bottom:16px;line-height:1.5}
.hud{display:flex;justify-content:center;gap:26px;font-size:14px;font-weight:700;color:#a5b4fc;margin-bottom:16px}
.hud b{color:#fff}
.pad{display:grid;grid-template-columns:1fr 1fr;gap:14px;width:min(300px,78vw);margin:0 auto 10px}
.tile{aspect-ratio:1;border:none;border-radius:20px;cursor:pointer;opacity:.5;transition:opacity .08s,filter .08s,transform .06s}
.tile:disabled{cursor:default}
.t0{background:#a855f7}.t1{background:#ec4899}.t2{background:#22d3ee}.t3{background:#fbbf24}
.tile.lit{opacity:1;filter:brightness(1.5) saturate(1.2);box-shadow:0 0 30px rgba(255,255,255,.4);transform:scale(1.04)}
.status{min-height:24px;font-size:15px;font-weight:700;color:#c4b5fd;margin:14px 0 4px}
.cta{margin-top:8px;padding:14px 30px;border-radius:16px;border:none;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 0 24px rgba(168,85,247,.35)}
.cta:hover{opacity:.92}
</style>
</head>
<body>
<div id="app">
  <div class="title">Memory Sequence</div>
  <div class="sub">Watch the pads flash, then tap them back in order.</div>
  <div class="hud"><span>Round <b id="round">0</b></span><span>Best <b id="best">0</b></span></div>
  <div class="pad">
    <button class="tile t0" data-i="0"></button>
    <button class="tile t1" data-i="1"></button>
    <button class="tile t2" data-i="2"></button>
    <button class="tile t3" data-i="3"></button>
  </div>
  <div class="status" id="status">Press Start and watch closely</div>
  <button class="cta" id="startBtn">Start</button>
</div>
<script>
var tiles=[];
var nodes=document.querySelectorAll('.tile');
for(var k=0;k<nodes.length;k++)tiles.push(nodes[k]);
var seq=[],inputIdx=0,round=0,best=0,accepting=false;
var freqs=[329.63,415.30,523.25,659.25],actx=null;
var statusEl=document.getElementById('status'),startBtn=document.getElementById('startBtn');

function beep(i){
  try{
    if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();
    var o=actx.createOscillator(),g=actx.createGain();
    o.frequency.value=freqs[i];o.type='sine';o.connect(g);g.connect(actx.destination);
    g.gain.setValueAtTime(0.16,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+0.3);
    o.start();o.stop(actx.currentTime+0.32);
  }catch(e){}
}
function flash(i,dur){var t=tiles[i];t.classList.add('lit');beep(i);setTimeout(function(){t.classList.remove('lit');},dur);}
function setStatus(t){statusEl.textContent=t;}
function setHud(){document.getElementById('round').textContent=round;document.getElementById('best').textContent=best;}

function playback(){
  accepting=false;setStatus('Watch...');
  var on=Math.max(200,520-round*18),gap=Math.max(90,220-round*8);
  seq.forEach(function(idx,k){setTimeout(function(){flash(idx,on-60);},k*(on+gap)+400);});
  setTimeout(function(){accepting=true;inputIdx=0;setStatus('Your turn — repeat it');},seq.length*(on+gap)+400);
}
function nextRound(){round++;setHud();seq.push(Math.floor(Math.random()*4));playback();}
function press(i){
  if(!accepting)return;
  flash(i,170);
  if(i===seq[inputIdx]){
    inputIdx++;
    if(inputIdx===seq.length){accepting=false;setStatus('✓ Nice!');setTimeout(nextRound,750);}
  }else{gameOver();}
}
function gameOver(){
  accepting=false;
  var done=round-1;
  if(done>best)best=done;
  setHud();
  setStatus('💥 Missed it — you recalled a sequence of '+done+'!');
  tiles.forEach(function(t){t.classList.add('lit');});
  setTimeout(function(){tiles.forEach(function(t){t.classList.remove('lit');});},350);
  startBtn.textContent='Play Again';startBtn.style.display='inline-block';
}
function start(){seq=[];round=0;inputIdx=0;setHud();startBtn.style.display='none';nextRound();}

tiles.forEach(function(t){t.onclick=function(){press(parseInt(t.getAttribute('data-i'),10));};});
startBtn.onclick=start;
</script>
</body>
</html>`,
};

const ODD_ONE_OUT: Template = {
  id: 'odd-one-out',
  title: 'Odd One Out',
  emoji: '🔍',
  description: 'Spot the tile that breaks the pattern before the clock runs out',
  remixHint: 'e.g. use food emojis, make it word categories instead of emojis, add a lives system, or theme it around a season or holiday...',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Odd One Out</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:radial-gradient(circle at top,#1e1b4b,#0a0612 65%);color:#f4f0ff;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;user-select:none}
#app{width:min(460px,100%);background:rgba(15,12,32,.9);border:1px solid rgba(168,85,247,.3);border-radius:24px;padding:20px;box-shadow:0 0 40px rgba(168,85,247,.2);text-align:center}
.title{font-size:26px;font-weight:900;background:linear-gradient(90deg,#c084fc,#f472b6,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{color:#c4b5fd;font-size:13px;margin-bottom:14px;line-height:1.5}
.hud{display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:#a5b4fc;margin-bottom:8px}
.hud b{color:#fff}
.bar{height:8px;background:#0a0612;border-radius:99px;overflow:hidden;margin-bottom:14px;border:1px solid rgba(129,140,248,.2)}
#fill{height:100%;width:100%;background:linear-gradient(90deg,#22d3ee,#a855f7,#ec4899);transition:width .1s linear}
#grid{display:grid;gap:8px;justify-content:center;margin:0 auto 6px;line-height:1}
.cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#191234;border:1px solid rgba(129,140,248,.18);border-radius:14px;cursor:pointer;transition:transform .06s,background .12s}
.cell:hover{background:#241a45}
.cell:active{transform:scale(.94)}
.cell.good{background:#065f46!important}
.cell.bad{background:#7f1d1d!important}
.msg{min-height:20px;font-size:14px;font-weight:700;color:#c4b5fd;margin-top:8px}
.cta{margin-top:10px;padding:14px 30px;border-radius:16px;border:none;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 0 24px rgba(168,85,247,.35)}
.cta:hover{opacity:.92}
#start,#result{margin-top:6px}
#result{display:none}
.big{font-size:22px;font-weight:900;margin:8px 0}
</style>
</head>
<body>
<div id="app">
  <div class="title">Odd One Out</div>
  <div class="sub">One tile doesn't belong. Tap it fast — the grid keeps growing.</div>

  <div id="start">
    <p style="color:#cbd5e1;line-height:1.55;margin:6px 0 14px">Find the odd tile before time runs out. Every correct tap adds time; every miss costs you. How high can you score?</p>
    <button class="cta" id="startBtn">Start</button>
  </div>

  <div id="game" style="display:none">
    <div class="hud"><span>Score <b id="score">0</b></span><span>Time <b id="time">45</b>s</span></div>
    <div class="bar"><div id="fill"></div></div>
    <div id="grid"></div>
    <div class="msg" id="msg"></div>
  </div>

  <div id="result">
    <div id="badge" style="font-size:50px"></div>
    <div class="big" id="resultTitle"></div>
    <div class="sub" id="resultText" style="margin-bottom:0"></div>
    <button class="cta" id="againBtn">Play Again</button>
  </div>
</div>
<script>
var PAIRS=[
  ['🔴','🟠'],['🟠','🟡'],['🟡','🟢'],['🟢','🔵'],['🔵','🟣'],['🟣','🔴'],['🟤','🔴'],
  ['😀','😄'],['🙂','😊'],['😺','😸'],['😐','😑'],['😮','😯'],['🥲','😢'],
  ['⭐','🌟'],['🌸','🌺'],['🐶','🐺'],['🐸','🐊'],['🍊','🍑'],['🌙','🌛'],['❤️','🧡']
];
var TOTAL=45;
var score=0,time=TOTAL,round=0,playing=false,timer=null;
var gridEl=document.getElementById('grid'),msgEl=document.getElementById('msg');

function rnd(mn,mx){return Math.floor(Math.random()*(mx-mn+1))+mn;}
function flashMsg(t,c){msgEl.textContent=t;msgEl.style.color=c||'#c4b5fd';}
function updateHud(){
  document.getElementById('score').textContent=score;
  document.getElementById('time').textContent=Math.ceil(time);
  document.getElementById('fill').style.width=(time/TOTAL*100)+'%';
}

function newRound(){
  round++;
  var cols=Math.min(6,3+Math.floor((round-1)/2)),n=cols*cols;
  var pair=PAIRS[rnd(0,PAIRS.length-1)];
  var common=pair[0],odd=pair[1];
  if(Math.random()<0.5){common=pair[1];odd=pair[0];}
  var oddAt=rnd(0,n-1);
  gridEl.style.gridTemplateColumns='repeat('+cols+',1fr)';
  gridEl.style.width=Math.min(360,cols*60)+'px';
  gridEl.style.fontSize=Math.max(16,46-cols*4)+'px';
  gridEl.innerHTML='';
  for(var i=0;i<n;i++){
    (function(idx){
      var c=document.createElement('button');c.className='cell';
      c.textContent=(idx===oddAt?odd:common);
      c.onclick=function(){pick(idx===oddAt,c);};
      gridEl.appendChild(c);
    })(i);
  }
}

function pick(correct,cell){
  if(!playing)return;
  if(correct){
    score++;time=Math.min(TOTAL,time+1.2);
    flashMsg('Sharp eye! +1','#6ee7b7');updateHud();
    setTimeout(newRound,120);
  }else{
    time=Math.max(0,time-3);cell.classList.add('bad');
    flashMsg('Not it — −3s','#fca5a5');updateHud();
    setTimeout(function(){cell.classList.remove('bad');},280);
    if(time<=0)end();
  }
}

function tick(){time-=0.1;if(time<=0){time=0;updateHud();end();return;}updateHud();}

function end(){
  playing=false;if(timer){clearInterval(timer);timer=null;}
  document.getElementById('game').style.display='none';
  var r=document.getElementById('result');r.style.display='block';
  document.getElementById('badge').textContent=score>=25?'🦅':score>=15?'🏆':score>=7?'🔍':'👀';
  document.getElementById('resultTitle').textContent=score+(score===1?' spot!':' spots!');
  document.getElementById('resultText').textContent=score>=15?'Eagle eyes. Can you beat it?':'Nice hunting — try to beat your score.';
}

function start(){
  score=0;time=TOTAL;round=0;playing=true;
  document.getElementById('start').style.display='none';
  document.getElementById('result').style.display='none';
  document.getElementById('game').style.display='block';
  updateHud();flashMsg('');newRound();
  timer=setInterval(tick,100);
}

document.getElementById('startBtn').onclick=start;
document.getElementById('againBtn').onclick=start;
</script>
</body>
</html>`,
};

export const TEMPLATES: Template[] = [MATH_RACER, MEMORY_SEQUENCE, ODD_ONE_OUT, MATH_QUIZ, TRIVIA, BLANK];
export function getTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
