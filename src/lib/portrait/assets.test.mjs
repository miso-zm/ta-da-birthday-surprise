import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';

for(const [template,name] of [['balloon','background'],['balloon','cake'],['balloon','gift-star'],['blue','background'],['blue','star'],['blue','cake'],['blue','gift'],['blue','sparkles'],['blue','confetti']])test(`${template}/${name}: real transparent PNG with clear padding and opaque artwork`,async()=>{
  const file=fileURLToPath(new URL(`../../../public/assets/portrait/${template}/${name}-v1.png`,import.meta.url));
  const m=await sharp(file).metadata();
  assert.equal(m.format,'png');assert.equal(m.hasAlpha,true);
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let transparent=0,opaque=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;if(a===255)opaque++;
    if(x<4||y<4||x>=info.width-4||y>=info.height-4)assert.equal(a,0);
  }
  assert.ok(transparent>info.width*info.height*.1);assert.ok(opaque>info.width*info.height*.1);
});
