// ─── State ────────────────────────────────────────────────────────────────────
let nostalgistInstance = null;
let tiktokSocket = null;
let giftCount = 0;
let ttsEnabled = true;
let ttsCfg = { gifts: true, chat: false, likes: true, keywords: true };
let _chatTtsLast = 0;
let emuReady = false;
let USER_PRESETS = {};

// Banner state — BANNER_CUSTOM_IMAGE is null or base64; asset path is derived per preset
let BANNER_CUSTOM_IMAGE = null;
let BANNER_HEIGHT = 80;

const ZERODY_URL = 'https://tiktok-chat-reader.zerody.one';

// Default preset banner assets (put PNGs in assets/ folder; missing files are ignored gracefully)
const PRESET_BANNER_ASSETS = {
  generic: 'assets/generic.png',
  mario:   'assets/smb3.png',
};

// ─── Gift → Key mapping ───────────────────────────────────────────────────────
// ─── Key aliases (user-friendly → RetroArch key) ─────────────────────────────
const KEY_ALIAS = {
  B:'z', Y:'a', A:'x', X:'s', L:'q', R:'w',
  START:'Enter', SELECT:'Shift',
  UP:'ArrowUp', DOWN:'ArrowDown', LEFT:'ArrowLeft', RIGHT:'ArrowRight',
};
const KEY_ALIAS_REV = Object.fromEntries(Object.entries(KEY_ALIAS).map(([k,v])=>[v,k]));

function parseSeq(str) {
  if (!str || !str.trim()) return [];
  return str.trim().split(/\s+/).map(part => {
    const [k, h='150', p='180'] = part.split(':');
    const key = KEY_ALIAS[k.toUpperCase()] ?? k.toLowerCase();
    return [key, parseInt(h)||150, parseInt(p)||180];
  });
}

function seqToStr(seq) {
  if (!seq || !seq.length) return '';
  return seq.map(([key, h=150, p=180]) => {
    const alias = KEY_ALIAS_REV[key] || key.toUpperCase();
    return `${alias}:${h}${p!==180?':'+p:''}`;
  }).join(' ');
}

// ─── Presets ─────────────────────────────────────────────────────────────────
const PRESETS = {
  generic: {
    label: 'Genérico',
    powerups: [],
    map: {
      donut:   {seq:[], label:'🍩 Despluga',   tts:'Desplugar controle!', special:'unplug', unplugMs:5000},
      capybara:    {seq:[['Enter',500]],              label:'Start!',     tts:'Aperta start!'},

      tinydiny: {seq:[['Shift',150]],                      label:'Select!',     tts:'Aperta select!'},
      "Tiny Diny": {seq:[['Shift',150]],                      label:'Select!',     tts:'Aperta select!'},

      "Furious Fire": {seq:[['z',150],['x',150],['a',150],['s',150],['z',150]],                      label:'Aperta botões!',     tts:'Aperta botões!'},
      furiousfire: {seq:[['z',150],['x',150],['a',150],['s',150],['z',150]],                      label:'Aperta botões!',     tts:'Aperta botões!'},

      "Go Popular": {seq:[], label:'Slow Mo!', tts:'Slow motion por 5 segundos!', special:'slowmo', slowmoMs:5000},
      gopopular: {seq:[], label:'Slow Mo!', tts:'Slow motion por 5 segundos!', special:'slowmo', slowmoMs:5000},

      "Game Controller": {seq:[], label:'Fast 2X!', tts:'Fast forward por 5 segundos!', special:'fastmo', fastmoMs:5000},
      gamecontroller: {seq:[], label:'Fast 2X!', tts:'Fast forward por 5 segundos!', special:'fastmo', fastmoMs:5000},

      "Energy Capsule": {seq:[], label:'Mirror!', tts:'Espelhar controles', special:'mirror', mirrorMs:5000},
      energycapsule: {seq:[], label:'Mirror!', tts:'Espelhar controles', special:'mirror', mirrorMs:5000},

      galaxy: {seq:[], label:'🔄 RESET!',   tts:'RESET! Jogo reiniciado!',     special:'reset'},

      whistle: {seq:[], label:'⏪ Rewind!',   tts:'Rewind! Voltando no tempo!', special:'rewind',  rewindMs:5000},

      guitar: { seq:[], label:'Desliga a tela!', tts:'Tela desligada por 5 segundos!', special:'blackout', blackoutMs:5000 },

      "Hat and Mustache": {seq:[], label:'💦 SPLASH!',   tts:'Splash! Tela molhada por 5 segundos!', special:'splash', splashMs:5000},
      hatandmustache: {seq:[], label:'💦 SPLASH!',   tts:'Splash! Tela molhada por 5 segundos!', special:'splash', splashMs:5000},
    },
    powerups: []
  },
  mario: {
    label: 'Super Mario Bros 3 - All-Stars+World',
    map: {
      rose:       {seq:[], special:'powerup', powerupIdx:0,                                      label:'🌹 Cogumelo!', tts:'Rosa! Super Mushroom!'},
      flor:       {seq:[], special:'powerup', powerupIdx:0,                                      label:'🌸 Cogumelo!', tts:'Flor! Super Mushroom!'},
      rosa:       {seq:[], special:'powerup', powerupIdx:0,                                      label:'🌹 Cogumelo!', tts:'Rosa! Super Mushroom!'},
      gg:         {seq:[], label:'🐢 Slow Mo!', tts:'Slow motion por 5 segundos!', special:'slowmo', slowmoMs:5000},
      tiktoklogo: {seq:[], label:'⏪ Rewind!',   tts:'Rewind! Voltando no tempo!', special:'rewind',  rewindMs:2500},
      gamepad:    {seq:[], special:'powerup', powerupIdx:3,                                      label:'⭐ Estrela!',  tts:'Estrela invencível!'},
      donut:      {seq:[], special:'powerup', powerupIdx:4,                                      label:'🍩 Flauta!',   tts:'Donut! Flauta no inventário!'},


      fingerheart: {seq:[], special:'powerup', powerupIdx:1,                                      label:'Flor!',   tts:'Flor de fogo!'},
      boladefutebol: {seq:[], special:'powerup', powerupIdx:2,                                      label:'⚽ Racoon!',   tts:'Folhinha! Rabo de guaxinim!'},
      spinningsoccer: {seq:[], special:'powerup', powerupIdx:2,                                      label:'⚽ Racoon!',   tts:'Folhinha! Rabo de guaxinim!'},
      football: {seq:[], special:'powerup', powerupIdx:2,                                      label:'⚽ Racoon!',   tts:'Folhinha! Rabo de guaxinim!'},

      silvercrest: {seq:[['ArrowDown',1500]], label:'Agacha!',     tts:'Agacha agora!'},
      badge: {seq:[['ArrowDown',1500]], label:'Agacha!',     tts:'Agacha agora!'},
      "A Shard of Hope": {seq:[['ArrowDown',1500]], label:'Agacha!',     tts:'Agacha agora!'},


      coconut:       {seq:[], special:'powerup', powerupIdx:5,                                      label:'🐸 Rã!',   tts:'Frog!!'},
      tropicalisland:       {seq:[], special:'powerup', powerupIdx:5,                                      label:'🐸 Rã!',   tts:'Frog!!'},

      toucan:    {seq:[], special:'powerup', powerupIdx:6,                                      label:'🦘 Tanooki!',   tts:'Tanooki!!'},

      hanginglights:     {seq:[], special:'powerup', powerupIdx:7,                                      label:'🔨 Martelo!',   tts:'Martelo!!'},
      "Hanging Lights":     {seq:[], special:'powerup', powerupIdx:7,                                      label:'🔨 Martelo!',   tts:'Martelo!!'},
      "luminarias suspensas":     {seq:[], special:'powerup', powerupIdx:7,                                      label:'🔨 Martelo!',   tts:'Martelo!!'},
      luminariassuspensas:     {seq:[], special:'powerup', powerupIdx:7,                                      label:'🔨 Martelo!',   tts:'Martelo!!'},
      "earrings":    {seq:[], special:'powerup', powerupIdx:7,                                      label:'🔨 Martelo!',   tts:'Martelo!!'},

      "You're awesome": {seq:[['ArrowRight',1500,0],['z',1500,1000]],label:'Pule pra frente!', tts:'Pule pra frente!'},
      "hamster": {seq:[['ArrowRight',1500,0],['z',1500,0]],label:'Pule pra frente!', tts:'Pule pra frente!'},

      "Money Gun": {seq:[], label:'🔄 RESET!',   tts:'RESET! Jogo reiniciado!',     special:'reset'},
      moneygun: {seq:[], label:'🔄 RESET!',   tts:'RESET! Jogo reiniciado!',     special:'reset'},
      "Pistola de Dinheiro": {seq:[], label:'🔄 RESET!',   tts:'RESET! Jogo reiniciado!',     special:'reset'},
      pistoladedinheiro: {seq:[], label:'🔄 RESET!',   tts:'RESET! Jogo reiniciado!',     special:'reset'},
      "TikTok Ticket": {seq:[], label:'🔄 RESET!',   tts:'RESET! Jogo reiniciado!',     special:'reset'},
      tiktokticket: {seq:[], label:'🔄 RESET!',   tts:'RESET! Jogo reiniciado!',     special:'reset'},

      rocket:     {seq:[['Enter',150]],                                                             label:'🚀 PAUSOU!',  tts:'Foguete! Jogo pausado!'},
      foguete:    {seq:[['Enter',150]],                                                             label:'🚀 PAUSOU!',  tts:'Foguete! Jogo pausado!'},
      universe:   {seq:[], label:'⏪ Rewind!',   tts:'Rewind! Voltando no tempo!', special:'rewind',  rewindMs:60* 1000},
    },
    // Endereços para Super Mario All-Stars (SMB1) — verifique a região do seu dump
    // https://www.gamefaqs.com/snes/563495-super-mario-all-stars/cheats
    powerups: [
      { name: 'Super Mushroom', code: '7E0578:02', label: '🍄 Super!',  tts: 'Super Mushroom!' },
      { name: 'Fire Flower',    code: '7E0578:03', label: '🔥 Fire!',   tts: 'Fire Flower!' },
      { name: 'Racoon',        code: '7E0578:04', label: 'Racoon!',   tts: 'Estrela! Invencível!' },
      { name: 'Star',        code: '7E0428:01', label: '⭐ Estrela!',   tts: 'Estrela! Invencível!' },
      { name: 'Flauta',        code: '7E1D80:0C', label: 'Flauta!',   tts: 'Flauta! No inventário!' },
      { name: 'Frog',        code: '7E0578:05', label: 'Frog!',   tts: 'Frog!' },
      { name: 'Tanooki',        code: '7E0578:06', label: 'Tanooki!',   tts: 'Tanooki!' },
      { name: 'Hammer',        code: '7E0578:07', label: 'Hammer!',   tts: 'Hammer!' },

    ],
  }
};

let currentPreset = 'generic';
let GIFT_MAP = deepCopyPreset('generic');

// ─── Power-ups via RetroArch cheat system ────────────────────────────────────
// Populado por applyPreset() a partir de PRESETS[name].powerups.
// Endereços variam por ROM e região — encontre os seus em:
// https://www.gamefaqs.com/snes/563495-super-mario-all-stars/cheats
let POWERUPS = JSON.parse(JSON.stringify(PRESETS.generic.powerups));

