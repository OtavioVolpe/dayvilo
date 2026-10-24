const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const branches=[],tips=[];
function branch(x,y,length,angle,depth,seed){
 const ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;
 const item={x,y,ex,ey,cx:x+(ex-x)*.34+2,cy:y+(ey-y)*.56,angle,width:Math.max(1.5,depth*2.9),depth,seed,start:depth>=2?0:depth===1?3:9,end:depth>=2?0:depth===1?8:14};branches.push(item);
 if(depth>0){branch(ex,ey,length*(.69+(seed%3)*.015),angle-.47-(seed%2)*.08,depth-1,seed*2+1);branch(ex,ey,length*.73,angle+.48+(seed%3)*.04,depth-1,seed*2+2);}
 else tips.push(item);
}
branch(300,325,76,-Math.PI/2,4,1);
tips.sort((a,b)=>(a.seed*17%31)-(b.seed*17%31));
function point(b,t){const u=1-t;return {x:u*u*b.x+2*u*t*b.cx+t*t*b.ex,y:u*u*b.y+2*u*t*b.cy+t*t*b.ey};}
function branchAge(b,value){return b.end===0?1:clamp((value-b.start)/(b.end-b.start),0,1);}
const anchors=branches.filter(b=>b.depth<=2).sort((a,b)=>b.depth-a.depth||(a.seed*17%31)-(b.seed*17%31));
function leafAge(b,i,k,value){return clamp((value-Math.max(b.end+.2,b.depth===2?.2+i*.3:b.depth===1?8.2+(i-4)*.14:14.2+(i-12)*.16)-k*.7)/1.5,0,1);}
function leaf(ctx,x,y,angle,size,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(size*.2,-size*.7,size*1.1,-size*.6,size*1.35,0);ctx.bezierCurveTo(size*.9,size*.65,size*.25,size*.5,0,0);ctx.fill();ctx.strokeStyle='rgba(240,255,221,.22)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(size*1.12,0);ctx.stroke();ctx.restore();}
export function desenharArvore(canvas, valor){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const value=clamp(valor,0,30);
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=window.devicePixelRatio||1;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const scale=Math.min(w/600,h/370);ctx.translate(w/2-300*scale,h-350*scale);ctx.scale(scale,scale);
 const halo=ctx.createRadialGradient(300,190,5,300,190,190);halo.addColorStop(0,'rgba(118,173,104,.12)');halo.addColorStop(1,'rgba(118,173,104,0)');ctx.fillStyle=halo;ctx.fillRect(75,-15,450,350);
 ctx.fillStyle='rgba(126,164,100,.13)';ctx.beginPath();ctx.ellipse(300,332,105,15,0,0,Math.PI*2);ctx.fill();
 const growth=.72+.28*clamp(value/20,0,1);ctx.translate(300,325);ctx.scale(growth,growth);ctx.translate(-300,-325);
 branches.forEach(b=>{const age=branchAge(b,value);if(age<=0)return;const p=point(b,age);ctx.strokeStyle=b.depth>2?'#95785a':'#a38a65';ctx.lineWidth=b.width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.quadraticCurveTo(b.x+(b.cx-b.x)*age,b.y+(b.cy-b.y)*age,p.x,p.y);ctx.stroke();});
 // Every leaf is anchored to an exact point on a fully grown branch.
 anchors.forEach((b,i)=>{for(let k=0;k<5;k++){
   const age=leafAge(b,i,k,value);if(!age)continue;
   const t=.4+k*.14,p=point(b,t),tangent=Math.atan2((1-t)*(b.cy-b.y)+t*(b.ey-b.cy),(1-t)*(b.cx-b.x)+t*(b.ex-b.cx));
   const a=tangent+(k%2?1:-1)*.88,stem=5*age,lx=p.x+Math.cos(a)*stem,ly=p.y+Math.sin(a)*stem;
   ctx.strokeStyle='#73976b';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(lx,ly);ctx.stroke();
   leaf(ctx,lx,ly,a,(13+(b.seed%4)*2)*age,['#71a677','#91bc7a','#b0ca86','#558d68','#81af6e'][k]);
 }});
 tips.forEach((p,i)=>{const age=clamp((value-20-i*.5)/1.5,0,1);if(!age)return;ctx.strokeStyle='#73976b';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(p.ex,p.ey);ctx.lineTo(p.ex,p.ey-9*age);ctx.stroke();ctx.save();ctx.translate(p.ex,p.ey-9*age);ctx.scale(age,age);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ctx.fillStyle=i%2?'#e7be9d':'#e9d8b0';ctx.beginPath();ctx.ellipse(Math.cos(a)*5,Math.sin(a)*5,4.5,3.6,a,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#bc8e4c';ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.fill();ctx.restore();});
 ctx.strokeStyle='#95785a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(300,319);ctx.quadraticCurveTo(291,330,278,332);ctx.moveTo(300,319);ctx.quadraticCurveTo(311,330,322,330);ctx.stroke();
}
