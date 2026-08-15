/**
 * Project model helpers: normalisation, filtering, manifest + compatibility.
 */

export const BOARDS = [
  'ESP32',
  'ESP8266',
  'ESP32-S2',
  'ESP32-S3',
  'ESP32-C3',
  'ESP32-C6',
  'ESP32-H2',
  'Arduino Uno',
  'Arduino Nano',
  'Arduino Mega',
];

export const ESP_BOARDS = BOARDS.filter((b) => b.startsWith('ESP'));

export const DEFAULT_CATEGORIES = [
  'Home Automation',
  'Sensors & Monitoring',
  'Robotics',
  'Display & UI',
  'Networking',
  'Audio',
  'Student Projects',
  'Utilities',
];

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export const normaliseOffset = (offset) => {
  if (typeof offset === 'number' && Number.isFinite(offset)) return offset;
  const text = String(offset ?? '').trim().toLowerCase();
  if (!text) return NaN;
  return text.startsWith('0x') ? parseInt(text, 16) : parseInt(text, 10);
};

export const normaliseChip = (chip) =>
  String(chip || '').toLowerCase().replace(/[-_\s]/g, '');

export function isArduinoBoard(board = '') {
  return String(board).toLowerCase().includes('arduino');
}

/** Public-facing shape of a project record. */
export function toPublicProject(project) {
  const { ...rest } = project;
  return rest;
}

export function filterProjects(projects, { search, category, board } = {}) {
  let result = [...projects];

  if (category && category !== 'all') {
    result = result.filter((p) => p.category === category);
  }
  if (board && board !== 'all') {
    result = result.filter((p) =>
      (p.supportedBoards || []).some((b) => normaliseChip(b) === normaliseChip(board))
    );
  }
  if (search) {
    const q = String(search).toLowerCase().trim();
    result = result.filter((p) =>
      [p.name, p.description, p.longDescription, p.category, ...(p.tags || []), ...(p.supportedBoards || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }
  return result;
}

/** Builds an ESP Web Tools-compatible manifest. */
export function buildManifest(project) {
  const fw = project.firmware || {};
  const families = Array.isArray(fw.chipFamily)
    ? fw.chipFamily
    : [fw.chipFamily || project.supportedBoards?.[0] || 'ESP32'];

  return {
    name: project.name,
    version: project.version,
    new_install_prompt_erase: Boolean(fw.eraseAll),
    builds: families.map((family) => ({
      chipFamily: family,
      flashMode: fw.flashMode || 'dio',
      flashFreq: fw.flashFreq || '40m',
      flashSize: fw.flashSize || '4MB',
      parts: (fw.files || []).map((file) => ({
        path: file.path,
        offset: normaliseOffset(file.offset) || 0,
        size: file.size || 0,
      })),
    })),
  };
}

export function checkCompatibility(project, chip) {
  const boards = project.supportedBoards || [];
  if (!chip) {
    return { compatible: null, detectedChip: null, supportedBoards: boards, message: 'No chip supplied.' };
  }
  const compatible = boards.some((b) => normaliseChip(b) === normaliseChip(chip));
  return {
    compatible,
    detectedChip: chip,
    supportedBoards: boards,
    message: compatible
      ? `${chip} is compatible with ${project.name}.`
      : `${chip} is not listed for ${project.name}. Supported: ${boards.join(', ') || 'none'}.`,
  };
}

export const ok = (data, meta) =>
  Response.json(meta ? { success: true, data, meta } : { success: true, data });

export const fail = (error, status = 400) =>
  Response.json({ success: false, error }, { status });
