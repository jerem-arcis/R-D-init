// Mock client local — remplace l'ancien base44 SDK.
// Persiste les données dans localStorage. À remplacer par Dataverse plus tard.

const STORAGE_PREFIX = 'mock_db_';

const uid = () =>
  (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const load = (name) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (name, rows) => {
  localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(rows));
};

const matchFilter = (row, filter) =>
  Object.entries(filter).every(([k, v]) => row[k] === v);

const sortRows = (rows, orderBy) => {
  if (!orderBy) return rows;
  const desc = orderBy.startsWith('-');
  const key = desc ? orderBy.slice(1) : orderBy;
  return [...rows].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return desc ? (av < bv ? 1 : -1) : (av < bv ? -1 : 1);
  });
};

const createEntity = (name) => ({
  list: async (orderBy) => sortRows(load(name), orderBy),
  filter: async (filter, orderBy) => {
    const rows = load(name).filter((r) => matchFilter(r, filter));
    return sortRows(rows, orderBy);
  },
  get: async (id) => load(name).find((r) => r.id === id) || null,
  create: async (data) => {
    const rows = load(name);
    const now = new Date().toISOString();
    const row = { id: uid(), created_date: now, updated_date: now, ...data };
    rows.push(row);
    save(name, rows);
    return row;
  },
  update: async (id, data) => {
    const rows = load(name);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`${name} ${id} not found`);
    const updated = { ...rows[idx], ...data, updated_date: new Date().toISOString() };
    rows[idx] = updated;
    save(name, rows);
    return updated;
  },
  delete: async (id) => {
    const rows = load(name).filter((r) => r.id !== id);
    save(name, rows);
    return { success: true };
  },
});

const MOCK_USER = {
  id: 'mock-user-1',
  email: 'demo@boncolac.local',
  full_name: 'Demo User',
  role: 'admin',
};

const noop = async () => {};

export const base44 = {
  entities: {
    FicheLancement: createEntity('FicheLancement'),
    DemandeEtude: createEntity('DemandeEtude'),
    CodeEAN: createEntity('CodeEAN'),
    Query: createEntity('Query'),
  },
  auth: {
    me: async () => MOCK_USER,
    logout: () => {},
    redirectToLogin: () => {},
  },
  appLogs: {
    logUserInApp: noop,
  },
  integrations: {
    Core: {
      InvokeLLM: noop,
      SendEmail: noop,
      SendSMS: noop,
      UploadFile: noop,
      GenerateImage: noop,
      ExtractDataFromUploadedFile: noop,
    },
  },
};
