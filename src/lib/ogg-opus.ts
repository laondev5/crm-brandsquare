/**
 * Repackaging a browser's voice recording as something WhatsApp will carry.
 *
 * WhatsApp takes Ogg/Opus audio. Chrome and Edge record Opus too, but wrapped
 * in WebM, which WhatsApp refuses outright — so the recording arrives in the
 * right codec and the wrong box. Both containers hold the identical Opus
 * packets, so this takes them out of one and puts them in the other: no
 * decoding, no re-encoding, no loss, and no ffmpeg on the server.
 *
 * Firefox can record Ogg directly and Safari records MP4, both of which
 * WhatsApp accepts as they are; this path exists for the Chrome family, which
 * is what most of the team uses.
 */

/* ---------------- Ogg framing ---------------- */

/** Ogg's CRC is its own: polynomial 0x04c11db7, no reflection, no final xor,
 *  so none of the usual CRC-32 helpers produce the right answer. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = (i << 24) >>> 0;
    for (let bit = 0; bit < 8; bit++) {
      r = r & 0x80000000 ? (((r << 1) >>> 0) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0;
    }
    table[i] = r >>> 0;
  }
  return table;
})();

function oggCrc(buf: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < buf.length; i++) {
    crc = (((crc << 8) >>> 0) ^ CRC_TABLE[((crc >>> 24) ^ buf[i]) & 0xff]) >>> 0;
  }
  return crc >>> 0;
}

function writeU32(buf: Uint8Array, at: number, value: number) {
  buf[at] = value & 0xff;
  buf[at + 1] = (value >>> 8) & 0xff;
  buf[at + 2] = (value >>> 16) & 0xff;
  buf[at + 3] = (value >>> 24) & 0xff;
}

/** Granule positions are 64-bit. A recording long enough to overflow 32 bits
 *  is 24 hours of audio, but the field is still written in full. */
function writeU64(buf: Uint8Array, at: number, value: number) {
  const low = value % 4294967296;
  const high = Math.floor(value / 4294967296);
  writeU32(buf, at, low);
  writeU32(buf, at + 4, high);
}

const BOS = 0x02;
const EOS = 0x04;

class OggStream {
  private pages: Uint8Array[] = [];
  private seq = 0;
  private serial: number;

  constructor(serial: number) {
    this.serial = serial;
  }

  /** One page, holding whole packets. Ogg allows a packet to span pages, but
   *  nothing here produces a packet longer than a page's 255 segments. */
  page(packets: Uint8Array[], granule: number, flags: number) {
    const segments: number[] = [];
    for (const packet of packets) {
      let left = packet.length;
      while (left >= 255) {
        segments.push(255);
        left -= 255;
      }
      segments.push(left);
    }

    const bodyLength = packets.reduce((sum, p) => sum + p.length, 0);
    const headerLength = 27 + segments.length;
    const page = new Uint8Array(headerLength + bodyLength);

    page[0] = 0x4f; // O
    page[1] = 0x67; // g
    page[2] = 0x67; // g
    page[3] = 0x53; // S
    page[4] = 0; // stream structure version
    page[5] = flags;
    writeU64(page, 6, granule);
    writeU32(page, 14, this.serial);
    writeU32(page, 18, this.seq++);
    // 22..25 is the checksum, which is computed over the page with those four
    // bytes left as zero — so it is filled in last.
    page[26] = segments.length;
    page.set(segments, 27);

    let at = headerLength;
    for (const packet of packets) {
      page.set(packet, at);
      at += packet.length;
    }

    writeU32(page, 22, oggCrc(page));
    this.pages.push(page);
  }

  done(): Uint8Array<ArrayBuffer> {
    const total = this.pages.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const p of this.pages) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  }
}

/* ---------------- Opus packets ---------------- */

/**
 * How many samples (at 48 kHz) one packet plays for, read from its first byte.
 *
 * Needed because Ogg pages carry a running sample count and WebM carries
 * millisecond timestamps instead; a player with wrong granule positions
 * reports the wrong length and seeks to the wrong place.
 */