async function diagnosePowerup() {
  if (!emuReady || !nostalgistInstance) {
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">Diagnóstico: emulador não está rodando</span>`);
    return;
  }
  addLog('sys', `<span class="ts">${ts()}</span> === DIAGNÓSTICO POWER-UP ===`);
  try {
    const Module = nostalgistInstance.getEmscriptenModule();
    addLog('sys', `<span class="ts">${ts()}</span> Module ok: <b>${!!Module}</b>`);
    addLog('sys', `<span class="ts">${ts()}</span> HEAPU8 ok: <b>${!!(Module && Module.HEAPU8)}</b>`);
    addLog('sys', `<span class="ts">${ts()}</span> _retro_get_memory_data: <b>${typeof Module._retro_get_memory_data}</b>`);
    addLog('sys', `<span class="ts">${ts()}</span> _retro_get_memory_size: <b>${typeof Module._retro_get_memory_size}</b>`);
    addLog('sys', `<span class="ts">${ts()}</span> _retro_cheat_set: <b>${typeof Module._retro_cheat_set}</b>`);

    // Salva estado e analisa o binário
    const { state } = await nostalgistInstance.saveState();
    const rawBuf = new Uint8Array(await state.arrayBuffer());
    addLog('sys', `<span class="ts">${ts()}</span> Save state raw: <b>${rawBuf.length} bytes</b>`);
    const buf = await maybeDecompressRzip(rawBuf);
    if (buf.length !== rawBuf.length) {
      addLog('sys', `<span class="ts">${ts()}</span> RZIP descomprimido: <b>${buf.length} bytes</b>`);
    }

    // Mostra os primeiros 64 bytes como ASCII + hex
    const head = Array.from(buf.slice(0, 64)).map(b =>
      b >= 0x20 && b < 0x7F ? String.fromCharCode(b) : '·'
    ).join('');
    addLog('sys', `<span class="ts">${ts()}</span> Header ASCII: <code>${esc(head)}</code>`);

    // Busca "RAM:NNNNNN:" (snes9x inner), "RAM ", "WRAM" no buffer completo
    const hits = [];
    for (let i = 0; i < buf.length - 11 && hits.length < 5; i++) {
      // "RAM:" padrão snes9x interno
      if (buf[i]===0x52&&buf[i+1]===0x41&&buf[i+2]===0x4D&&buf[i+3]===0x3A) {
        let sizeStr = '';
        for (let k=4;k<10;k++) {
          const c=buf[i+k];
          if(!((c>=0x30&&c<=0x39)||(c>=0x61&&c<=0x66)||(c>=0x41&&c<=0x46))){sizeStr='';break;}
          sizeStr+=String.fromCharCode(c);
        }
        if (sizeStr.length===6 && buf[i+10]===0x3A) {
          hits.push(`"RAM:${sizeStr}:" @ offset ${i} (${parseInt(sizeStr,10)} bytes)`);
        }
      }
      // "RAM " binário
      if (buf[i]===0x52&&buf[i+1]===0x41&&buf[i+2]===0x4D&&buf[i+3]===0x20) {
        const sz=buf[i+4]|(buf[i+5]<<8)|(buf[i+6]<<16)|(buf[i+7]<<24);
        if (sz>=0x10000&&sz<=0x40000) hits.push(`"RAM " binário @ offset ${i} (sz=${sz})`);
      }
      // "WRAM" binário
      if (buf[i]===0x57&&buf[i+1]===0x52&&buf[i+2]===0x41&&buf[i+3]===0x4D) {
        const sz=buf[i+4]|(buf[i+5]<<8)|(buf[i+6]<<16)|(buf[i+7]<<24);
        hits.push(`"WRAM" @ offset ${i} (uint32=${sz})`);
      }
    }
    if (hits.length) {
      hits.forEach(h => addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--green)">✓ ${esc(h)}</span>`));
    } else {
      addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">❌ Nenhum bloco RAM encontrado no buffer completo</span>`);
    }

    // Mostra todos os blocos no formato "NAME:SIZE\n"
    const decoder = new TextDecoder('ascii');
    const text = decoder.decode(buf.slice(0, Math.min(buf.length, 4000)));
    const blocks = [...text.matchAll(/([A-Z0-9_]{2,10}):(\d{1,7})\n/g)];
    if (blocks.length) {
      addLog('sys', `<span class="ts">${ts()}</span> Blocos detectados (NAME:SIZE): ${blocks.slice(0,15).map(m=>m[1]+':'+m[2]).join(', ')}`);
    } else {
      addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--yellow)">Nenhum bloco NAME:SIZE — formato binário puro</span>`);
    }

    // Varre blocos binários [4-char tag][uint32 LE size] nos primeiros 200KB
    const binTags = [];
    const scanBin = buf.slice(0, Math.min(buf.length, 200000));
    for (let i = 0; i <= scanBin.length - 8; i++) {
      const isAscii = (b) => b >= 0x20 && b < 0x7F;
      if (!isAscii(scanBin[i])||!isAscii(scanBin[i+1])||!isAscii(scanBin[i+2])||!isAscii(scanBin[i+3])) continue;
      const tag  = String.fromCharCode(scanBin[i],scanBin[i+1],scanBin[i+2],scanBin[i+3]);
      const sz   = scanBin[i+4]|(scanBin[i+5]<<8)|(scanBin[i+6]<<16)|(scanBin[i+7]<<24);
      if (sz >= 4 && sz <= 0x100000 && i + 8 + sz <= buf.length) {
        binTags.push(`${JSON.stringify(tag)}@${i}:${sz}`);
        i += 8 + sz - 1; // pula o bloco
      }
      if (binTags.length >= 20) break;
    }
    if (binTags.length) {
      addLog('sys', `<span class="ts">${ts()}</span> Blocos binários [tag:sz]: ${binTags.slice(0,12).join(', ')}`);
    }
    addLog('sys', `<span class="ts">${ts()}</span> === FIM — veja o console para mais detalhes ===`);
    console.log('[diagnosePowerup] primeiros 512 bytes:', buf.slice(0, 512));
  } catch(e) {
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">Erro: ${esc(e.message)}</span>`);
    console.error('[diagnosePowerup]', e);
  }
}

function buildRetroarchConfig() {
  return {
    rewind_enable: true,
    rewind_granularity: 2,
    rewind_buffer_size_mb: 64,
    input_rewind: 'r',
    input_hold_slowmotion: 'e',
    input_hold_fast_forward: 'l',
    fastforward_ratio: 2.0,
    // Desativa compressão RZIP nos save states para facilitar o patch direto
    savestate_file_compression: false,
  };
}

// ─── RZIP decompressor ───────────────────────────────────────────────────────
// RetroArch comprime save states com RZIP (#RZIPv magic).
// Formato: 7-byte header + chunks de [uint32 uncompSz][uint32 compSz][zlib data]
async function maybeDecompressRzip(buf) {
  const magic = String.fromCharCode(buf[0],buf[1],buf[2],buf[3],buf[4],buf[5]);
  if (magic !== '#RZIPv') return buf; // não comprimido, retorna como está

  let offset = 7; // pula "#RZIPv" + version byte
  const chunks = [];

  while (offset + 8 <= buf.length) {
    const uncompSz = buf[offset]|(buf[offset+1]<<8)|(buf[offset+2]<<16)|(buf[offset+3]<<24);
    const compSz   = buf[offset+4]|(buf[offset+5]<<8)|(buf[offset+6]<<16)|(buf[offset+7]<<24);
    offset += 8;
    if (compSz <= 0 || compSz > buf.length - offset || uncompSz <= 0) break;

    const compData = buf.slice(offset, offset + compSz);
    offset += compSz;

    // Tenta descomprimir com zlib ('deflate') e raw deflate como fallback
    let ok = false;
    for (const fmt of ['deflate', 'deflate-raw']) {
      try {
        const ds = new DecompressionStream(fmt);
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        writer.write(compData);
        writer.close();
        const parts = []; let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value); total += value.length;
        }
        const out = new Uint8Array(total);
        let p = 0; for (const c of parts) { out.set(c, p); p += c.length; }
        chunks.push(out);
        ok = true; break;
      } catch(_) {}
    }
    if (!ok) throw new Error(`RZIP: falha ao descomprimir chunk no offset ${offset}`);
  }

  const total = chunks.reduce((a,c) => a+c.length, 0);
  const out   = new Uint8Array(total);
  let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

// ─── Power-up via escrita direta na RAM do SNES ──────────────────────────────
// Nostalgist expõe getEmscriptenModule() → Module do Emscripten.
// O libretro de snes9x exporta _retro_get_memory_data(0) que retorna um
// ponteiro para a Work RAM do SNES (128KB, endereços 0x7E0000–0x7FFFFF).
// Escrevemos diretamente em Module.HEAPU8[ptr + wramOffset] — instantâneo,
// sem save/load state, sem interromper o jogo.
async function applyPowerup(index, username) {
  if (!emuReady || !nostalgistInstance) {
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">Power-up: emulador não está rodando</span>`);
    return;
  }
  const pu = POWERUPS[index];
  if (!pu) { addLog('sys', `<span class="ts">${ts()}</span> Power-up #${index} não configurado`); return; }

  const [addrHex, valHex] = pu.code.replace(/\s/g,'').split(':');
  const snesAddr = parseInt(addrHex, 16);
  const patchVal = parseInt(valHex,  16);
  if (isNaN(snesAddr) || isNaN(patchVal)) {
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">Código inválido: ${esc(pu.code)} — use ADDR:VALUE hex (ex: 7E00CE:02)</span>`);
    return;
  }
  // SNES WRAM: 0x7E0000-0x7FFFFF → wramOffset = snesAddr & 0x1FFFF
  const wramOffset = snesAddr & 0x1FFFF;

  try {
    const Module = nostalgistInstance.getEmscriptenModule();

    // ── Método 1: _retro_get_memory_data (direto, sem pausar) ──────────────
    // libretro constants: SAVE_RAM=0, RTC=1, SYSTEM_RAM=2, VIDEO_RAM=3
    const RETRO_MEMORY_SYSTEM_RAM = 2;
    if (typeof Module._retro_get_memory_data === 'function') {
      const ramPtr  = Module._retro_get_memory_data(RETRO_MEMORY_SYSTEM_RAM);
      const ramSize = typeof Module._retro_get_memory_size === 'function'
                      ? Module._retro_get_memory_size(RETRO_MEMORY_SYSTEM_RAM)
                      : 0x20000;
      addLog('sys', `<span class="ts">${ts()}</span> RAM ptr=0x${ramPtr.toString(16)} size=0x${ramSize.toString(16)} wramOffset=0x${wramOffset.toString(16)}`);
      if (ramPtr > 0 && wramOffset < ramSize) {
        const old = Module.HEAPU8[ramPtr + wramOffset];
        Module.HEAPU8[ramPtr + wramOffset] = patchVal & 0xFF;
        flashKey(pu.label, username || null);
        speak(pu.tts);
        addLog('key',
          `<span class="ts">${ts()}</span> ${pu.label} ` +
          `→ <span class="kinfo">RAM[0x${addrHex}] ${old}→${patchVal}</span> ✓ direto` +
          (username ? ` por <span class="user">${esc(username)}</span>` : '')
        );
        return;
      }
      addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--yellow)">ptr inválido ou offset fora da RAM — tentando save state</span>`);
    } else {
      addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--yellow)">_retro_get_memory_data não exportado — tentando save state</span>`);
    }

    // ── Método 2: patch no save state (fallback) ───────────────────────────
    addLog('sys', `<span class="ts">${ts()}</span> ⚡ _retro_get_memory_data indisponível — usando save state patch`);
    const { state } = await nostalgistInstance.saveState();
    const rawBuf = new Uint8Array(await state.arrayBuffer());
    // Descomprime RZIP se necessário (RetroArch pode comprimir estados mesmo com config false)
    const buf = await maybeDecompressRzip(rawBuf);

    // snes9x-libretro salva blocos internos no formato "TAG:NNNNNN:data" (hex size)
    // dentro de um wrapper externo "RASTATE" + "MEM "[uint32 LE size].
    // O bloco de WRAM se chama "RAM" → "RAM:020000:" (0x20000 = 131072 bytes).
    let patchIdx = -1;
    const enc = new TextEncoder();

    // Estratégia 1: snes9x real — "RAM:[6 hex digits]:" (ex: "RAM:020000:")
    {
      const prefix = enc.encode('RAM:'); // 52 41 4D 3A
      for (let i = 0; i <= buf.length - 11; i++) {
        if (buf[i]!==0x52||buf[i+1]!==0x41||buf[i+2]!==0x4D||buf[i+3]!==0x3A) continue;
        // Lê 6 chars hex + ":"
        let sizeStr = '';
        for (let k = 4; k < 10; k++) {
          const c = buf[i+k];
          if (!((c>=0x30&&c<=0x39)||(c>=0x61&&c<=0x66)||(c>=0x41&&c<=0x46))) { sizeStr=''; break; }
          sizeStr += String.fromCharCode(c);
        }
        if (sizeStr.length !== 6 || buf[i+10] !== 0x3A) continue; // precisa de ":" após 6 dígitos
        // snes9x usa decimal (ex: "131072" = 128KB), não hex
        const blkSize = parseInt(sizeStr, 10);
        if (blkSize >= wramOffset + 1 && i + 11 + blkSize <= buf.length) {
          patchIdx = i + 11 + wramOffset;
          addLog('sys', `<span class="ts">${ts()}</span> "RAM:${sizeStr}:" snes9x no offset ${i} (${blkSize}B)`);
          break;
        }
      }
    }

    // Estratégia 2: tag binária "RAM " + uint32 LE (builds com espaço)
    if (patchIdx === -1) {
      for (let i = 0; i <= buf.length - 8; i++) {
        if (buf[i]!==0x52||buf[i+1]!==0x41||buf[i+2]!==0x4D||buf[i+3]!==0x20) continue;
        const sz = buf[i+4]|(buf[i+5]<<8)|(buf[i+6]<<16)|(buf[i+7]<<24);
        if (sz === 0x20000 && i+8+sz <= buf.length) {
          patchIdx = i + 8 + wramOffset;
          addLog('sys', `<span class="ts">${ts()}</span> "RAM " binário (${sz}B) no offset ${i}`);
          break;
        }
      }
    }

    // Estratégia 3: tag binária "WRAM" + uint32 LE (outros builds/cores)
    if (patchIdx === -1) {
      for (let i = 0; i <= buf.length - 8; i++) {
        if (buf[i]!==0x57||buf[i+1]!==0x52||buf[i+2]!==0x41||buf[i+3]!==0x4D) continue;
        const sz = buf[i+4]|(buf[i+5]<<8)|(buf[i+6]<<16)|(buf[i+7]<<24);
        if (sz >= 0x10000 && sz <= 0x40000 && sz >= wramOffset+1 && i+8+sz <= buf.length) {
          patchIdx = i + 8 + wramOffset;
          addLog('sys', `<span class="ts">${ts()}</span> "WRAM" binário (${sz}B) no offset ${i}`);
          break;
        }
      }
    }

    // Estratégia 4: header textual "WRAM:131072\n" ou "WRAM:N\n"
    if (patchIdx === -1) {
      const tag = enc.encode('WRAM:');
      for (let i = 0; i <= buf.length - 12; i++) {
        let ok = true;
        for (let j = 0; j < tag.length; j++) { if (buf[i+j] !== tag[j]) { ok=false; break; } }
        if (!ok) continue;
        let skip = tag.length, sizeStr = '';
        while (skip < 20 && buf[i+skip] >= 0x30 && buf[i+skip] <= 0x39) { sizeStr += String.fromCharCode(buf[i+skip]); skip++; }
        if (buf[i+skip] === 0x0A) {
          const blkSize = parseInt(sizeStr, 10);
          if (blkSize >= wramOffset + 1) {
            patchIdx = i + skip + 1 + wramOffset;
            addLog('sys', `<span class="ts">${ts()}</span> "WRAM:${blkSize}" textual no offset ${i}`);
            break;
          }
        }
      }
    }

    if (patchIdx === -1 || patchIdx >= buf.length) {
      throw new Error('WRAM não localizada. Clique em "🔍 Diagnóstico" e cole o log para análise.');
    }

    const old = buf[patchIdx];
    buf[patchIdx] = patchVal & 0xFF;
    await nostalgistInstance.loadState(new Blob([buf], { type: 'application/octet-stream' }));

    flashKey(pu.label, username || null);
    speak(pu.tts);
    addLog('key',
      `<span class="ts">${ts()}</span> ${pu.label} ` +
      `→ <span class="kinfo">RAM[0x${addrHex}] ${old}→${patchVal}</span> (state patch)` +
      (username ? ` por <span class="user">${esc(username)}</span>` : '')
    );
  } catch(err) {
    console.error('[applyPowerup]', err);
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">❌ Power-up: ${esc(err.message)}</span>`);
  }
}

