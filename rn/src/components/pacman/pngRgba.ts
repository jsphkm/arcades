const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c = CRC_TABLE[(c ^ data[i]) & 255] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i += 1) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const t = new Uint8Array([
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  ]);
  const body = concat([t, data]);
  return concat([u32be(data.length), body, u32be(crc32(body))]);
}

function zlibStore(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  let offset = 0;
  while (offset < data.length || offset === 0) {
    const n = Math.min(65535, data.length - offset);
    const last = offset + n >= data.length ? 1 : 0;
    const header = new Uint8Array(5);
    header[0] = last;
    header[1] = n & 255;
    header[2] = (n >>> 8) & 255;
    const nlen = ~n & 0xffff;
    header[3] = nlen & 255;
    header[4] = (nlen >>> 8) & 255;
    parts.push(header);
    if (n) parts.push(data.subarray(offset, offset + n));
    offset += n;
    if (data.length === 0) break;
  }
  parts.push(u32be(adler32(data)));
  return concat(parts);
}

function toBase64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return out;
}

export function rgbaToPngDataUri(
  rgba: Uint8Array,
  width: number,
  height: number,
): string {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const di = y * (stride + 1);
    raw[di] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), di + 1);
  }
  const ihdr = concat([
    u32be(width),
    u32be(height),
    new Uint8Array([8, 6, 0, 0, 0]),
  ]);
  const png = concat([
    PNG_SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibStore(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
  return `data:image/png;base64,${toBase64(png)}`;
}