export function opusPacketSamples(packet: Uint8Array): number {
  if (packet.length < 1) return 0;
  const toc = packet[0];
  const config = toc >> 3;
  const code = toc & 0x03;

  const ms =
    config < 12
      ? [10, 20, 40, 60][config & 0x03] // SILK
      : config < 16
        ? [10, 20][config & 0x01] // hybrid
        : [2.5, 5, 10, 20][config & 0x03]; // CELT

  let frames = 1;
  if (code === 1 || code === 2) frames = 2;
  else if (code === 3) frames = packet.length > 1 ? packet[1] & 0x3f : 1;

  return Math.round(ms * frames * 48);
}

/** The identification header, when the recording carries no CodecPrivate of
 *  its own. 3840 is the pre-skip Chrome's encoder uses. */
function opusHead(channels: number): Uint8Array {
  const head = new Uint8Array(19);
  head.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0); // OpusHead
  head[8] = 1; // version
  head[9] = channels;
  head[10] = 3840 & 0xff; // pre-skip, little endian
  head[11] = (3840 >> 8) & 0xff;
  writeU32(head, 12, 48000); // original sample rate
  head[16] = 0; // output gain
  head[17] = 0;
  head[18] = 0; // channel mapping family
  return head;
}

function opusTags(): Uint8Array {
  const vendor = new TextEncoder().encode("brandsquare-crm");
  const tags = new Uint8Array(8 + 4 + vendor.length + 4);
  tags.set([0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73], 0); // OpusTags
  writeU32(tags, 8, vendor.length);
  tags.set(vendor, 12);
  writeU32(tags, 12 + vendor.length, 0); // no comments
  return tags;
}

/* ---------------- WebM (Matroska) reading ---------------- */

const ID_SEGMENT = 0x18538067;
const ID_TRACKS = 0x1654ae6b;
const ID_TRACK_ENTRY = 0xae;
const ID_CODEC_PRIVATE = 0x63a2;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;
const ID_CLUSTER = 0x1f43b675;
const ID_BLOCK_GROUP = 0xa0;
const ID_SIMPLE_BLOCK = 0xa3;
const ID_BLOCK = 0xa1;
const ID_DISCARD_PADDING = 0x75a2;

/** Elements that hold other elements. A live recording leaves the Segment and
 *  Cluster sizes unknown, so their contents have to be walked rather than
 *  skipped over — which means knowing which ids to descend into. */
const MASTERS = new Set<number>([
  0x1a45dfa3, // EBML header
  ID_SEGMENT,
  0x114d9b74, // SeekHead
  0x1549a966, // Info
  ID_TRACKS,
  ID_TRACK_ENTRY,
  0xe0, // Video
  0xe1, // Audio
  0x6d80, // ContentEncodings
  ID_CLUSTER,
  ID_BLOCK_GROUP,
  0x1c53bb6b, // Cues
  0x1254c367, // Tags
]);

class Reader {
  at = 0;
  buf: Uint8Array;

  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  get done() {
    return this.at >= this.buf.length;
  }

  /** An element id, marker bits and all — ids are compared as written. */
  id(): number {
    const first = this.buf[this.at];
    if (first === undefined) throw new Error("truncated");
    let width = 0;
    for (let bit = 7; bit >= 0; bit--) {
      if (first & (1 << bit)) {
        width = 8 - bit;
        break;
      }
    }
    if (width < 1 || width > 4) throw new Error("not a WebM element id");
    let value = 0;
    for (let i = 0; i < width; i++) value = value * 256 + this.buf[this.at + i];
    this.at += width;
    return value;
  }

  /** A size, with the marker bit stripped. All-ones means unknown, which is
   *  how a browser writes a container it is still appending to. */
  size(): number | null {
    const first = this.buf[this.at];
    if (first === undefined) throw new Error("truncated");
    let width = 0;
    for (let bit = 7; bit >= 0; bit--) {
      if (first & (1 << bit)) {
        width = 8 - bit;
        break;
      }
    }
    if (width < 1 || width > 8) throw new Error("not a WebM size");
    let value = first & ((1 << (8 - width)) - 1);
    let unknown = value === (1 << (8 - width)) - 1;
    for (let i = 1; i < width; i++) {
      const byte = this.buf[this.at + i];
      if (byte !== 0xff) unknown = false;
      value = value * 256 + byte;
    }
    this.at += width;
    return unknown ? null : value;
  }

  /** A track number inside a block: the same encoding as a size. */
  vint(): number {
    const size = this.size();
    return size === null ? 0 : size;
  }
}