function deepCopyPreset(name) {
  return JSON.parse(JSON.stringify(PRESETS[name]?.map || PRESETS.generic.map));
}

// ─── Presets & preview ───────────────────────────────────────────────────────
// Canonical (non-alias) entries shown in preview: first occurrence of each label
const PREVIEW_KEYS = ['rose','lion','diamond','cake','rocket','heart','universe','icecream'];

function populatePresetSelects() {
  const BUILTIN = [
    { value: 'generic', label: 'Genérico' },
    { value: 'mario',   label: 'Super Mario Bros 3 - All-Stars / World' },
  ];
  const builtHtml = BUILTIN.map(p =>
    `<option value="${p.value}">${p.label}</option>`
  ).join('');
  const userKeys = Object.keys(USER_PRESETS);
  const userHtml = userKeys.length
    ? '<optgroup label="─ Meus Presets ─">' +
      userKeys.map(n => `<option value="${esc(n)}">★ ${esc(n)}</option>`).join('') +
      '</optgroup>'
    : '';
  const html = builtHtml + userHtml;
  ['preset-select', 'editor-preset-select'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html;
    el.value = currentPreset;
  });
}

function updateDeletePresetBtn() {
  const btn = document.getElementById('delete-preset-btn');
  if (btn) btn.style.display = USER_PRESETS[currentPreset] ? 'inline-block' : 'none';
}

function applyPreset(name, fromEditor) {
  if (PRESETS[name]) {
    currentPreset = name;
    const baseMap = deepCopyPreset(name);
    // Preserve only genuinely user-defined powerup entries (keys that don't exist in any built-in preset)
    const allBuiltinKeys = new Set(Object.values(PRESETS).flatMap(p => Object.keys(p.map || {})));
    Object.entries(GIFT_MAP).forEach(([k, v]) => {
      if (v.special === 'powerup' && !allBuiltinKeys.has(k)) baseMap[k] = JSON.parse(JSON.stringify(v));
    });
    GIFT_MAP = baseMap;
    // Use user-configured POWERUPS if available; fall back to preset defaults
    const _userPU = Object.values(USER_PRESETS).find(p => p.powerups?.length);
    POWERUPS = _userPU
      ? JSON.parse(JSON.stringify(_userPU.powerups))
      : JSON.parse(JSON.stringify(PRESETS[name].powerups || []));
    BANNER_CUSTOM_IMAGE = null; // built-in presets use asset path
    BANNER_HEIGHT = 80;
  } else if (USER_PRESETS[name]) {
    currentPreset = name;
    applyUserPreset(USER_PRESETS[name]);
  }
  applyBannerToDOM();
  populatePresetSelects();
  const ni = document.getElementById('preset-name-input');
  if (ni) ni.value = USER_PRESETS[name] ? name : '';
  updateDeletePresetBtn();
  if (fromEditor) { renderEditorTable(); renderBannerPanel(); renderPuTable?.(); }
  renderGiftMapPreview();
  renderPuTestButtons();
  saveToStorage();
}

function readEditorGifts() {
  const newMap = {};
  for (const row of document.querySelectorAll('#editor-rows tr')) {
    const name   = row.querySelector('[data-f=name]').value.trim().toLowerCase().replace(/\s+/g,'');
    const label  = row.querySelector('[data-f=label]').value.trim();
    const seqStr = row.querySelector('[data-f=seq]').value.trim();
    const tts    = row.querySelector('[data-f=tts]').value.trim();
    if (!name) continue;
    const action = strToAction(seqStr);
    newMap[name] = action.special
      ? { ...action, label, tts, seq: [] }
      : { seq: action.seq, label, tts };
  }
  GIFT_MAP = newMap;
}

function readEditorAll() {
  readEditorGifts();

  LIKE_TRIGGERS = [];
  for (const row of document.querySelectorAll('#likes-rows tr')) {
    const every     = parseInt(row.querySelector('[data-f=every]').value) || 0;
    const label     = row.querySelector('[data-f=label]').value.trim();
    const actionStr = row.querySelector('[data-f=action]').value.trim();
    const tts       = row.querySelector('[data-f=tts]').value.trim();
    if (!every) continue;
    LIKE_TRIGGERS.push({ every, label, tts, actionStr });
  }

  KEYWORD_TRIGGERS = [];
  for (const row of document.querySelectorAll('#kw-rows tr')) {
    const keyword   = row.querySelector('[data-f=kw]').value.trim();
    const label     = row.querySelector('[data-f=label]').value.trim();
    const actionStr = row.querySelector('[data-f=action]').value.trim();
    const tts       = row.querySelector('[data-f=tts]').value.trim();
    if (!keyword) continue;
    KEYWORD_TRIGGERS.push({ keyword, label, tts, actionStr });
  }

  POWERUPS = [];
  for (const row of document.querySelectorAll('#pu-rows tr')) {
    const name  = row.querySelector('[data-f=name]')?.value.trim();
    const code  = row.querySelector('[data-f=code]')?.value.trim();
    const label = row.querySelector('[data-f=label]')?.value.trim();
    const tts   = row.querySelector('[data-f=tts]')?.value.trim();
    if (!name || !code) continue;
    POWERUPS.push({ name, code, label: label||name, tts: tts||name });
  }
}

function presetSnapshot() {
  return {
    map:         JSON.parse(JSON.stringify(GIFT_MAP)),
    likes:       JSON.parse(JSON.stringify(LIKE_TRIGGERS)),
    keywords:    JSON.parse(JSON.stringify(KEYWORD_TRIGGERS)),
    powerups:    JSON.parse(JSON.stringify(POWERUPS)),
    bannerImage: BANNER_CUSTOM_IMAGE,
    bannerHeight: BANNER_HEIGHT,
  };
}

function applyUserPreset(p) {
  GIFT_MAP = JSON.parse(JSON.stringify(p.map));
  if (p.likes)    LIKE_TRIGGERS    = JSON.parse(JSON.stringify(p.likes));
  if (p.keywords) KEYWORD_TRIGGERS = JSON.parse(JSON.stringify(p.keywords));
  POWERUPS = p.powerups?.length
    ? JSON.parse(JSON.stringify(p.powerups))
    : JSON.parse(JSON.stringify(PRESETS.generic.powerups));
  BANNER_CUSTOM_IMAGE = p.bannerImage || null;
  if (p.bannerHeight) BANNER_HEIGHT = p.bannerHeight;
}

// ─── Banner helpers ──────────────────────────────────────────────────────────
function effectiveBannerSrc() {
  return BANNER_CUSTOM_IMAGE || PRESET_BANNER_ASSETS[currentPreset] || null;
}

function applyBannerToDOM() {
  const src    = effectiveBannerSrc();
  const banner = document.getElementById('gift-banner');
  const img    = document.getElementById('gift-banner-bg');
  if (!banner) return;
  if (src) {
    img.src = src;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
    img.src = '';
  }
}

function setBannerHeight(h) {
  BANNER_HEIGHT = parseInt(h) || 80;
  const banner = document.getElementById('gift-banner');
  if (banner) banner.style.height = BANNER_HEIGHT + 'px';
}

let bannerClearTimer = null;
function showBannerEvent(label, username) {
  const banner   = document.getElementById('gift-banner');
  if (!banner || banner.style.display === 'none') return;
  document.getElementById('gift-banner-label').textContent = label || '';
  document.getElementById('gift-banner-user').textContent  =
    username ? '@' + String(username).replace(/^@/, '') : '';
  banner.classList.remove('banner-pulse');
  void banner.offsetWidth;
  banner.classList.add('banner-pulse');
  if (bannerClearTimer) clearTimeout(bannerClearTimer);
  bannerClearTimer = setTimeout(() => {
    const lbl = document.getElementById('gift-banner-label');
    const usr = document.getElementById('gift-banner-user');
    if (lbl) lbl.textContent = '';
    if (usr) usr.textContent = '';
    if (banner) banner.classList.remove('banner-pulse');
  }, 6000);
}

function handleBannerUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    BANNER_CUSTOM_IMAGE = e.target.result;
    applyBannerToDOM();
    renderBannerPanel();
  };
  reader.readAsDataURL(file);
}

function clearBannerImage() {
  BANNER_CUSTOM_IMAGE = null;
  applyBannerToDOM();
  renderBannerPanel();
}

function renderBannerPanel() {
  const previewWrap = document.getElementById('banner-preview-wrap');
  const preview     = document.getElementById('banner-preview');
  const noImage     = document.getElementById('banner-no-image');
  const clearBtn    = document.getElementById('banner-clear-btn');
  const assetNote   = document.getElementById('banner-asset-note');
  const assetPath   = document.getElementById('banner-asset-path');
  if (!previewWrap) return;

  if (BANNER_CUSTOM_IMAGE) {
    preview.src               = BANNER_CUSTOM_IMAGE;
    previewWrap.style.display = 'block';
    noImage.style.display     = 'none';
    clearBtn.style.display    = 'inline-block';
    assetNote.style.display   = 'none';
  } else {
    const asset = PRESET_BANNER_ASSETS[currentPreset];
    if (asset) {
      preview.src               = asset;
      previewWrap.style.display = 'block';
      noImage.style.display     = 'none';
      assetNote.style.display   = 'block';
      assetPath.textContent     = asset;
    } else {
      previewWrap.style.display = 'none';
      noImage.style.display     = 'block';
      assetNote.style.display   = 'none';
    }
    clearBtn.style.display = 'none';
  }
}

function saveAsPreset() {
  const input = document.getElementById('preset-name-input');
  const name = (input ? input.value : '').trim();
  if (!name) {
    if (input) {
      input.focus();
      input.style.borderColor = 'var(--pink)';
      setTimeout(() => { input.style.borderColor = ''; }, 1200);
    }
    return;
  }
  if (PRESETS[name]) {
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">Nome reservado — use outro nome</span>`);
    return;
  }
  readEditorAll();
  USER_PRESETS[name] = presetSnapshot();
  currentPreset = name;
  saveToStorage();
  populatePresetSelects();
  updateDeletePresetBtn();
  addLog('sys', `<span class="ts">${ts()}</span> ✓ Preset <b>${esc(name)}</b> salvo`);
}

function deleteCurrentPreset() {
  if (!USER_PRESETS[currentPreset]) return;
  if (!confirm(`Excluir o preset "${currentPreset}"?`)) return;
  const deleted = currentPreset;
  delete USER_PRESETS[deleted];
  currentPreset = 'generic';
  GIFT_MAP = deepCopyPreset('generic');
  saveToStorage();
  populatePresetSelects();
  renderEditorTable();
  renderGiftMapPreview();
  updateDeletePresetBtn();
  const ni = document.getElementById('preset-name-input');
  if (ni) ni.value = '';
  addLog('sys', `<span class="ts">${ts()}</span> Preset <b>${esc(deleted)}</b> excluído`);
}

function renderGiftMapPreview() {
  const el = document.getElementById('gift-map-preview');
  if (!el) return;
  // Show up to 6 entries; prefer PREVIEW_KEYS order
  const shown = new Set();
  const entries = [];
  for (const k of PREVIEW_KEYS) {
    if (GIFT_MAP[k] && !shown.has(GIFT_MAP[k].label)) {
      entries.push([k, GIFT_MAP[k]]);
      shown.add(GIFT_MAP[k].label);
    }
  }
  // Fill remaining slots from the map
  for (const [k, v] of Object.entries(GIFT_MAP)) {
    if (entries.length >= 6) break;
    if (!shown.has(v.label)) { entries.push([k, v]); shown.add(v.label); }
  }
  el.innerHTML = entries.map(([, v]) =>
    `<div class="gift-row">
       <span class="gift-name">${v.label||'—'}</span>
       <span class="gift-key">${actionToStr(v)||'TTS apenas'}</span>
     </div>`
  ).join('');
}

