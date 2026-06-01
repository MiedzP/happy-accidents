// Resilient store for the picked image and the generated lesson.
//
// The web build is a single-page app: client-side navigation keeps module
// state, but a FULL page reload (F5) wipes it. To survive that we mirror the
// image's data URI and the lesson to sessionStorage on web. The data URI (not a
// volatile blob: URL) is the canonical image representation — it's what we use
// to build the upload, so the flow can't lose the photo mid-way.

const SS_IMAGE = 'dt_image_data_uri';
const SS_LESSON = 'dt_lesson';

const isWeb =
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

let _uri: string | null = null; // displayable uri (data: on web, file: on native)
let _dataUri: string | null = null; // data: URI used to build the upload (web)
let _lesson: unknown = null;

function ssGet(key: string): string | null {
  if (!isWeb) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function ssSet(key: string, value: string) {
  if (!isWeb) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* quota or privacy mode — fall back to in-memory only */
  }
}

// --- image -----------------------------------------------------------------

export function storeImage(uri: string, dataUri?: string | null) {
  _uri = uri;
  _dataUri = dataUri ?? null;
  if (_dataUri) ssSet(SS_IMAGE, _dataUri);
}

export function getImageUri(): string | null {
  if (_uri) return _uri;
  const recovered = ssGet(SS_IMAGE);
  if (recovered) {
    _uri = recovered;
    _dataUri = recovered;
    return recovered;
  }
  return null;
}

export function getImageDataUri(): string | null {
  if (_dataUri) return _dataUri;
  const recovered = ssGet(SS_IMAGE);
  if (recovered) {
    _dataUri = recovered;
    if (!_uri) _uri = recovered;
    return recovered;
  }
  return null;
}

// --- lesson ----------------------------------------------------------------

export function storeLesson(lesson: unknown) {
  _lesson = lesson;
  try {
    ssSet(SS_LESSON, JSON.stringify(lesson));
  } catch {
    /* non-serializable — keep in memory only */
  }
}

export function getLesson<T = unknown>(): T | null {
  if (_lesson) return _lesson as T;
  const raw = ssGet(SS_LESSON);
  if (raw) {
    try {
      _lesson = JSON.parse(raw);
      return _lesson as T;
    } catch {
      return null;
    }
  }
  return null;
}