/** The frames in one SimpleBlock or Block, lacing unpicked. */
function blockFrames(block: Uint8Array): Uint8Array[] {
  const r = new Reader(block);
  r.vint(); // track number
  r.at += 2; // timecode, which Ogg does not need: granules are counted instead
  const flags = block[r.at];
  r.at += 1;

  const lacing = (flags >> 1) & 0x03;
  const rest = block.subarray(r.at);
  if (lacing === 0) return [rest];

  const count = rest[0] + 1;
  let at = 1;
  const sizes: number[] = [];

  if (lacing === 2) {
    // Fixed: every frame the same size.
    const each = (rest.length - at) / count;
    if (!Number.isInteger(each)) throw new Error("bad fixed lacing");
    for (let i = 0; i < count; i++) sizes.push(each);
  } else if (lacing === 1) {
    // Xiph: 255-and-remainder, per frame, for all but the last.
    for (let i = 0; i < count - 1; i++) {
      let size = 0;
      while (rest[at] === 255) {
        size += 255;
        at++;
      }
      size += rest[at];
      at++;
      sizes.push(size);
    }
  } else {
    // EBML: the first size outright, then signed differences.
    const sub = new Reader(rest);
    sub.at = at;
    let size = sub.vint();
    sizes.push(size);
    for (let i = 1; i < count - 1; i++) {
      const before = sub.at;
      const width = (() => {
        const first = rest[sub.at];
        for (let bit = 7; bit >= 0; bit--) if (first & (1 << bit)) return 8 - bit;
        throw new Error("bad EBML lacing");
      })();
      const raw = sub.vint();
      // A signed vint is biased by half its range.
      const bias = Math.pow(2, 7 * width - 1) - 1;
      size += raw - bias;
      sizes.push(size);
      if (sub.at === before) throw new Error("bad EBML lacing");
    }
    at = sub.at;
  }

  const frames: Uint8Array[] = [];
  let taken = 0;
  for (const size of sizes) {
    frames.push(rest.subarray(at + taken, at + taken + size));
    taken += size;
  }
  // The last frame's size is whatever is left, except under fixed lacing where
  // every size is already known.
  if (lacing !== 2) frames.push(rest.subarray(at + taken));
  return frames.filter((f) => f.length > 0);
}

function readFloat(buf: Uint8Array): number {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length === 4) return view.getFloat32(0);
  if (buf.length === 8) return view.getFloat64(0);
  return 0;
}

function readUint(buf: Uint8Array): number {
  let value = 0;
  for (const byte of buf) value = value * 256 + byte;
  return value;
}

/** Matroska writes DiscardPadding signed, and it is negative often enough in
 *  the wild to be worth reading properly rather than as a magnitude. */
function readInt(buf: Uint8Array): number {
  if (buf.length === 0) return 0;
  let value = readUint(buf);
  const limit = Math.pow(2, 8 * buf.length - 1);
  if (value >= limit) value -= limit * 2;
  return value;
}

/**
 * Every Opus packet in the recording, in order, with the two facts needed to
 * finish the file: the identification header, and how long the audio really is.
 *
 * The last point matters more than it looks. An encoder pads its final packet
 * out to a whole frame, and each container says to ignore that padding in its
 * own way -- WebM through a duration, Ogg through the granule position of its
 * last page. Carry the packets across without carrying that across too, and
 * the voice note ends with a fraction of a second of silence that was never
 * recorded.
 */