// ─── Like & Keyword triggers ─────────────────────────────────────────────────
let LIKE_TRIGGERS = [
  { every: 100,  label: '💜 100 Likes!',  tts: 'Cem likes!',         actionStr: 'SLOWMO:3000' },
  { every: 500,  label: '🔥 500 Likes!',  tts: 'Quinhentos likes!',  actionStr: 'LEFT:300 B:150:80 LEFT:300' },
  { every: 1000, label: '🌟 1000 Likes!', tts: 'Mil likes! Rewind!', actionStr: 'REWIND:3000' },
];

let KEYWORD_TRIGGERS = [
  { keyword: '!rewind', label: '⏪ Rewind!',  tts: 'Rewind pelo chat!',      actionStr: 'REWIND:2500' },
  { keyword: '!slow',   label: '🐢 Slow Mo!', tts: 'Slow motion pelo chat!', actionStr: 'SLOWMO:5000' },
  { keyword: '!caos',   label: '🌌 CAOS!',    tts: 'Caos pelo chat!',        actionStr: 'LEFT:300 B:150:80 LEFT:300 B:150' },
];

const kwCooldowns = {}; // keyword → último timestamp disparado
const KW_COOLDOWN = 10000;

const userLikeCounts = {}; // uniqueId → taps acumulados desse usuário
let likesOverlayEnabled = true;
let likesOverlayOpacity = 0.72;

function resetLikeCounts() {
  for (const k in userLikeCounts) delete userLikeCounts[k];
  localStorage.removeItem(LS+'likecounts');
  updateLikesLeaderboard();
  addLog('sys', `<span class="ts">${ts()}</span> ❤️ Contagem de likes zerada.`);
}

function setLikesOverlayVisible(enabled) {
  likesOverlayEnabled = enabled;
  const opRow = document.getElementById('likes-opacity-row');
  if (opRow) opRow.style.display = enabled ? 'flex' : 'none';
  updateLikesLeaderboard();
  localStorage.setItem('snestk_likesoverlay', JSON.stringify({ enabled, opacity: likesOverlayOpacity }));
}

function setLikesOpacity(val) {
  likesOverlayOpacity = parseFloat(val);
  const overlay = document.getElementById('likes-overlay');
  if (overlay) overlay.style.opacity = likesOverlayOpacity;
  localStorage.setItem('snestk_likesoverlay', JSON.stringify({ enabled: likesOverlayEnabled, opacity: likesOverlayOpacity }));
}

function actionToStr(action) {
  if (!action) return '';
  if (action.special === 'rewind')  return `REWIND:${action.rewindMs || 2000}`;
  if (action.special === 'slowmo')  return `SLOWMO:${action.slowmoMs || 5000}`;
  if (action.special === 'fastmo')  return `FASTMO:${action.fastmoMs || 5000}`;
  if (action.special === 'mirror')   return `MIRROR:${action.mirrorMs || 5000}`;
  if (action.special === 'blackout') return `BLACKOUT:${action.blackoutMs || 5000}`;
  if (action.special === 'splash')   return `SPLASH:${action.splashMs || 5000}`;
  if (action.special === 'unplug')  return `UNPLUG:${action.unplugMs || 5000}`;
  if (action.special === 'reset')   return 'RESET';
  if (action.special === 'powerup') return `POWERUP:${action.powerupIdx ?? 0}`;
  return seqToStr(action.seq || []);
}

function strToAction(str) {
  const s = (str || '').trim();
  const up = s.toUpperCase();
  if (up.startsWith('REWIND'))  return { special: 'rewind',  rewindMs:  parseInt(s.split(':')[1]) || 2000 };
  if (up.startsWith('SLOWMO'))  return { special: 'slowmo',  slowmoMs:  parseInt(s.split(':')[1]) || 5000 };
  if (up.startsWith('FASTMO'))  return { special: 'fastmo',  fastmoMs:  parseInt(s.split(':')[1]) || 5000 };
  if (up.startsWith('MIRROR'))   return { special: 'mirror',   mirrorMs:   parseInt(s.split(':')[1]) || 5000 };
  if (up.startsWith('BLACKOUT')) return { special: 'blackout', blackoutMs: parseInt(s.split(':')[1]) || 5000 };
  if (up.startsWith('SPLASH'))   return { special: 'splash',   splashMs:   parseInt(s.split(':')[1]) || 5000 };
  if (up.startsWith('UNPLUG'))  return { special: 'unplug',  unplugMs:  parseInt(s.split(':')[1]) || 5000 };
  if (up === 'RESET')           return { special: 'reset' };
  if (up.startsWith('POWERUP')) return { special: 'powerup', powerupIdx: parseInt(s.split(':')[1]) || 0 };
  return { seq: parseSeq(s) };
}

async function triggerAction(action, label, ttsText, context, type) {
  if (!action) return;
  const lbl = label || '⚡';
  const ttsOk = type === 'like' ? ttsCfg.likes : type === 'kw' ? ttsCfg.keywords : true;
  // context é "username — Nmilestone likes" ou "username: !keyword"
  const who = context ? context.split('—')[0].split(':')[0].trim() : '';
  if (ttsText && ttsOk) {
    const ttsWithWho = (who && (type === 'like' || type === 'kw')) ? `${who}! ${ttsText}` : ttsText;
    speak(ttsWithWho);
  }
  flashKey(lbl, who || null);
  const ctxStr = context ? ` <span style="color:var(--muted)">(${esc(context)})</span>` : '';
  const unplugged = Date.now() < unplugUntil;
  if (action.special === 'unplug') {
    const totalMs = giftUnplug(action.unplugMs || 5000);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">🔌 UNPLUG +${action.unplugMs||5000}ms (total: ${(totalMs/1000).toFixed(1)}s)</span>${ctxStr}`);
  } else if (unplugged) {
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo" style="color:var(--muted)">[🔌 controle desplugado]</span>${ctxStr}`);
  } else if (action.special === 'rewind') {
    const totalMs = giftRewind(action.rewindMs || 2000);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">REWIND +${action.rewindMs||2000}ms (total: ${(totalMs/1000).toFixed(1)}s)</span>${ctxStr}`);
  } else if (action.special === 'slowmo') {
    const totalMs = giftSlowmo(action.slowmoMs || 5000);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">SLOWMO +${action.slowmoMs||5000}ms (total: ${(totalMs/1000).toFixed(1)}s)</span>${ctxStr}`);
  } else if (action.special === 'fastmo') {
    const totalMs = giftFastmo(action.fastmoMs || 5000);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">FASTMO +${action.fastmoMs||5000}ms (total: ${(totalMs/1000).toFixed(1)}s)</span>${ctxStr}`);
  } else if (action.special === 'mirror') {
    const totalMs = giftMirror(action.mirrorMs || 5000);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">🪞 MIRROR +${action.mirrorMs||5000}ms (total: ${(totalMs/1000).toFixed(1)}s)</span>${ctxStr}`);
  } else if (action.special === 'blackout') {
    const totalMs = giftBlackout(action.blackoutMs || 5000);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">⬛ BLACKOUT +${action.blackoutMs||5000}ms (total: ${(totalMs/1000).toFixed(1)}s)</span>${ctxStr}`);
  } else if (action.special === 'splash') {
    const totalMs = giftSplash(action.splashMs || 5000);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">💦 SPLASH +${action.splashMs||5000}ms (total: ${(totalMs/1000).toFixed(1)}s)</span>${ctxStr}`);
  } else if (action.special === 'reset') {
    resetGame(who);
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">RESET</span>${ctxStr}`);
  } else if (action.special === 'powerup') {
    await applyPowerup(action.powerupIdx || 0, who);
  } else if (action.seq && action.seq.length) {
    await pressSeq(action.seq);
    const keys = action.seq.map(e => Array.isArray(e) ? e[0] : e).join(' ');
    addLog('key', `<span class="ts">${ts()}</span> ${lbl} → <span class="kinfo">[${keys}]</span>${ctxStr}`);
  }
}

// ─── Gift map editor ─────────────────────────────────────────────────────────
let edActiveTab = 'gifts';

