import {LAYER_ALPHA,spectrum,waveBox,waveShapes} from '../../desktop/wave-shapes.mjs';
import type {WavePath} from '../../desktop/wave-shapes.mjs';
export interface WaveSettings {enabled:boolean;type:'line'|'bars';style:'clean'|'glow';color:string;x:number;y:number;width:number;height:number}
export interface CaptionStyle {font:'Arial'|'Georgia'|'Times New Roman';size:number;color:string;x:number;y:number}
export const defaultWave:WaveSettings={enabled:true,type:'bars',style:'glow',color:'#f1cc7b',x:50,y:80,width:60,height:16};
export const defaultCaption:CaptionStyle={font:'Arial',size:4.3,color:'#ffffff',x:50,y:91};
export function waveBounds(w:WaveSettings,width:number,height:number){return waveBox(w,width,height);}
// Âm thanh mono của bài (trung bình các kênh) để tính phổ; tính một lần cho mỗi bản nhạc.
const monoCache=new WeakMap<AudioBuffer,Float32Array>();
function mono(audio:AudioBuffer){let cached=monoCache.get(audio);if(cached)return cached;cached=new Float32Array(audio.length);for(let c=0;c<audio.numberOfChannels;c++){const data=audio.getChannelData(c);for(let i=0;i<data.length;i++)cached[i]+=data[i]/audio.numberOfChannels;}monoCache.set(audio,cached);return cached;}
function trace(ctx:CanvasRenderingContext2D,paths:WavePath[]){ctx.beginPath();for(const path of paths){for(const step of path){if(step[0]==='b')ctx.bezierCurveTo(step[1],step[2],step[3],step[4],step[5],step[6]);else if(step[0]==='m')ctx.moveTo(step[1],step[2]);else ctx.lineTo(step[1],step[2]);}ctx.closePath();}}
// Cùng hình với bản xuất (desktop/wave-shapes.mjs): cột bo tròn đối xứng, đường nền, bóng phản chiếu, quầng sáng khi chọn "Ánh sáng mềm".
export function drawWave(ctx:CanvasRenderingContext2D,audio:AudioBuffer|null,time:number,w:WaveSettings){
 if(!w.enabled||!audio)return;const {width,height}=ctx.canvas,shapes=waveShapes(spectrum(mono(audio),audio.sampleRate,time),w,width,height);
 ctx.save();ctx.fillStyle=w.color;
 if(shapes.glow){ctx.globalAlpha=LAYER_ALPHA.glow;ctx.filter=`blur(${shapes.glow}px)`;trace(ctx,shapes.main);ctx.fill();ctx.filter='none';}
 ctx.globalAlpha=LAYER_ALPHA.reflection;trace(ctx,shapes.reflection);ctx.fill();
 ctx.globalAlpha=LAYER_ALPHA.baseline;trace(ctx,[shapes.baseline]);ctx.fill();
 ctx.globalAlpha=LAYER_ALPHA.main;trace(ctx,shapes.main);ctx.fill();
 ctx.restore();
}
export function drawCaption(ctx:CanvasRenderingContext2D,text:string,style:CaptionStyle){
 if(!text)return;ctx.save();const size=ctx.canvas.height*style.size/100;ctx.font=`${size}px "${style.font}"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=style.color;ctx.strokeStyle='#202020';ctx.lineWidth=Math.max(1,ctx.canvas.height*.004);ctx.lineJoin='round';const lines:string[]=[];let line='';for(const word of text.split(/\s+/)){const candidate=line?`${line} ${word}`:word;if(ctx.measureText(candidate).width>ctx.canvas.width*.84&&line){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);const x=ctx.canvas.width*style.x/100,y=ctx.canvas.height*style.y/100;lines.forEach((item,index)=>{const py=y+(index-(lines.length-1)/2)*size*1.25;ctx.strokeText(item,x,py);ctx.fillText(item,x,py);});ctx.restore();
}
