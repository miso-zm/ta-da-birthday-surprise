// Atlas-specific local extraction, NOT a general photo background remover.
// The generated checkerboard is neutral grey; artwork is coloured or warm white.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Usage: node extract-balloon-assets.mjs input.png output-directory');
const pieces = [
  ['background', { left: 0, top: 0, width: 690, height: 680 }],
  ['cake', { left: 750, top: 140, width: 430, height: 490 }],
  ['gift-star', { left: 110, top: 760, width: 500, height: 420 }],
];
const metadata = await sharp(input).metadata();
if (metadata.width !== 1254 || metadata.height !== 1254) throw Error('Coordinates require the approved 1254px atlas');
await mkdir(output, {recursive:true});
for (const [name, bounds] of pieces) {
  const {data,info} = await sharp(input).extract(bounds).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info,n=w*h;
  const mask=new Uint8Array(n),seen=new Uint8Array(n),queue=new Int32Array(n);
  for(let i=0;i<n;i++){
    const r=data[i*3],g=data[i*3+1],b=data[i*3+2];
    const lo=Math.min(r,g,b),hi=Math.max(r,g,b);
    mask[i]=hi-lo>=14 || lo>=242 ? 255:0;
  }
  // Do not fill enclosed holes: the gaps between candles contain checker too.
  let head=0,tail=0;
  // Repair only tiny enclosed neutral strokes inside artwork, not large gaps.
  for(let start=0;start<n;start++){
    if(mask[start]||seen[start])continue;
    head=0;tail=0;queue[tail++]=start;seen[start]=1;let edge=false;
    const add=i=>{if(!mask[i]&&!seen[i]){seen[i]=1;queue[tail++]=i}};
    while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(x===0||y===0||x===w-1||y===h-1)edge=true;if(x>0)add(i-1);if(x<w-1)add(i+1);if(y>0)add(i-w);if(y<h-1)add(i+w)}
    if(!edge&&tail<80)for(let j=0;j<tail;j++)mask[queue[j]]=255;
  }
  // Discard disconnected background flecks; retain the designed confetti pieces.
  seen.fill(0);
  for(let start=0;start<n;start++){
    if(!mask[start]||seen[start])continue;
    head=0;tail=0;queue[tail++]=start;seen[start]=1;
    const add=i=>{if(mask[i]&&!seen[i]){seen[i]=1;queue[tail++]=i}};
    while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(x>0)add(i-1);if(x<w-1)add(i+1);if(y>0)add(i-w);if(y<h-1)add(i+w)}
    if(tail<120)for(let j=0;j<tail;j++)mask[queue[j]]=0;
  }
  // Subpixel smoothing of the binary contour, without changing artwork RGB.
  const alpha=await sharp(mask,{raw:{width:w,height:h,channels:1}}).blur(0.4).toColourspace('b-w').raw().toBuffer();
  if(alpha.length!==n)throw Error('Unexpected mask channels');
  const rgba=Buffer.alloc(n*4);
  for(let i=0;i<n;i++){rgba[i*4]=alpha[i]?data[i*3]:0;rgba[i*4+1]=alpha[i]?data[i*3+1]:0;rgba[i*4+2]=alpha[i]?data[i*3+2]:0;rgba[i*4+3]=alpha[i]}
  const target=path.join(output,`${name}-v1.png`);
  await sharp(rgba,{raw:{width:w,height:h,channels:4}}).trim({background:'#00000000',threshold:1}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png().toFile(target);
  const m=await sharp(target).metadata();const s=await sharp(target).stats();
  console.log(JSON.stringify({target,width:m.width,height:m.height,alpha:m.hasAlpha,min:s.channels[3].min,max:s.channels[3].max}));
}