function switchTab(tab, btn) {
  edActiveTab = tab;
  document.querySelectorAll('.ed-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ed-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  const labels = { gifts: '＋ Adicionar Gift', likes: '＋ Adicionar Trigger', keywords: '＋ Adicionar Palavra', powerups: '＋ Adicionar Power-up' };
  const addBtn = document.getElementById('ed-add-btn');
  if (labels[tab]) {
    addBtn.textContent    = labels[tab];
    addBtn.style.visibility = '';
  } else {
    addBtn.style.visibility = 'hidden';
  }
}

function renderPuTable() {
  document.getElementById('pu-rows').innerHTML = POWERUPS.map((pu, i) => `
    <tr>
      <td style="color:var(--muted);text-align:center;font-size:0.7rem">${i}</td>
      <td><input class="editor-input" data-f="name"  value="${esc(pu.name||'')}"></td>
      <td><input class="editor-input seq" data-f="code"  value="${esc(pu.code||'')}"></td>
      <td><input class="editor-input" data-f="label" value="${esc(pu.label||'')}"></td>
      <td><input class="editor-input" data-f="tts"   value="${esc(pu.tts||'')}"></td>
      <td>${makeDelBtn()}</td>
    </tr>`).join('');
}

function openEditor() {
  renderEditorTable();
  renderLikesTable();
  renderKwTable();
  renderPuTable();
  renderBannerPanel();
  updateDeletePresetBtn();
  const ni = document.getElementById('preset-name-input');
  if (ni) ni.value = USER_PRESETS[currentPreset] ? currentPreset : '';
  document.getElementById('editor-overlay').classList.add('open');
}
function closeEditor() {
  document.getElementById('editor-overlay').classList.remove('open');
}

function renderEditorTable() {
  const tbody = document.getElementById('editor-rows');
  tbody.innerHTML = Object.entries(GIFT_MAP).map(([name, cfg], i) => `
    <tr data-i="${i}">
      <td><input class="editor-input" data-f="name" value="${esc(name)}"></td>
      <td><input class="editor-input" data-f="label" value="${esc(cfg.label||'')}"></td>
      <td><input class="editor-input seq" data-f="seq" value="${esc(actionToStr(cfg))}"></td>
      <td><input class="editor-input" data-f="tts" value="${esc(cfg.tts||'')}"></td>
      <td>${makeDelBtn()}</td>
    </tr>`).join('');
}

function makeDelBtn() {
  return `<button class="btn btn-red" style="padding:2px 6px" onclick="this.closest('tr').remove()">✕</button>`;
}

function addEditorRow() {
  if (edActiveTab === 'gifts') {
    const tbody = document.getElementById('editor-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="editor-input" data-f="name"  placeholder="giftname"></td>
      <td><input class="editor-input" data-f="label" placeholder="🎁 Label"></td>
      <td><input class="editor-input seq" data-f="seq" placeholder="DOWN:600 B:150 ou REWIND:2500"></td>
      <td><input class="editor-input" data-f="tts"   placeholder="Texto falado"></td>
      <td>${makeDelBtn()}</td>`;
    tbody.appendChild(tr);
    tr.querySelector('[data-f=name]').focus();
  } else if (edActiveTab === 'likes') {
    const tbody = document.getElementById('likes-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="editor-input" data-f="every" placeholder="100" style="width:70px"></td>
      <td><input class="editor-input" data-f="label" placeholder="💜 Label"></td>
      <td><input class="editor-input seq" data-f="action" placeholder="SLOWMO:3000"></td>
      <td><input class="editor-input" data-f="tts"   placeholder="Texto falado"></td>
      <td>${makeDelBtn()}</td>`;
    tbody.appendChild(tr);
    tr.querySelector('[data-f=every]').focus();
  } else if (edActiveTab === 'powerups') {
    const tbody = document.getElementById('pu-rows');
    const idx = tbody.rows.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--muted);text-align:center;font-size:0.7rem">${idx}</td>
      <td><input class="editor-input" data-f="name"  placeholder="Fire Flower"></td>
      <td><input class="editor-input seq" data-f="code"  placeholder="7E00CE:02"></td>
      <td><input class="editor-input" data-f="label" placeholder="🔥 Fire!"></td>
      <td><input class="editor-input" data-f="tts"   placeholder="Fire Flower!"></td>
      <td>${makeDelBtn()}</td>`;
    tbody.appendChild(tr);
    tr.querySelector('[data-f=name]').focus();
  } else if (edActiveTab === 'keywords') {
    const tbody = document.getElementById('kw-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="editor-input" data-f="kw"    placeholder="!rewind"></td>
      <td><input class="editor-input" data-f="label" placeholder="⏪ Label"></td>
      <td><input class="editor-input seq" data-f="action" placeholder="REWIND:2500"></td>
      <td><input class="editor-input" data-f="tts"   placeholder="Texto falado"></td>
      <td>${makeDelBtn()}</td>`;
    tbody.appendChild(tr);
    tr.querySelector('[data-f=kw]').focus();
  }
}

function renderLikesTable() {
  document.getElementById('likes-rows').innerHTML = LIKE_TRIGGERS.map(t => `
    <tr>
      <td><input class="editor-input" data-f="every"  value="${t.every}" style="width:70px"></td>
      <td><input class="editor-input" data-f="label"  value="${esc(t.label||'')}"></td>
      <td><input class="editor-input seq" data-f="action" value="${esc(t.actionStr||'')}"></td>
      <td><input class="editor-input" data-f="tts"    value="${esc(t.tts||'')}"></td>
      <td>${makeDelBtn()}</td>
    </tr>`).join('');
}

function renderKwTable() {
  document.getElementById('kw-rows').innerHTML = KEYWORD_TRIGGERS.map(t => `
    <tr>
      <td><input class="editor-input" data-f="kw"     value="${esc(t.keyword||'')}"></td>
      <td><input class="editor-input" data-f="label"  value="${esc(t.label||'')}"></td>
      <td><input class="editor-input seq" data-f="action" value="${esc(t.actionStr||'')}"></td>
      <td><input class="editor-input" data-f="tts"    value="${esc(t.tts||'')}"></td>
      <td>${makeDelBtn()}</td>
    </tr>`).join('');
}

function saveEditor() {
  readEditorAll();

  if (USER_PRESETS[currentPreset]) {
    USER_PRESETS[currentPreset] = presetSnapshot();
  } else if (PRESETS[currentPreset]) {
    USER_PRESETS['custom'] = presetSnapshot();
    currentPreset = 'custom';
  }

  populatePresetSelects();
  updateDeletePresetBtn();
  renderGiftMapPreview();
  renderPuTestButtons();
  saveToStorage();
  closeEditor();
  addLog('sys', `<span class="ts">${ts()}</span> ✓ Aplicado — ${Object.keys(GIFT_MAP).length} gifts, ${LIKE_TRIGGERS.length} likes, ${KEYWORD_TRIGGERS.length} keywords, ${POWERUPS.length} power-ups`);
}

// ─── LocalStorage ─────────────────────────────────────────────────────────────
const LS = 'snestk_';

function saveToStorage() {
  try {
    localStorage.setItem(LS+'preset',       currentPreset);
    localStorage.setItem(LS+'userpresets',  JSON.stringify(USER_PRESETS));
    localStorage.setItem(LS+'liketriggers', JSON.stringify(LIKE_TRIGGERS));
    localStorage.setItem(LS+'kwtriggers',   JSON.stringify(KEYWORD_TRIGGERS));
    localStorage.setItem(LS+'powerups',     JSON.stringify(POWERUPS));
    // For built-in presets: save the full GIFT_MAP so ALL customizations (not just powerup entries)
    // survive reloads. This key is always up-to-date because saveToStorage is called frequently.
    if (PRESETS[currentPreset]) {
      localStorage.setItem(LS+'giftmap_'+currentPreset, JSON.stringify(GIFT_MAP));
    }
    // Legacy: keep powerupgifts for backward compat
    const puGifts = {};
    Object.entries(GIFT_MAP).forEach(([k, v]) => { if (v.special === 'powerup') puGifts[k] = v; });
    localStorage.setItem(LS+'powerupgifts', JSON.stringify(puGifts));
    localStorage.setItem(LS+'bannerheight', String(BANNER_HEIGHT));
    const url      = document.getElementById('zerody-url-paste').value.trim();
    const username = document.getElementById('username-input').value.trim();
    const token    = document.getElementById('token-input').value.trim();
    if (url)      localStorage.setItem(LS+'url',      url);
    if (username) localStorage.setItem(LS+'username', username);
    if (token)    localStorage.setItem(LS+'token',    token);
  } catch(_) {}
}

function loadFromStorage() {
  try {
    const url      = localStorage.getItem(LS+'url')      || '';
    const username = localStorage.getItem(LS+'username') || '';
    const token    = localStorage.getItem(LS+'token')    || '';
    const preset   = localStorage.getItem(LS+'preset')   || 'generic';

    // Load user presets FIRST — before any call that triggers saveToStorage()
    // (parseZerdyUrl below calls saveToStorage, which would wipe USER_PRESETS if loaded after)
    const upRaw = localStorage.getItem(LS+'userpresets');
    if (upRaw) {
      USER_PRESETS = JSON.parse(upRaw);
    } else {
      // Migrate old 'custom' giftmap slot into USER_PRESETS
      const legacyMap = localStorage.getItem(LS+'giftmap');
      if (legacyMap && preset === 'custom') {
        USER_PRESETS['custom'] = { map: JSON.parse(legacyMap) };
      }
    }

    // Pre-set currentPreset so any saveToStorage() called before applyPreset/applyUserPreset
    // (e.g. from parseZerdyUrl) saves the correct preset name instead of the initial 'generic'
    currentPreset = preset;

    // Read powerupgifts NOW — before parseZerdyUrl or applyPreset call saveToStorage
    // and overwrite this key with an empty map
    const pugRaw = localStorage.getItem(LS+'powerupgifts');

    if (url) {
      document.getElementById('zerody-url-paste').value = url;
      parseZerdyUrl(url);
      addLog('sys', `<span class="ts">${ts()}</span> 🔗 URL restaurada do localStorage`);
    } else {
      if (username) document.getElementById('username-input').value = username;
      if (token)    document.getElementById('token-input').value    = token;
    }

    populatePresetSelects();

    if (USER_PRESETS[preset]) {
      currentPreset = preset;
      applyUserPreset(USER_PRESETS[preset]);
      populatePresetSelects();
    } else {
      // Built-in preset: restore likes/keywords/powerups from flat keys
      const lt = localStorage.getItem(LS+'liketriggers');
      const kw = localStorage.getItem(LS+'kwtriggers');
      const pu = localStorage.getItem(LS+'powerups');
      if (lt) LIKE_TRIGGERS    = JSON.parse(lt);
      if (kw) KEYWORD_TRIGGERS = JSON.parse(kw);
      // Restore the GIFT_MAP for this preset — priority order:
      //   1. giftmap_[preset]: full map saved on every saveToStorage (most reliable)
      //   2. powerupgifts: legacy key (only powerup entries)
      //   3. USER_PRESETS scan: fallback for first-ever load after setup
      const savedGM = localStorage.getItem(LS+'giftmap_'+preset);
      if (savedGM) {
        try { Object.assign(GIFT_MAP, JSON.parse(savedGM)); } catch(_) {}
      } else {
        let puGiftsMap = {};
        try { if (pugRaw) puGiftsMap = JSON.parse(pugRaw); } catch(_) {}
        if (!Object.keys(puGiftsMap).length) {
          for (const p of Object.values(USER_PRESETS)) {
            if (p.map) Object.entries(p.map).forEach(([k, v]) => {
              if (v.special === 'powerup') puGiftsMap[k] = v;
            });
          }
        }
        if (Object.keys(puGiftsMap).length) Object.assign(GIFT_MAP, puGiftsMap);
      }
      // Apply preset AFTER merging saved map so "preserve powerup entries" logic inside
      // applyPreset sees them — and its internal saveToStorage writes giftmap_[preset] correctly.
      applyPreset(PRESETS[preset] ? preset : 'generic');
      // POWERUPS are set by applyPreset (preferring USER_PRESETS over preset defaults).
      // Re-render test buttons so labels match the resolved POWERUPS.
      renderPuTestButtons();
    }
    renderGiftMapPreview();
    const bh = localStorage.getItem(LS+'bannerheight');
    if (bh) BANNER_HEIGHT = parseInt(bh) || 80;
    applyBannerToDOM();
    loadTtsCfg();
    const lcRaw = localStorage.getItem(LS+'likecounts');
    if (lcRaw) {
      try {
        Object.assign(userLikeCounts, JSON.parse(lcRaw));
        updateLikesLeaderboard();
      } catch(_) {}
    }
    const loRaw = localStorage.getItem('snestk_likesoverlay');
    if (loRaw) {
      try {
        const lo = JSON.parse(loRaw);
        likesOverlayEnabled = lo.enabled !== false;
        likesOverlayOpacity = parseFloat(lo.opacity) || 0.72;
        const chk = document.getElementById('likes-overlay-chk');
        const sldr = document.getElementById('likes-overlay-opacity');
        const opRow = document.getElementById('likes-opacity-row');
        if (chk)  chk.checked = likesOverlayEnabled;
        if (sldr) sldr.value  = likesOverlayOpacity;
        if (opRow) opRow.style.display = likesOverlayEnabled ? 'flex' : 'none';
      } catch(_) {}
    }
    saveToStorage();
  } catch(_) { applyPreset('generic'); }
}

function normalizeGift(name) {
  return String(name).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]/g,'');
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
let _ttsVoice = null;
let _ttsUtterance = null; // kept alive to prevent Chrome GC from killing active utterances
const TTS_QUEUE_MAX = 3; // max pending items; extras are dropped silently
let _ttsQueue = [];
let _ttsSpeaking = false;

function _loadTtsVoice() {
  const voices = speechSynthesis.getVoices();
  // Prefer local (offline) pt-BR voices — Google online voices fail silently in Chrome
  _ttsVoice = voices.find(v => v.lang === 'pt-BR' && v.localService)
           || voices.find(v => v.lang.startsWith('pt') && v.localService)
           || voices.find(v => v.lang === 'pt-BR')
           || voices.find(v => v.lang.startsWith('pt'))
           || null;
}
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = _loadTtsVoice;
  _loadTtsVoice();
}

function _ttsNext() {
  if (_ttsSpeaking || _ttsQueue.length === 0) return;
  const text = _ttsQueue.shift();
  const u = new SpeechSynthesisUtterance(text);
  if (_ttsVoice) {
    u.voice = _ttsVoice;
    // Do NOT set u.lang when voice is explicit — Chrome reselects voice by lang,
    // overriding our local voice with the Google online voice for pt-BR
  } else {
    u.lang = 'pt-BR';
  }
  u.volume = parseFloat(document.getElementById('tts-vol').value);
  u.rate = 1.1;
  _ttsUtterance = u;
  _ttsSpeaking = true;
  u.onend = () => { _ttsUtterance = null; _ttsSpeaking = false; _ttsNext(); };
  u.onerror = e => {
    _ttsUtterance = null; _ttsSpeaking = false;
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">TTS erro: <b>${esc(e.error)}</b></span>`);
    }
    _ttsNext();
  };
  speechSynthesis.speak(u);
}

function speak(text) {
  if (!ttsEnabled || !window.speechSynthesis) return;
  if (!_ttsVoice) _loadTtsVoice(); // retry if voices weren't ready at init
  if (_ttsQueue.length >= TTS_QUEUE_MAX) return; // queue full — drop silently
  _ttsQueue.push(text);
  _ttsNext();
}

function diagnoseTTS() {
  if (!window.speechSynthesis) {
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">TTS: speechSynthesis não suportado</span>`);
    return;
  }
  const voices = speechSynthesis.getVoices();
  addLog('sys', `<span class="ts">${ts()}</span> TTS → enabled:<b>${ttsEnabled}</b> speaking:<b>${speechSynthesis.speaking}</b> vozes:<b>${voices.length}</b>`);
  const pt = voices.filter(v => v.lang.startsWith('pt'));
  if (pt.length) addLog('sys', `<span class="ts">${ts()}</span> Vozes pt: ${pt.map(v => v.name + (v.localService ? '' : ' ☁️')).join(', ')}`);
  addLog('sys', `<span class="ts">${ts()}</span> Voz selecionada: <b>${_ttsVoice ? _ttsVoice.name + ' (local:' + _ttsVoice.localService + ')' : 'nenhuma'}</b>`);
  speechSynthesis.cancel();
  addLog('sys', `<span class="ts">${ts()}</span> Após cancel → paused:<b>${speechSynthesis.paused}</b> speaking:<b>${speechSynthesis.speaking}</b>`);
  // Test sem voz fixada (deixa o Chrome escolher pelo lang)
  const u = new SpeechSynthesisUtterance('Teste de voz');
  u.lang = 'pt-BR'; u.volume = 1; u.rate = 1;
  u.onstart = () => addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--green)">TTS: ✓ iniciou</span>`);
  u.onend   = () => addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--green)">TTS: ✓ concluiu</span>`);
  u.onerror = e => addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">TTS erro: <b>${esc(e.error)}</b></span>`);
  speechSynthesis.speak(u);
}

function toggleMute() {
  ttsEnabled = !ttsEnabled;
  if (!ttsEnabled) {
    _ttsQueue = [];
    _ttsSpeaking = false;
    speechSynthesis.cancel();
  }
  document.getElementById('mute-btn').textContent = ttsEnabled ? '🔊 Mute TTS' : '🔇 Ativar TTS';
  document.getElementById('tts-dot').style.background = ttsEnabled ? 'var(--purple)' : 'var(--muted)';
}

function saveTtsCfg() {
  localStorage.setItem(LS + 'ttscfg', JSON.stringify(ttsCfg));
}

function loadTtsCfg() {
  try {
    const raw = localStorage.getItem(LS + 'ttscfg');
    if (raw) ttsCfg = { ...ttsCfg, ...JSON.parse(raw) };
  } catch(_) {}
  const ids = { gifts:'tts-gifts', chat:'tts-chat', likes:'tts-likes', keywords:'tts-keywords' };
  for (const [k, id] of Object.entries(ids)) {
    const el = document.getElementById(id);
    if (el) el.checked = ttsCfg[k];
  }
}