function readWebm(buf: Uint8Array): {
  packets: Uint8Array[];
  codecPrivate: Uint8Array | null;
  durationSamples: number;
  discardSamples: number;
} {
  const packets: Uint8Array[] = [];
  let codecPrivate: Uint8Array | null = null;
  let timecodeScale = 1000000; // one millisecond, Matroska's default
  let durationTicks = 0;
  let discardNs = 0;

  const walk = (from: number, to: number) => {
    const r = new Reader(buf);
    r.at = from;
    while (r.at < to && !r.done) {
      const start = r.at;
      let id: number;
      let size: number | null;
      try {
        id = r.id();
        size = r.size();
      } catch {
        return; // a recording cut off mid-element: keep what was read
      }
      if (r.at === start) return;

      const end = size === null ? to : Math.min(r.at + size, to);

      if (MASTERS.has(id)) {
        walk(r.at, end);
        r.at = size === null ? to : end;
        continue;
      }
      if (size === null) return; // a leaf of unknown length is unreadable

      if (id === ID_CODEC_PRIVATE && !codecPrivate) {
        codecPrivate = buf.subarray(r.at, end);
      } else if (id === ID_TIMECODE_SCALE) {
        timecodeScale = readUint(buf.subarray(r.at, end)) || timecodeScale;
      } else if (id === ID_DURATION) {
        durationTicks = readFloat(buf.subarray(r.at, end));
      } else if (id === ID_DISCARD_PADDING) {
        // How much of a block is the encoder's padding rather than recorded
        // sound. Normally only on the last one.
        const ns = readInt(buf.subarray(r.at, end));
        if (ns > 0) discardNs += ns;
      } else if (id === ID_SIMPLE_BLOCK || id === ID_BLOCK) {
        for (const frame of blockFrames(buf.subarray(r.at, end))) packets.push(frame);
      }
      r.at = end;
    }
  };

  walk(0, buf.length);

  // A recording still being written carries no duration at all, and then the
  // packets are all there is to go on.
  const durationSamples = durationTicks > 0
    ? Math.round((durationTicks * timecodeScale) / 1e9 * 48000)
    : 0;

  return {
    packets,
    codecPrivate,
    durationSamples,
    discardSamples: Math.round((discardNs / 1e9) * 48000),
  };
}

/* ---------------- the conversion ---------------- */

/**
 * Turns a WebM/Opus recording into an Ogg/Opus file byte for byte identical in
 * audio. Throws when the input is not what it claims to be, so the caller can
 * say so rather than sending a file WhatsApp will reject.
 */
export function webmOpusToOgg(input: Uint8Array): Uint8Array<ArrayBuffer> {
  const { packets, codecPrivate, durationSamples, discardSamples } = readWebm(input);
  if (packets.length === 0) {
    throw new Error("That recording had no audio in it.");
  }

  // Chrome writes the OpusHead as CodecPrivate; anything else gets a
  // synthesized mono one, which is what a voice note is anyway.
  const isOpusHead =
    codecPrivate !== null &&
    codecPrivate.length >= 19 &&
    codecPrivate[0] === 0x4f &&
    codecPrivate[1] === 0x70 &&
    codecPrivate[2] === 0x75 &&
    codecPrivate[3] === 0x73;
  const head = isOpusHead ? codecPrivate! : opusHead(1);
  const preSkip = head[10] + (head[11] << 8);

  const ogg = new OggStream(0x42535100 | 0x51); // any value; one stream per file
  ogg.page([head], 0, BOS);
  ogg.page([opusTags()], 0, 0);

  const played = packets.reduce((sum, p) => sum + opusPacketSamples(p), 0);

  // Where the audio really ends. DiscardPadding says so exactly and is what a
  // finished recording carries; a duration is the next best thing; a recording
  // with neither keeps its few milliseconds of padding, which nobody can hear.
  const real =
    discardSamples > 0 && discardSamples < played
      ? played - discardSamples
      : durationSamples > 0 && durationSamples < played
        ? durationSamples
        : played;
  const ends = preSkip + real;

  let granule = preSkip;
  let flushed = preSkip;
  let batch: Uint8Array[] = [];
  let segments = 0;

  for (let i = 0; i < packets.length; i++) {
    const packet = packets[i];
    const needed = Math.floor(packet.length / 255) + 1;
    const last = i === packets.length - 1;

    // The first audio page's granule is defined as its own samples plus the
    // pre-skip, so a trim written there reads as trimming the start instead --
    // and a short recording would otherwise fit in one page and mean both at
    // once. Giving the final packet a page of its own keeps them apart. Page
    // boundaries carry no meaning beyond this, so nothing is lost by it.
    const wouldConflict = last && ends < preSkip + played && flushed === preSkip && batch.length > 0;

    if (segments + needed > 255 || wouldConflict) {
      ogg.page(batch, granule, 0);
      flushed = granule;
      batch = [];
      segments = 0;
    }
    batch.push(packet);
    segments += needed;
    granule += opusPacketSamples(packet);

    // Granules never go backwards, so a trim reaches back no further than the
    // page before this one.
    if (last) ogg.page(batch, Math.max(ends, flushed), EOS);
  }

  return ogg.done();
}

/** Whether a recording needs the treatment above before it can be sent. */
export function needsRepackaging(mime: string): boolean {
  return /^(audio|video)\/webm/i.test(mime.trim());
}
