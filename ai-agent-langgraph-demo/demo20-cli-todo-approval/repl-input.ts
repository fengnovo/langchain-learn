export interface ReplBuffer {
  value: string;
  /** UTF-16 offset. It is always kept on a grapheme boundary. */
  cursor: number;
}

export interface ReplKey {
  ctrl?: boolean;
  meta?: boolean;
  backspace?: boolean;
  delete?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function previousBoundary(value: string, cursor: number): number {
  let previous = 0;
  for (const segment of graphemeSegmenter.segment(value)) {
    if (segment.index >= cursor) break;
    previous = segment.index;
  }
  return previous;
}

function nextBoundary(value: string, cursor: number): number {
  for (const segment of graphemeSegmenter.segment(value)) {
    if (segment.index > cursor) return segment.index;
  }
  return value.length;
}

/**
 * Apply one Ink `useInput` event to the editable REPL buffer.
 *
 * Ink 5 reports the ASCII DEL byte (`\x7f`) as `key.delete`. Most terminals
 * send that byte for Backspace, so both `backspace` and `delete` must erase the
 * grapheme before the cursor. Ctrl+D remains available for forward deletion.
 */
export function editReplBuffer(current: ReplBuffer, input: string, key: ReplKey): ReplBuffer {
  const cursor = Math.max(0, Math.min(current.value.length, current.cursor));

  if (key.leftArrow) {
    return { ...current, cursor: previousBoundary(current.value, cursor) };
  }
  if (key.rightArrow) {
    return { ...current, cursor: nextBoundary(current.value, cursor) };
  }
  if (key.upArrow) {
    return { ...current, cursor: 0 };
  }
  if (key.downArrow) {
    return { ...current, cursor: current.value.length };
  }
  if (key.ctrl && input === 'd') {
    const end = nextBoundary(current.value, cursor);
    return {
      value: current.value.slice(0, cursor) + current.value.slice(end),
      cursor,
    };
  }
  if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
    if (cursor === 0) return { ...current, cursor };
    const start = previousBoundary(current.value, cursor);
    return {
      value: current.value.slice(0, start) + current.value.slice(cursor),
      cursor: start,
    };
  }
  if (input && !key.ctrl && !key.meta && input >= ' ') {
    return {
      value: current.value.slice(0, cursor) + input + current.value.slice(cursor),
      cursor: cursor + input.length,
    };
  }

  return { ...current, cursor };
}

/** Split the buffer around the grapheme rendered as the block cursor. */
export function splitReplCursor(buffer: ReplBuffer): {
  before: string;
  cursorText: string;
  after: string;
} {
  const cursor = Math.max(0, Math.min(buffer.value.length, buffer.cursor));
  const end = nextBoundary(buffer.value, cursor);
  return {
    before: buffer.value.slice(0, cursor),
    cursorText: buffer.value.slice(cursor, end) || ' ',
    after: buffer.value.slice(end),
  };
}
