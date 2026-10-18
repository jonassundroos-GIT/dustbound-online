'use strict';
/** DUSTBOUND v0.9.0: dependency-free authoritative online match server.
 * Run node server.js behind a hosting provider's HTTPS reverse proxy.
 * Rooms live in memory: a process restart cancels active games.
 */
const http = require('node:http');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const RULES = require('./rules.cjs');
const PORT = Number(process.env.PORT || 3000);
const MAX_CLIENTS = Number(process.env.MAX_CLIENTS || 300);
const MAX_FRAME_BYTES = 64 * 1024;
const ROOM_TTL_MS = 45 * 60 * 1000;
const HEARTBEAT_MS = 25000;
const serverStart = Date.now();
const rooms = new Map(), clients = new Set(), waiting = [];
const roomCode = () => crypto.randomBytes(9).toString('base64url');
const playerToken = () => crypto.randomBytes(24).toString('base64url');
const page = require('./ui-patch.cjs')(fs.readFileSync(path.join(__dirname, 'public', 'index.html')));
const gzPage = zlib.gzipSync(page, {level: 6});
function answer(res, status, headers, data) {res.writeHead(status, headers);res.end(data);}
const httpServer = http.createServer((req,res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method !== 'GET') return answer(res,405,{'content-type':'text/plain'},'Method not allowed');
  if (url.pathname === '/healthz') return answer(res,200,{'content-type':'application/json','cache-control':'no-store'},JSON.stringify({ok:true,version:'0.10.0',matches:[...rooms.values()].filter(r=>r.game).length,queue:waiting.filter(c=>c.alive&&c.queueing).length,uptimeSeconds:Math.floor((Date.now()-serverStart)/1000)}));
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const compressed = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    return answer(res,200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff','content-security-policy':"frame-ancestors 'none'",...(compressed?{'content-encoding':'gzip'}:{})},compressed?gzPage:page);
  }
  const assets={'/upgrade.css':['upgrade.css','text/css; charset=utf-8'],'/arena.webp':['arena.webp','image/webp'],'/beacon.webp':['beacon.webp','image/webp']};
  if(assets[url.pathname]){const [file,mime]=assets[url.pathname];return answer(res,200,{'content-type':mime,'cache-control':'no-cache'},fs.readFileSync(path.join(__dirname,'public',file)));}
  if (url.pathname === '/robots.txt')return answer(res,200,{'content-type':'text/plain'},'User-agent: *\nDisallow: /\n');
  return answer(res,404,{'content-type':'text/plain'},'Not found');
});
class Peer {
  constructor(sock) {
    this.sock=sock;this.alive=true;this.buffer=Buffer.alloc(0);this.partial=[];this.opcode=0;
    this.room=null;this.seat=-1;this.queueing=false;this.token=null;
    this.lastPong=Date.now();this.actions=[];sock.setNoDelay(true);
    sock.on('data',chunk=>this.onData(chunk));
    sock.on('close',()=>this.disconnect());sock.on('end',()=>this.disconnect());
    sock.on('error',()=>this.disconnect());clients.add(this);
  }
  frame(opcode, payload=Buffer.alloc(0)) {
    if (!this.alive || this.sock.destroyed) return;
    const head=payload.length<126?2:payload.length<65536?4:10;
    const b=Buffer.alloc(head);b[0]=0x80|opcode;
    if(head===2)b[1]=payload.length;
    else if(head===4){b[1]=126;b.writeUInt16BE(payload.length,2);}
    else{b[1]=127;b.writeBigUInt64BE(BigInt(payload.length),2);}
    this.sock.write(Buffer.concat([b,payload]));
  }
  send(value) {try{this.frame(1,Buffer.from(JSON.stringify(value),'utf8'));}catch(e){this.disconnect()}}
  error(message){this.send({type:'error',message});}
  onData(chunk) {
    if(!this.alive)return;
    this.buffer=Buffer.concat([this.buffer,chunk]);
    if(this.buffer.length>MAX_FRAME_BYTES+1024){this.disconnect();return;}
    while(this.buffer.length>=2){
      const b=this.buffer, fin=!!(b[0]&0x80),opcode=b[0]&15,masked=!!(b[1]&0x80);let length=b[1]&127,offset=2;
      if(length===126){if(b.length<4)return;length=b.readUInt16BE(2);offset=4;}
      if(length===127){if(b.length<10)return;let big=b.readBigUInt64BE(2);if(big>BigInt(MAX_FRAME_BYTES)){this.disconnect();return;}length=Number(big);offset=10;}
      if(!masked||length>MAX_FRAME_BYTES){this.disconnect();return;}
      if(b.length<offset+4+length)return;
      const key=b.subarray(offset,offset+4),data=Buffer.from(b.subarray(offset+4,offset+4+length));
      this.buffer=b.subarray(offset+4+length);
      for(let i=0;i<data.length;i++)data[i]^=key[i&3];
      if(opcode===8){this.disconnect();return;}
      if(opcode===9){this.frame(10,data);continue;}
      if(opcode===10){this.lastPong=Date.now();continue;}
      if(opcode===1||opcode===0){
        if(opcode===1){this.partial=[];this.opcode=1;}
        if(this.opcode!==1){this.disconnect();return;}
        this.partial.push(data);
        if(this.partial.reduce((n,x)=>n+x.length,0)>MAX_FRAME_BYTES){this.disconnect();return;}
        if(fin){this.opcode=0;const body=Buffer.concat(this.partial).toString('utf8');this.partial=[];let msg;try{msg=JSON.parse(body);}catch(e){this.error('Invalid message.');continue;}processMessage(this,msg);}
        continue;
      }
      this.disconnect();return;
    }
  }
  disconnect(){
    if(!this.alive)return;this.alive=false;this.queueing=false;clients.delete(this);
    try{this.sock.destroy()}catch(e){}
    const room=this.room;
    if(room){const seat=room.seats[this.seat];if(seat?.peer===this){seat.peer=null;room.lastActive=Date.now();const other=room.seats[1-this.seat]?.peer;if(other?.alive)other.send({type:'peer_status',connected:false,message:'Other player disconnected. Waiting for reconnection…'});}}
  }
}
function detach(client, tell=true) {
  client.queueing=false;
  if(client.room){const r=client.room,s=r.seats[client.seat];if(s?.peer===client)s.peer=null;const other=r.seats[1-client.seat]?.peer;
    if(other?.alive&&tell)other.send({type:'peer_status',connected:false,message:'Other player left the match.'});
    client.room=null;client.seat=-1;r.lastActive=Date.now();
    if(!r.game && r.seats.every(x=>!x?.peer))rooms.delete(r.id);
  }
}
function newRoom(id,privateMatch){const r={id,privateMatch,game:null,seats:[null,null],lastActive:Date.now(),votes:new Set()};rooms.set(id,r);return r;}
function seatClient(room,client,index){
  if(client.room)detach(client);
  client.queueing=false;room.seats[index]={token:playerToken(),peer:client};client.room=room;client.seat=index;client.token=room.seats[index].token;room.lastActive=Date.now();
  client.send({type:'seat',seat:index+1,token:client.token,roomId:room.id,privateMatch:room.privateMatch});
}
function sendProjected(room){
  if(!room.game)return;
  room.lastActive=Date.now();
  for(let i=0;i<2;i++){const c=room.seats[i]?.peer;
    if(c?.alive)c.send({type:'state',data:RULES.project(room.game,i+1),connected:!!room.seats[1-i]?.peer?.alive});
  }
}
function begin(room){
  if(!room.seats.every(s=>s?.peer?.alive))return;
  room.game=RULES.newGame();room.votes.clear();
  for(let i=0;i<2;i++)room.seats[i].peer.send({type:'match_found',seat:i+1,privateMatch:room.privateMatch});
  sendProjected(room);
}
function joinQuick(c){
  detach(c);while(waiting.length){const other=waiting.shift();if(!other?.alive||!other.queueing||other===c)continue;
    const room=newRoom(roomCode(),false);seatClient(room,other,0);seatClient(room,c,1);begin(room);return;}
  c.queueing=true;waiting.push(c);c.send({type:'queued',message:'Searching for another player… Leave this tab open.'});
}
function joinPrivate(c,roomId){
  if(typeof roomId!=='string'||!/^[-_a-zA-Z0-9]{10,40}$/.test(roomId)){c.error('Invalid private link.');return;}
  let room=rooms.get(roomId);
  if(!room)room=newRoom(roomId,true);
  if(!room.privateMatch){c.error('This match is not private.');return;}
  if(room.game){c.error('This private game has already started. Ask for a new link.');return;}
  const slot=room.seats.findIndex(x=>!x);
  if(slot<0){c.error('This room is full.');return;}
  seatClient(room,c,slot);
  if(slot===0)c.send({type:'queued',message:'Private room created. Share the link to invite your friend.'});
  if(room.seats.every(s=>s?.peer?.alive))begin(room);
}
function resume(c,token){
  if(typeof token!=='string'||!/^[-_a-zA-Z0-9]{20,100}$/.test(token)){c.error('Invalid reconnect token.');return;}
  for(const room of rooms.values())for(let i=0;i<2;i++)if(room.seats[i]?.token===token){
    if(c.room)detach(c);
    const previous=room.seats[i].peer;if(previous?.alive&&previous!==c)previous.disconnect();
    room.seats[i].peer=c;c.room=room;c.seat=i;c.token=token;c.queueing=false;room.lastActive=Date.now();
    c.send({type:'seat',seat:i+1,token,roomId:room.id,privateMatch:room.privateMatch,reconnected:true});
    if(room.game){c.send({type:'match_found',seat:i+1,privateMatch:room.privateMatch,reconnected:true});sendProjected(room);}
    else c.send({type:'queued',message:'Waiting for your opponent…'});
    const opponent=room.seats[1-i]?.peer;if(opponent?.alive)opponent.send({type:'peer_status',connected:true,message:'Your opponent reconnected.'});
    return;
  }
  c.send({type:'resume_failed'});
}
function processMessage(c,m){
  if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.type!=='string')return c.error('Invalid request.');
  if(m.type==='ping')return c.send({type:'pong'});
  if(m.type==='resume')return resume(c,m.token);
  if(m.type==='queue')return joinQuick(c);
  if(m.type==='private')return joinPrivate(c,m.room);
  if(m.type==='cancel'){detach(c);return c.send({type:'cancelled'});}
  if(m.type==='leave'){detach(c);return c.send({type:'left'});}
  const room=c.room;
  if(!room||!room.game)return c.error('No active match.');
  if(!room.seats[1-c.seat]?.peer?.alive)return c.error('Opponent disconnected. Wait for reconnection.');
  if(m.type==='rematch'){
    if(!room.game.winner)return c.error('Finish this match before requesting a rematch.');
    room.votes.add(c.seat);c.send({type:'rematch_wait',message:'Waiting for your opponent to accept the rematch…'});
    if(room.votes.size===2)begin(room);
    else room.seats[1-c.seat]?.peer?.send({type:'rematch_offer'});
    return;
  }
  if(m.type!=='action')return c.error('Unknown request.');
  const now=Date.now();c.actions=c.actions.filter(x=>now-x<1000);if(c.actions.length>=12)return c.error('Too many actions.');c.actions.push(now);
  const action=m.data;
  if(!action||typeof action!=='object'||Array.isArray(action)||typeof action.type!=='string'||JSON.stringify(action).length>2048)return c.error('Invalid action.');
  try{const result=RULES.apply(room.game,c.seat+1,action);if(!result.ok){c.error(result.error||'Action rejected.');return;}sendProjected(room);}
  catch(e){console.error('Action failed:',e);c.error('Action could not be completed.');}
}
httpServer.on('upgrade',(req,socket,head)=>{
  let url;try{url=new URL(req.url||'/', 'http://localhost')}catch(e){socket.destroy();return;}
  if(url.pathname!=='/ws'||clients.size>=MAX_CLIENTS){socket.destroy();return;}
  const origin=req.headers.origin;
  if(origin){try{if(new URL(origin).host!==req.headers.host){socket.destroy();return;}}catch(e){socket.destroy();return;}}
  if(req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||typeof req.headers['sec-websocket-key']!=='string'){socket.destroy();return;}
  const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  const peer=new Peer(socket);if(head?.length)peer.onData(head);
  peer.send({type:'connected',version:'0.10.0'});
});
setInterval(()=>{
  const now=Date.now();for(const c of clients){if(now-c.lastPong>HEARTBEAT_MS*3){c.disconnect();continue;}c.frame(9,Buffer.from('hi'));}
  for(const [id,room] of rooms){if(now-room.lastActive>ROOM_TTL_MS && room.seats.every(s=>!s?.peer?.alive)){rooms.delete(id);}}
  for(let i=waiting.length-1;i>=0;i--)if(!waiting[i].alive||!waiting[i].queueing)waiting.splice(i,1);
},HEARTBEAT_MS).unref();
httpServer.listen(PORT,'0.0.0.0',()=>console.log('DUSTBOUND Online on http://localhost:'+PORT));
module.exports={httpServer,rooms,clients,RULES};
