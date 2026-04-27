const encoder = new TextEncoder();

let crcTable = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { dosTime, dosDate };
}

function sanitizeZipSegment(segment) {
  return String(segment || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9._/-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');
}

function sanitizeSlug(value) {
  const slug = sanitizeZipSegment(value || 'generated-app')
    .toLowerCase()
    .replace(/\/+/g, '-');
  return slug || 'generated-app';
}

export function createProjectZipBlob(project) {
  const root = sanitizeSlug(project?.slug || project?.title || 'generated-app');
  const files = Array.isArray(project?.files) ? project.files : [];
  const now = new Date();
  const { dosTime, dosDate } = dosDateTime(now);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const normalizedFiles = files
    .map((file) => {
      const path = sanitizeZipSegment(file?.path || '');
      if (!path || path.endsWith('/')) return null;
      return {
        path: `${root}/${path}`,
        content: typeof file.content === 'string' ? file.content : String(file.content || ''),
      };
    })
    .filter(Boolean);

  for (const file of normalizedFiles) {
    const nameBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const size = contentBytes.length;

    const localHeader = new Uint8Array(30);
    writeU32(localHeader, 0, 0x04034b50);
    writeU16(localHeader, 4, 20);
    writeU16(localHeader, 6, 0);
    writeU16(localHeader, 8, 0);
    writeU16(localHeader, 10, dosTime);
    writeU16(localHeader, 12, dosDate);
    writeU32(localHeader, 14, crc);
    writeU32(localHeader, 18, size);
    writeU32(localHeader, 22, size);
    writeU16(localHeader, 26, nameBytes.length);
    writeU16(localHeader, 28, 0);

    localParts.push(localHeader, nameBytes, contentBytes);

    const centralHeader = new Uint8Array(46);
    writeU32(centralHeader, 0, 0x02014b50);
    writeU16(centralHeader, 4, 20);
    writeU16(centralHeader, 6, 20);
    writeU16(centralHeader, 8, 0);
    writeU16(centralHeader, 10, 0);
    writeU16(centralHeader, 12, dosTime);
    writeU16(centralHeader, 14, dosDate);
    writeU32(centralHeader, 16, crc);
    writeU32(centralHeader, 20, size);
    writeU32(centralHeader, 24, size);
    writeU16(centralHeader, 28, nameBytes.length);
    writeU16(centralHeader, 30, 0);
    writeU16(centralHeader, 32, 0);
    writeU16(centralHeader, 34, 0);
    writeU16(centralHeader, 36, 0);
    writeU32(centralHeader, 38, 0);
    writeU32(centralHeader, 42, offset);
    centralParts.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + contentBytes.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  writeU32(end, 0, 0x06054b50);
  writeU16(end, 4, 0);
  writeU16(end, 6, 0);
  writeU16(end, 8, normalizedFiles.length);
  writeU16(end, 10, normalizedFiles.length);
  writeU32(end, 12, centralSize);
  writeU32(end, 16, centralOffset);
  writeU16(end, 20, 0);

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

export function downloadProjectZip(project) {
  const blob = createProjectZipBlob(project);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeSlug(project?.slug || project?.title || 'generated-app')}.zip`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
