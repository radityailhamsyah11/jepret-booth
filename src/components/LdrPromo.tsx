import { useState } from 'react';
import { ROOM_SIZES, type RoomSize } from '../lib/ldr/config';
import { newRoomCode } from '../lib/ldr/code';
import { enterRoom } from '../store';

/** Landing card: create an LDR room for 2–4 people. */
export function LdrPromo() {
  const [size, setSize] = useState<RoomSize>(2);
  return (
    <section className="ldr-promo" aria-labelledby="ldr-title">
      <div className="ldr-promo-copy">
        <span className="eyebrow"><b>[new]</b> LDR mode · online 2–4 orang</span>
        <h2 className="section-title" id="ldr-title">Foto bareng, <em>walau jauh.</em></h2>
        <p>Bikin room, kirim link ke pasangan atau teman. Kalian saling lihat lewat kamera, countdown jalan barengan, terus jadi satu strip. Video & foto dikirim langsung antar perangkat.</p>
      </div>
      <div className="ldr-promo-act">
        <div className="lab">Berapa orang?</div>
        <div className="seg" role="radiogroup" aria-label="Jumlah orang">
          {ROOM_SIZES.map(n => <button key={n} role="radio" aria-checked={size === n} aria-pressed={size === n} onClick={() => setSize(n)}>{n} orang</button>)}
        </div>
        <button className="btn primary big" onClick={() => enterRoom(newRoomCode(), true, size)}>Bikin room →</button>
      </div>
    </section>
  );
}