// ─── Key simulation ───────────────────────────────────────────────────────────
function keyProps(key) {
  // RetroArch reads both `key` and `code`; code must match physical key name
  if (key.startsWith('Arrow'))  return { key, code: key };
  if (key === 'Enter')          return { key, code: 'Enter' };
  if (key === 'Shift')          return { key, code: 'ShiftLeft' };
  if (key === 'Escape')         return { key, code: 'Escape' };
  return { key: key.toLowerCase(), code: 'Key' + key.toUpperCase() };
}

async function pressKey(key, ms) {
  if (Date.now() < unplugUntil) return; // controle desplugado
  if (Date.now() < mirrorUntil) {
    if (key === 'ArrowLeft') key = 'ArrowRight';
    else if (key === 'ArrowRight') key = 'ArrowLeft';
  }
  ms = ms || 150;
  const canvas = document.getElementById('canvas') || document.getElementById('nostalgist-canvas');
  const target = emuReady && canvas ? canvas : document.body;
  const props  = { ...keyProps(key), bubbles: true, cancelable: true };
  target.dispatchEvent(new KeyboardEvent('keydown', props));
  await delay(ms);
  target.dispatchEvent(new KeyboardEvent('keyup', props));
}

// seq: array of [key, holdMs?, pauseAfterMs?]
async function pressSeq(seq) {
  for (const entry of seq) {
    const [key, holdMs = 150, pauseMs = 180] = Array.isArray(entry) ? entry : [entry];
    await pressKey(key, holdMs);
    await delay(pauseMs);
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Capture-phase guard: bloqueia eventos de teclado físico enquanto o controle está desplugado
function _unplugKeyGuard(e) {
  if (Date.now() >= unplugUntil) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  e.stopImmediatePropagation();
  e.preventDefault();
}
document.addEventListener('keydown', _unplugKeyGuard, true);
document.addEventListener('keyup',   _unplugKeyGuard, true);

// Capture-phase mirror: inverte ArrowLeft ↔ ArrowRight para teclas físicas
const _mirrorSynthetic = new WeakSet();
function _mirrorKeyGuard(e) {
  if (Date.now() >= mirrorUntil) return;
  if (_mirrorSynthetic.has(e)) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const swap = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };
  const mapped = swap[e.key];
  if (!mapped) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  const newEvt = new KeyboardEvent(e.type, { key: mapped, code: mapped, bubbles: true, cancelable: true });
  _mirrorSynthetic.add(newEvt);
  e.target.dispatchEvent(newEvt);
}
document.addEventListener('keydown', _mirrorKeyGuard, true);
document.addEventListener('keyup',   _mirrorKeyGuard, true);

let flashTimeout = null;
function flashKey(label, username, count) {
  document.getElementById('kf-label').textContent = label;
  const userEl = document.getElementById('kf-user');
  if (username) {
    const countStr = count && count > 1 ? ` ×${count}` : '';
    userEl.textContent = `${username}${countStr}`;
    userEl.style.display = '';
  } else {
    userEl.style.display = 'none';
  }
  const el = document.getElementById('key-flash');
  el.classList.add('show');
  if (flashTimeout) clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => el.classList.remove('show'), 1400);
  showBannerEvent(label, username);
}

// ─── Controller display ──────────────────────────────────────────────────────
// Maps keyboard keys → SVG element IDs (KEY_ALIAS: B=z Y=a A=x X=s L=q R=w)
const CTRL_KEY_MAP = {
  arrowup:    'up',       arrowdown: 'dn',
  arrowleft:  'lt',       arrowright: 'rt',
  z:          'b-btn',    // B button
  a:          'y-btn',    // Y button
  x:          'a-btn',    // A button
  s:          'x-btn',    // X button
  q:          'l-btn',    // L shoulder
  w:          'r-btn',    // R shoulder
  enter:      'start',    // Start
  shift:      'select',   // Select
};

function onCtrlKey(e, pressed) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const id = CTRL_KEY_MAP[e.key ? e.key.toLowerCase() : ''];
  if (!id) return;
  const el = document.getElementById('ctrl-' + id);
  if (el) el.classList.toggle('active', pressed);
}

window.addEventListener('keydown', e => onCtrlKey(e, true));
window.addEventListener('keyup',   e => onCtrlKey(e, false));

// ─── Gift & Chat handlers ─────────────────────────────────────────────────────
async function onGiftReceived(giftName, username, repeatCount, isPending) {
  // For streak gifts (giftType===1), only process when streak ends (repeatEnd===true)
  // isPending = true means the streak is still going
  if (isPending) {
    addLog('gift',
      `<span class="ts">${ts()}</span> ` +
      `<span class="user">${esc(username)}</span> ` +
      `<span class="gname">🔄 ${esc(giftName)}</span> ×${repeatCount} <span style="color:var(--muted)">(em progresso…)</span>`
    );
    return;
  }

  const key = normalizeGift(giftName);
  const map = GIFT_MAP[key];
  giftCount += repeatCount;
  document.getElementById('gift-count').textContent = `${giftCount} gifts`;

  if (map) {
    let specialKi = '';
    const unplugged = Date.now() < unplugUntil;
    if (map.special === 'unplug') {
      if (ttsCfg.gifts) speak(`${username} enviou ${giftName}! ${map.tts}`);
      flashKey(map.label, username, repeatCount > 1 ? repeatCount : 0);
      const totalMs = giftUnplug((map.unplugMs || 5000) * repeatCount);
      specialKi = `→ <span class="kinfo">🔌 UNPLUG total: ${(totalMs/1000).toFixed(1)}s</span>`;
    } else if (unplugged) {
      flashKey('🔌 Bloqueado!', username);
      specialKi = `→ <span class="kinfo" style="color:var(--muted)">[🔌 controle desplugado]</span>`;
    } else {
      if (ttsCfg.gifts) speak(`${username} enviou ${repeatCount > 1 ? repeatCount + ' ' : ''}${giftName}! ${map.tts}`);
      flashKey(map.label, username, repeatCount > 1 ? repeatCount : 0);
      if (map.special === 'rewind') {
        const totalMs = giftRewind((map.rewindMs || 2000) * repeatCount);
        specialKi = `→ <span class="kinfo">REWIND total: ${(totalMs/1000).toFixed(1)}s</span>`;
      } else if (map.special === 'slowmo') {
        const totalMs = giftSlowmo((map.slowmoMs || 5000) * repeatCount);
        specialKi = `→ <span class="kinfo">SLOWMO total: ${(totalMs/1000).toFixed(1)}s</span>`;
      } else if (map.special === 'fastmo') {
        const totalMs = giftFastmo((map.fastmoMs || 5000) * repeatCount);
        specialKi = `→ <span class="kinfo">FASTMO total: ${(totalMs/1000).toFixed(1)}s</span>`;
      } else if (map.special === 'mirror') {
        const totalMs = giftMirror((map.mirrorMs || 5000) * repeatCount);
        specialKi = `→ <span class="kinfo">🪞 MIRROR total: ${(totalMs/1000).toFixed(1)}s</span>`;
      } else if (map.special === 'blackout') {
        const totalMs = giftBlackout((map.blackoutMs || 5000) * repeatCount);
        specialKi = `→ <span class="kinfo">⬛ BLACKOUT total: ${(totalMs/1000).toFixed(1)}s</span>`;
      } else if (map.special === 'splash') {
        const totalMs = giftSplash((map.splashMs || 5000) * repeatCount);
        specialKi = `→ <span class="kinfo">💦 SPLASH total: ${(totalMs/1000).toFixed(1)}s</span>`;
      } else if (map.special === 'reset') {
        resetGame(username);
      } else if (map.special === 'powerup') {
        await applyPowerup(map.powerupIdx || 0, username);
      } else {
        const seq = map.seq || [];
        const times = Math.min(repeatCount, 3);
        for (let i = 0; i < times; i++) {
          if (seq.length) await pressSeq(seq);
          if (times > 1) await delay(350);
        }
      }
    }
    const seq = map.seq || [];
    const keyNames = seq.map(e => Array.isArray(e) ? e[0] : e);
    const ki = specialKi || (keyNames.length ? `→ <span class="kinfo">[${keyNames.join(' ')}]</span>` : '');
    addLog('gift',
      `<span class="ts">${ts()}</span> ` +
      `<span class="user">${esc(username)}</span> enviou ` +
      `<span class="gname">${map.label} ${esc(giftName)}</span>` +
      (repeatCount > 1 ? ` ×${repeatCount}` : '') + ` ${ki}`
    );
  } else {
    if (ttsCfg.gifts) speak(`${username} enviou ${giftName}.`);
    addLog('gift',
      `<span class="ts">${ts()}</span> ` +
      `<span class="user">${esc(username)}</span> enviou ` +
      `<span class="gname">🎁 ${esc(giftName)}</span>` +
      (repeatCount > 1 ? ` ×${repeatCount}` : '') +
      ` <span style="color:var(--muted)">(sem mapeamento)</span>`
    );
  }
}

function onChatReceived(username, comment) {
  addLog('chat', `<span class="ts">${ts()}</span> <span class="user">${esc(username)}</span>: ${esc(comment)}`);
  const lower = comment.toLowerCase();
  const now = Date.now();
  // TTS para comentários (rate-limited 1 por 3s para não virar caos)
  if (ttsCfg.chat && now - _chatTtsLast >= 3000) {
    _chatTtsLast = now;
    speak(comment);
  }
  // Keyword triggers
  for (const t of KEYWORD_TRIGGERS) {
    if (!t.keyword) continue;
    if (!lower.includes(t.keyword.toLowerCase())) continue;
    if (now - (kwCooldowns[t.keyword] || 0) < KW_COOLDOWN) continue;
    kwCooldowns[t.keyword] = now;
    triggerAction(strToAction(t.actionStr), t.label, t.tts, `${username}: "${t.keyword}"`, 'kw');
    break;
  }
}

function onLikeReceived(username, count) {
  const prev = userLikeCounts[username] || 0;
  const total = prev + count;
  userLikeCounts[username] = total;
  localStorage.setItem(LS+'likecounts', JSON.stringify(userLikeCounts));

  addLog('like', `<span class="ts">${ts()}</span> <span class="user">${esc(username)}</span> ❤️ ×${count} <span style="color:var(--muted)">(esse usuário: ${total})</span>`);

  // Verifica triggers por usuário — ex: a cada 100 taps do mesmo usuário
  for (const t of LIKE_TRIGGERS) {
    if (!t.every || t.every <= 0) continue;
    if (Math.floor(prev / t.every) < Math.floor(total / t.every)) {
      const milestone = Math.floor(total / t.every) * t.every;
      const trigLabel = t.label || `💜 ${milestone} likes!`;
      addLog('like', `<span class="ts">${ts()}</span> <span class="user">${esc(username)}</span> atingiu <b>${milestone} taps</b> → ${esc(trigLabel)}`);
      triggerAction(strToAction(t.actionStr), trigLabel, t.tts, `${username} — ${milestone} taps`, 'like');
    }
  }
  updateLikesLeaderboard();
}

