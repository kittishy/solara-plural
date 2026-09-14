"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface MemberColorPickerProps { value: string; onChange: (color: string) => void; }

const QUICK_PALETTE = ["#8B5CF6","#A855F7","#D946EF","#EC4899","#F43F5E","#EF4444","#F97316","#F59E0B","#EAB308","#84CC16","#22C55E","#10B981","#14B8A6","#06B6D4","#0EA5E9","#3B82F6","#6366F1","#64748B","#737373","#78716C"];

function hexToHsv(hex: string): [number, number, number] {
  const c=hex.replace("#",""); const r=parseInt(c.slice(0,2),16)/255,g=parseInt(c.slice(2,4),16)/255,b=parseInt(c.slice(4,6),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min; let h=0;
  if(d!==0){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}
  return [h,max===0?0:d/max,max];
}
function hsvToHex(h:number,s:number,v:number){const c=v*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=v-c;let r=0,g=0,b=0;if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];const f=(n:number)=>Math.round((n+m)*255).toString(16).padStart(2,"0");return `#${f(r)}${f(g)}${f(b)}`;}
function isValidHex(hex:string){return /^#[0-9A-Fa-f]{6}$/.test(hex);}

export function MemberColorPicker({value,onChange}:MemberColorPickerProps){
  const {t}=useLanguage(); const initial=isValidHex(value)?value:"#8B5CF6"; const [hex,setHex]=useState(initial); const [hexInput,setHexInput]=useState(initial); const svRef=useRef<HTMLDivElement>(null); const hueRef=useRef<HTMLDivElement>(null); const [h,s,v]=hexToHsv(hex);
  useEffect(()=>{if(isValidHex(value)&&value!==hex){setHex(value);setHexInput(value);}},[value]); // eslint-disable-line
  function commit(c:string){setHex(c);setHexInput(c);onChange(c);}
  function sv(e:React.PointerEvent<HTMLDivElement>){if(e.buttons!==1&&e.type!=="pointerdown")return;const el=svRef.current;if(!el)return;el.setPointerCapture(e.pointerId);const r=el.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));commit(hsvToHex(h,x,1-y));}
  function hue(e:React.PointerEvent<HTMLDivElement>){if(e.buttons!==1&&e.type!=="pointerdown")return;const el=hueRef.current;if(!el)return;el.setPointerCapture(e.pointerId);const r=el.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));commit(hsvToHex(x*360,s||1,v||1));}
  return <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-10 gap-1.5">{QUICK_PALETTE.map(c=><button key={c} type="button" onClick={()=>commit(c)} className={cn("aspect-square rounded-full ios-press ios-transition border-2",hex.toLowerCase()===c.toLowerCase()?"border-foreground scale-110":"border-transparent")} style={{background:c}} aria-label={`Cor ${c}`} />)}</div>
    <div ref={svRef} onPointerDown={sv} onPointerMove={sv} className="relative w-full h-24 sm:h-40 rounded-ios-sm cursor-crosshair overflow-hidden touch-none" style={{background:`linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h,1,1)})`}} role="slider" aria-label={t("members.colorSatBright")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s*100)}><div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{left:`${s*100}%`,top:`${(1-v)*100}%`,background:hex}} /></div>
    <div ref={hueRef} onPointerDown={hue} onPointerMove={hue} className="relative w-full h-3 sm:h-4 rounded-full cursor-pointer touch-none" style={{background:"linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"}} role="slider" aria-label={t("members.colorHue")} aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(h)}><div className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2 top-1/2" style={{left:`${(h/360)*100}%`,background:hsvToHex(h,1,1)}} /></div>
    <div className="flex items-center gap-2"><span className="text-caption-1 text-muted-foreground font-semibold">HEX</span><input type="text" value={hexInput} onChange={e=>{setHexInput(e.target.value);if(isValidHex(e.target.value))commit(e.target.value);}} className="min-w-0 flex-1 h-9 px-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-subheadline font-mono focus:outline-none focus:ring-2 focus:ring-ios-blue" /><input type="color" value={hex} onChange={e=>commit(e.target.value)} aria-label={t("members.color")} className="h-9 w-11 rounded-ios-sm bg-transparent cursor-pointer" /></div>
  </div>;
}