function updateLikesLeaderboard() {
  const overlay = document.getElementById('likes-overlay');
  const el = document.getElementById('likes-leaderboard');
  if (!el || !overlay) return;
  const sorted = Object.entries(userLikeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (sorted.length === 0 || !likesOverlayEnabled) {
    overlay.style.display = 'none';
    return;
  }
  overlay.style.display = 'block';
  overlay.style.opacity = likesOverlayOpacity;
  const activeTriggers = LIKE_TRIGGERS.filter(t => t.every > 0);
  el.innerHTML = sorted.map(([user, total], idx) => {
    const rankColor = idx === 0 ? 'var(--yellow)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--muted)';
    let barHtml = '';
    if (activeTriggers.length) {
      let best = null, bestNext = Infinity;
      for (const t of activeTriggers) {
        const next = (Math.floor(total / t.every) + 1) * t.every;
        if (next < bestNext) { bestNext = next; best = t; }
      }
      const pct = Math.round((total % best.every) / best.every * 100);
      const rem = bestNext - total;
      barHtml = `
        <div class="liker-bar-wrap" title="${rem} likes para ${esc(best.label || '')}">
          <div class="liker-bar" style="width:${pct}%"></div>
        </div>
        <div class="liker-hint">${rem}❤️ → ${esc(best.label || '?')}</div>`;
    }
    return `<div class="liker-row">
      <div class="liker-topline">
        <span class="liker-rank" style="color:${rankColor}">${idx + 1}</span>
        <span class="liker-name">${esc(user)}</span>
        <span class="liker-total">❤️${total}</span>
      </div>${barHtml}</div>`;
  }).join('');
}

// ─── TikTok Connection (Zerody Socket.IO) ────────────────────────────────────
function onCredentialChange() { saveToStorage(); }

function parseZerdyUrl(url) {
  url = url || '';
  try {
    const u = new URL(url.trim());
    const username = u.searchParams.get('username') || '';
    const token = u.searchParams.get('token') || '';
    if (username) document.getElementById('username-input').value = username;
    if (token)    document.getElementById('token-input').value    = token;
    saveToStorage();
  } catch (_) { /* still typing */ }
}

function connectTikTok() {
  const rawUser = document.getElementById('username-input').value.trim();
  const username = rawUser.replace(/^@/, '');
  const token    = document.getElementById('token-input').value.trim();

  if (!username) { alert('Digite o @username primeiro.'); return; }

  if (tiktokSocket) {
    tiktokSocket.disconnect();
    tiktokSocket = null;
  }

  setConnStatus('connecting', `Conectando a <b>@${esc(username)}</b>…`);
  addLog('sys', `<span class="ts">${ts()}</span> Conectando ao Zerody para <span class="user">@${esc(username)}</span>…`);

  // Socket.IO – force WebSocket transport to avoid CORS issues with polling
  tiktokSocket = io(ZERODY_URL, { transports: ['websocket'] });

  tiktokSocket.on('connect', () => {
    addLog('sys', `<span class="ts">${ts()}</span> Socket.IO conectado — autenticando @${esc(username)}…`);
    const opts = token ? { bypassToken: token } : {};
    tiktokSocket.emit('setUniqueId', username, opts);
  });

  tiktokSocket.on('tiktokConnected', () => {
    setConnStatus('connected', `<b>@${esc(username)}</b> — ao vivo ✓`);
    addLog('sys', `<span class="ts">${ts()}</span> ✓ Conectado ao TikTok Live de <span class="user">@${esc(username)}</span>`);
    speak(`Conectado ao TikTok Live de ${username}. Bora!`);
    document.getElementById('hdr-conn').textContent = `@${username} ●`;
    document.getElementById('hdr-conn').style.color = 'var(--green)';
  });

  tiktokSocket.on('tiktokDisconnected', (msg) => {
    setConnStatus('error', `Desconectado: ${esc(msg || 'erro')}`);
    addLog('sys', `<span class="ts">${ts()}</span> TikTok desconectado: ${esc(msg || '')}`);
    document.getElementById('hdr-conn').textContent = 'desconectado';
    document.getElementById('hdr-conn').style.color = 'var(--pink)';
  });

  tiktokSocket.on('streamEnd', () => {
    setConnStatus('error', 'Stream encerrada');
    addLog('sys', `<span class="ts">${ts()}</span> 🔴 Stream encerrada`);
  });

  tiktokSocket.on('gift', (data) => {
    const giftName   = data.giftName   || data.gift_name || 'gift';
    const username   = data.uniqueId   || data.username  || '@anon';
    const repeatCount = data.repeatCount || 1;
    // isPending: streak gift not yet finished
    const isPending = data.giftType === 1 && data.repeatEnd === false;
    onGiftReceived(giftName, username, repeatCount, isPending);
  });

  tiktokSocket.on('chat', (data) => {
    const username = data.uniqueId || data.username || '@anon';
    const comment  = data.comment  || data.message  || '';
    onChatReceived(username, comment);
  });

  tiktokSocket.on('like', (data) => {
    const username = data.uniqueId || data.username || '@anon';
    onLikeReceived(username, data.likeCount || 1);
  });

  tiktokSocket.on('roomUser', (data) => {
    if (data && data.viewerCount != null) {
      const v = data.viewerCount.toLocaleString('pt-BR');
      document.getElementById('viewers-count').textContent = `👁 ${v}`;
      document.getElementById('viewers-hdr').textContent   = `👁 ${v}`;
    }
  });

  tiktokSocket.on('connect_error', (err) => {
    setConnStatus('error', `Erro de conexão: ${esc(err.message)}`);
    addLog('sys', `<span class="ts">${ts()}</span> ❌ Erro Socket.IO: ${esc(err.message)}`);
  });

  tiktokSocket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') {
      setConnStatus('error', `Socket desconectado (${esc(reason)})`);
    }
  });
}

function disconnectTikTok() {
  if (tiktokSocket) { tiktokSocket.disconnect(); tiktokSocket = null; }
  setConnStatus('idle', 'Desconectado');
  document.getElementById('hdr-conn').textContent = 'desconectado';
  document.getElementById('hdr-conn').style.color = 'var(--muted)';
  addLog('sys', `<span class="ts">${ts()}</span> Desconectado manualmente`);
}

function setConnStatus(state, text) {
  const dot  = document.getElementById('conn-dot');
  const span = document.getElementById('conn-text');
  const dBtn = document.getElementById('disconnect-btn');
  dot.className = 'conn-dot ' + ({ connecting:'connecting', connected:'connected', error:'error' }[state] || '');
  span.innerHTML = text;
  dBtn.style.display = state === 'connected' ? 'inline-block' : 'none';
}

// ─── Log ──────────────────────────────────────────────────────────────────────
function addLog(type, html) {
  const log = document.getElementById('log');
  const e = document.createElement('div');
  e.className = `log-entry ${type}`;
  e.innerHTML = html;
  log.appendChild(e);
  while (log.children.length > 250) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

function clearLog() { document.getElementById('log').innerHTML = ''; }

// ─── Emulator ─────────────────────────────────────────────────────────────────
async function loadRomFromFile(file) {
  if (!file) return;
  addLog('sys', `<span class="ts">${ts()}</span> Carregando: <b>${esc(file.name)}</b>…`);
  setEmuStatus('Carregando…', false);
  try {
    const buf = await file.arrayBuffer();
    await startEmulator(new Uint8Array(buf), file.name);
  } catch(err) {
    setEmuStatus('Erro', true);
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">Erro ROM: ${esc(err.message)}</span>`);
  }
}

function handleRomDrop(e) {
  e.preventDefault();
  document.getElementById('rom-drop').classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) loadRomFromFile(f);
}

function toggleRomDrop() {
  // Hidden file picker for loading ROM from sidebar button
  const fi = document.createElement('input');
  fi.type = 'file'; fi.accept = '.sfc,.smc,.zip';
  fi.onchange = () => loadRomFromFile(fi.files[0]);
  fi.click();
}

async function startEmulator(romData, fileName) {
  const NJ = window.Nostalgist;
  if (!NJ) {
    const msg = typeof SharedArrayBuffer === 'undefined'
      ? 'SharedArrayBuffer indisponível — abra via localhost ou GitHub Pages (HTTPS), não via file://'
      : 'Nostalgist.js ainda carregando — aguarde 2s e tente de novo';
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">❌ ${esc(msg)}</span>`);
    alert(msg);
    return;
  }

  const screen    = document.getElementById('start-screen');
  const container = document.getElementById('nostalgist-container');

  screen.style.display    = 'none';
  container.style.display = 'block';
  document.getElementById('watermark').style.display = 'block';

  if (nostalgistInstance) {
    try { nostalgistInstance.exit(); } catch(_){}
    nostalgistInstance = null;
    emuReady = false;
    document.getElementById('rewind-btn').style.display = 'none';
  }

  // After exit(), Nostalgist may have renamed the canvas id from
  // 'nostalgist-canvas' to 'canvas', or removed it entirely.
  // Always resolve the canvas after exit to avoid passing null to NJ.snes().
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    container.appendChild(canvas);
  }
  canvas.id = 'nostalgist-canvas';

  try {
    addLog('sys', `<span class="ts">${ts()}</span> Iniciando core SNES para <b>${esc(fileName)}</b>…`);
    nostalgistInstance = await NJ.snes({
      rom: { fileName, fileContent: romData },
      element: canvas,
      size: 'auto',
      retroarchConfig: buildRetroarchConfig(),
    });
    emuReady = true;
    setEmuStatus('Rodando ✓', false, true);
    addLog('sys', `<span class="ts">${ts()}</span> ▶ Emulador rodando: <b>${esc(fileName)}</b>`);
    addLog('sys', `<span class="ts">${ts()}</span> ⏪ Rewind ativo — segure R ou o botão ⏪`);
    speak('Emulador iniciado.');
  } catch(err) {
    console.error('[Nostalgist startEmulator error]', err);
    setEmuStatus('Erro', true);
    container.style.display = 'none';
    document.getElementById('watermark').style.display = 'none';
    screen.style.display = 'flex';
    const msg = err?.message || String(err);
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">❌ Erro emulador: ${esc(msg)}</span>`);
    alert(`Erro ao iniciar emulador:\n${msg}\n\nVeja o console (F12) para detalhes.`);
  }
}

function tryLoadDemo() {
  addLog('sys', `<span class="ts">${ts()}</span> Modo demo. Use os botões de teste!`);
  speak('Modo demo. Carregue uma ROM para jogar de verdade!');
  document.getElementById('start-screen').innerHTML = `
    <div class="crt-logo" style="color:var(--purple)">DEMO MODE</div>
    <p style="color:var(--muted);margin-top:8px">
      Conecte o TikTok na sidebar e use<br>
      <b style="color:var(--green)">Testar Gifts</b> para ver o sistema funcionando.<br><br>
      Carregue uma ROM para jogar.
    </p>
    <div id="rom-drop" onclick="toggleRomDrop()"
         ondragover="event.preventDefault();this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="handleRomDrop(event)"
         style="border:2px dashed var(--border);border-radius:8px;padding:18px;text-align:center;cursor:pointer;font-size:0.78rem;color:var(--muted);width:100%;max-width:320px;margin-top:12px">
      📁 Arraste a ROM aqui
    </div>
  `;
}

// ─── Rewind ───────────────────────────────────────────────────────────────────
let rewindTimer     = null;
let rewindStopTimer = null; // timeout ID para parar o rewind
let rewindStopTs    = 0;    // timestamp (ms) em que o rewind termina (acumulado)
let rewindTotal     = 0;
let slowmoTimer     = null;
let slowmoStopTimer = null; // timeout ID para parar o slow motion
let slowmoStopTs    = 0;    // timestamp (ms) em que o slowmo termina (acumulado)
let slowmoTotal     = 0;
let fastmoTimer     = null;
let fastmoStopTimer = null; // timeout ID para parar o fast forward
let fastmoStopTs    = 0;    // timestamp (ms) em que o fastmo termina (acumulado)
let fastmoTotal     = 0;
let unplugTimer     = null;
let unplugUntil     = 0;    // timestamp (ms) até quando o controle está desplugado
let unplugTotal     = 0;
let mirrorTimer     = null;
let mirrorUntil     = 0;    // timestamp (ms) até quando esquerda/direita estão invertidas
let mirrorTotal     = 0;
let blackoutTimer   = null;
let blackoutStopTs  = 0;    // timestamp (ms) em que o blackout termina (acumulado)
let blackoutTotal   = 0;
let splashTimer     = null;
let splashStopTs    = 0;    // timestamp (ms) em que o splash termina (acumulado)
let splashTotal     = 0;

const EFFECT_DEFS = [
  { key: 'rewind',   icon: '⏪', label: 'REWIND',   color: '#a855f7', getStop: () => rewindStopTs,   getTotal: () => rewindTotal   },
  { key: 'slowmo',   icon: '🐢', label: 'SLOW MO',  color: '#38bdf8', getStop: () => slowmoStopTs,   getTotal: () => slowmoTotal   },
  { key: 'fastmo',   icon: '⚡', label: 'FAST FWD', color: '#fb923c', getStop: () => fastmoStopTs,   getTotal: () => fastmoTotal   },
  { key: 'unplug',   icon: '🎮', label: 'UNPLUG',   color: '#f43f5e', getStop: () => unplugUntil,    getTotal: () => unplugTotal   },
  { key: 'mirror',   icon: '🪞', label: 'MIRROR',   color: '#facc15', getStop: () => mirrorUntil,    getTotal: () => mirrorTotal   },
  { key: 'blackout', icon: '⬛', label: 'BLACKOUT', color: '#94a3b8', getStop: () => blackoutStopTs, getTotal: () => blackoutTotal },
  { key: 'splash',   icon: '💧', label: 'SPLASH',   color: '#06b6d4', getStop: () => splashStopTs,   getTotal: () => splashTotal   },
];

let _effectTimerRaf = null;

function tickEffectTimers() {
  const container = document.getElementById('effect-timers');
  if (!container) { _effectTimerRaf = null; return; }
  const now = Date.now();
  const active = EFFECT_DEFS.filter(d => d.getStop() > now);
  if (active.length === 0) {
    container.style.display = 'none';
    _effectTimerRaf = null;
    return;
  }
  container.style.display = 'flex';
  // Index existing rows by key
  const existing = {};
  for (const row of Array.from(container.children)) existing[row.dataset.key] = row;
  // Remove stale rows
  for (const [key, row] of Object.entries(existing)) {
    if (!active.find(d => d.key === key)) container.removeChild(row);
  }
  // Add/update active rows
  for (const def of active) {
    const rem = Math.max(0, def.getStop() - now);
    const tot = def.getTotal();
    const pct = tot > 0 ? Math.min(100, (rem / tot) * 100) : 100;
    const secs = (rem / 1000).toFixed(1);
    let row = existing[def.key];
    if (!row) {
      row = document.createElement('div');
      row.className = 'effect-timer-row';
      row.dataset.key = def.key;
      row.innerHTML = `<span class="et-icon">${def.icon}</span><span class="et-label">${def.label}</span><div class="et-bar-wrap"><div class="et-bar" style="background:${def.color};width:100%"></div></div><span class="et-secs"></span>`;
      container.appendChild(row);
    }
    row.querySelector('.et-bar').style.width  = pct + '%';
    row.querySelector('.et-secs').textContent = secs + 's';
  }
  _effectTimerRaf = requestAnimationFrame(tickEffectTimers);
}

function startEffectTimerLoop() {
  if (!_effectTimerRaf) _effectTimerRaf = requestAnimationFrame(tickEffectTimers);
}

function startRewind(e) {
  if (e) e.preventDefault();
  if (!emuReady) return;
  const btn    = document.getElementById('rewind-btn');
  const canvas = document.getElementById('canvas') || document.getElementById('nostalgist-canvas');
  const target = emuReady && canvas ? canvas : document.body;
  btn.style.display = 'block';
  btn.classList.add('rewinding');
  if (!rewindTimer) {
    // Só cria o intervalo se não há um rodando
    const props = { ...keyProps('r'), bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent('keydown', props));
    rewindTimer = setInterval(() => target.dispatchEvent(new KeyboardEvent('keydown', props)), 16);
  }
}

function stopRewind() {
  if (rewindStopTimer) { clearTimeout(rewindStopTimer); rewindStopTimer = null; }
  rewindStopTs = 0;
  if (rewindTimer)  { clearInterval(rewindTimer);  rewindTimer  = null; }
  const btn    = document.getElementById('rewind-btn');
  const canvas = document.getElementById('canvas') || document.getElementById('nostalgist-canvas');
  const target = emuReady && canvas ? canvas : document.body;
  btn.classList.remove('rewinding');
  btn.style.display = 'none';
  target.dispatchEvent(new KeyboardEvent('keyup', { ...keyProps('r'), bubbles: true }));
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetGame(username) {
  if (!emuReady || !nostalgistInstance) {
    addLog('sys', `<span class="ts">${ts()}</span> <span style="color:var(--pink)">Reset: emulador não está rodando</span>`);
    return;
  }
  nostalgistInstance.restart();
  flashKey('🔄 RESET!', username || null);
  speak('Jogo reiniciado!');
  addLog('sys', `<span class="ts">${ts()}</span> 🔄 <b>Jogo reiniciado</b>${username ? ' por <span class="user">'+esc(username)+'</span>' : ''}`);
}

function giftRewind(ms) {
  if (!emuReady) return 0;
  const now = Date.now();
  const remaining = rewindStopTs > now ? rewindStopTs - now : 0;
  const total = Math.min(remaining + (ms || 2000), 60000); // acumula, cap 60s
  startRewind();
  if (rewindStopTimer) clearTimeout(rewindStopTimer);
  rewindStopTs    = now + total;
  rewindTotal     = total;
  rewindStopTimer = setTimeout(stopRewind, total);
  startEffectTimerLoop();
  return total;
}

// ─── Slow motion ──────────────────────────────────────────────────────────────
function startSlowmo() {
  if (!emuReady) return;
  const canvas = document.getElementById('canvas') || document.getElementById('nostalgist-canvas');
  const target = emuReady && canvas ? canvas : document.body;
  if (!slowmoTimer) {
    const props = { ...keyProps('e'), bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent('keydown', props));
    slowmoTimer = setInterval(() => target.dispatchEvent(new KeyboardEvent('keydown', props)), 16);
  }
}

function stopSlowmo() {
  if (slowmoStopTimer) { clearTimeout(slowmoStopTimer); slowmoStopTimer = null; }
  slowmoStopTs = 0;
  if (slowmoTimer)  { clearInterval(slowmoTimer);  slowmoTimer  = null; }
  const canvas = document.getElementById('canvas') || document.getElementById('nostalgist-canvas');
  const target = emuReady && canvas ? canvas : document.body;
  target.dispatchEvent(new KeyboardEvent('keyup', { ...keyProps('e'), bubbles: true }));
}

function giftSlowmo(ms) {
  if (!emuReady) return 0;
  const now = Date.now();
  const remaining = slowmoStopTs > now ? slowmoStopTs - now : 0;
  const total = Math.min(remaining + (ms || 5000), 120000); // acumula, cap 120s
  startSlowmo();
  if (slowmoStopTimer) clearTimeout(slowmoStopTimer);
  slowmoStopTs    = now + total;
  slowmoTotal     = total;
  slowmoStopTimer = setTimeout(stopSlowmo, total);
  startEffectTimerLoop();
  return total;
}

function startFastmo() {
  if (!emuReady) return;
  const canvas = document.getElementById('canvas') || document.getElementById('nostalgist-canvas');
  const target = emuReady && canvas ? canvas : document.body;
  if (!fastmoTimer) {
    const props = { ...keyProps('l'), bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent('keydown', props));
    fastmoTimer = setInterval(() => target.dispatchEvent(new KeyboardEvent('keydown', props)), 16);
  }
}

function stopFastmo() {
  if (fastmoStopTimer) { clearTimeout(fastmoStopTimer); fastmoStopTimer = null; }
  fastmoStopTs = 0;
  if (fastmoTimer)  { clearInterval(fastmoTimer);  fastmoTimer  = null; }
  const canvas = document.getElementById('canvas') || document.getElementById('nostalgist-canvas');
  const target = emuReady && canvas ? canvas : document.body;
  target.dispatchEvent(new KeyboardEvent('keyup', { ...keyProps('l'), bubbles: true }));
}

function giftFastmo(ms) {
  if (!emuReady) return 0;
  const now = Date.now();
  const remaining = fastmoStopTs > now ? fastmoStopTs - now : 0;
  const total = Math.min(remaining + (ms || 5000), 120000); // acumula, cap 120s
  startFastmo();
  if (fastmoStopTimer) clearTimeout(fastmoStopTimer);
  fastmoStopTs    = now + total;
  fastmoTotal     = total;
  fastmoStopTimer = setTimeout(stopFastmo, total);
  startEffectTimerLoop();
  return total;
}

function giftUnplug(ms) {
  const now = Date.now();
  const remaining = unplugUntil > now ? unplugUntil - now : 0;
  const total = Math.min(remaining + (ms || 5000), 300000); // acumula, cap 5min
  unplugUntil = now + total;
  unplugTotal = total;
  if (unplugTimer) clearTimeout(unplugTimer);
  unplugTimer = setTimeout(() => { unplugUntil = 0; unplugTimer = null; }, total);
  startEffectTimerLoop();
  const vid    = document.getElementById('unplug-video');
  const canvas = document.getElementById('unplug-canvas');
  if (vid && canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let rafId = null;
    function drawChromaFrame() {
      if (vid.paused || vid.ended) return;
      if (canvas.width !== vid.videoWidth || canvas.height !== vid.videoHeight) {
        canvas.width  = vid.videoWidth;
        canvas.height = vid.videoHeight;
      }
      ctx.drawImage(vid, 0, 0);
      const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d    = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (g > 100 && g > r * 1.4 && g > b * 1.4) d[i+3] = 0;
      }
      ctx.putImageData(img, 0, 0);
      rafId = requestAnimationFrame(drawChromaFrame);
    }
    vid.onended = () => {
      if (rafId) cancelAnimationFrame(rafId);
      canvas.style.display = 'none';
      vid.onended = null;
    };
    vid.currentTime = 0;
    canvas.style.display = 'block';
    vid.play().then(() => { rafId = requestAnimationFrame(drawChromaFrame); }).catch(() => {});
  }
  return total;
}

function giftMirror(ms) {
  const now = Date.now();
  const remaining = mirrorUntil > now ? mirrorUntil - now : 0;
  const total = Math.min(remaining + (ms || 5000), 120000); // acumula, cap 120s
  mirrorUntil = now + total;
  mirrorTotal = total;
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => { mirrorUntil = 0; mirrorTimer = null; }, total);
  startEffectTimerLoop();
  return total;
}

function giftBlackout(ms) {
  const overlay = document.getElementById('blackout-overlay');
  const now = Date.now();
  const remaining = blackoutStopTs > now ? blackoutStopTs - now : 0;
  const total = Math.min(remaining + (ms || 5000), 120000); // acumula, cap 120s
  blackoutStopTs = now + total;
  blackoutTotal  = total;
  if (overlay) overlay.style.display = 'block';
  if (blackoutTimer) clearTimeout(blackoutTimer);
  blackoutTimer = setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
    blackoutTimer = null;
    blackoutStopTs = 0;
  }, total);
  startEffectTimerLoop();
  return total;
}

function drawSplashCanvas(canvas, additive) {
  const w = canvas.offsetWidth  || 256;
  const h = canvas.offsetHeight || 224;
  if (!additive || canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  // Gotas arredondadas
  const drops = Math.floor(8 + Math.random() * 14);
  for (let i = 0; i < drops; i++) {
    const x  = Math.random() * w;
    const y  = Math.random() * h;
    const rx = 8  + Math.random() * 45;
    const ry = rx * (0.55 + Math.random() * 0.5);
    const angle = Math.random() * Math.PI;
    const grad = ctx.createRadialGradient(x - rx * 0.25, y - ry * 0.25, rx * 0.05, x, y, Math.max(rx, ry));
    grad.addColorStop(0,   'rgba(255,255,255,0.45)');
    grad.addColorStop(0.35,'rgba(160,210,255,0.18)');
    grad.addColorStop(1,   'rgba(80,160,220,0.04)');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  // Escorregamentos (drips)
  const drips = Math.floor(2 + Math.random() * 4);
  for (let i = 0; i < drips; i++) {
    const x   = Math.random() * w;
    const y0  = Math.random() * h * 0.6;
    const len = 40 + Math.random() * 90;
    const dx  = (Math.random() - 0.5) * 18;
    const grad = ctx.createLinearGradient(x, y0, x + dx, y0 + len);
    grad.addColorStop(0, 'rgba(200,230,255,0.30)');
    grad.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x + dx, y0 + len);
    ctx.lineWidth = 3 + Math.random() * 7;
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function giftSplash(ms) {
  const overlay = document.getElementById('splash-overlay');
  const canvas  = document.getElementById('splash-canvas');
  const now = Date.now();
  const remaining = splashStopTs > now ? splashStopTs - now : 0;
  const total = Math.min(remaining + (ms || 5000), 120000); // acumula, cap 120s
  splashStopTs = now + total;
  splashTotal  = total;
  if (overlay) overlay.style.display = 'block';
  startEffectTimerLoop();
  if (canvas)  drawSplashCanvas(canvas, remaining > 0); // additive: acumula gotas
  if (splashTimer) clearTimeout(splashTimer);
  splashTimer = setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
    splashTimer  = null;
    splashStopTs = 0;
  }, total);
  return total;
}

function toggleSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const btn       = document.getElementById('sidebar-toggle');
  const collapsed = sidebar.classList.toggle('collapsed');
  // › = sidebar is closed, click to open (arrow points LEFT toward hidden panel)
  // ‹ = sidebar is open,  click to close (arrow points RIGHT toward open panel)
  btn.textContent   = collapsed ? '‹' : '›';
  btn.title         = collapsed ? 'Abrir painel' : 'Fechar painel';
  // Sidebar aberta → sem border-right (mescla com borda da sidebar)
  // Sidebar fechada → com border-right (fecha o contorno da orelha)
  btn.style.borderRight = collapsed ? '1px solid var(--border)' : 'none';
}

function setEmuStatus(msg, isErr, isOn) {
  document.getElementById('emu-status').textContent = 'Emulador: ' + msg;
  const d = document.getElementById('emu-dot');
  d.className = 'sdot' + (isOn ? ' on' : isErr ? ' err' : '');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ts() { return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── Init ─────────────────────────────────────────────────────────────────────
const _btn = document.getElementById('sidebar-toggle');
_btn.textContent = '›';
_btn.style.borderRight = 'none';

// Defer until full DOM is parsed (editor modal comes after this script block)
setTimeout(() => {
  loadFromStorage();
  renderPuTestButtons();
}, 0);


function renderPuTestButtons() {
  const el = document.getElementById('pu-test-btns');
  if (!el) return;
  el.innerHTML = POWERUPS.map((pu, i) =>
    `<button class="btn btn-outline" style="font-size:0.67rem;padding:4px 8px"
             onclick="applyPowerup(${i},'@teste')">${pu.label}</button>`
  ).join('');
}

addLog('sys', `<span class="ts">${ts()}</span> ✓ Sistema carregado`);
addLog('sys', `<span class="ts">${ts()}</span> TTS: ${window.speechSynthesis ? '✓' : '✗ não suportado'}`);
addLog('sys', `<span class="ts">${ts()}</span> Socket.IO: ${typeof io !== 'undefined' ? '✓' : '✗ lib/socket.io.min.js não encontrado'}`);
addLog('sys', `<span class="ts">${ts()}</span> Nostalgist: ${typeof Nostalgist !== 'undefined' ? '✓ ' + (typeof Nostalgist?.snes === 'function' ? 'API ok' : 'API inesperada') : '✗ lib/nostalgist.umd.js não encontrado'}`);
addLog('sys', `<span class="ts">${ts()}</span> SharedArrayBuffer: ${typeof SharedArrayBuffer !== 'undefined' ? '✓' : '✗ — SW ainda registrando, aguarde reload automático'}`);
addLog('sys', `<span class="ts">${ts()}</span> Cole a URL do Zerody e clique Conectar →`);
