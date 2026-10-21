import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';

const MAX_CHARS = 20000;

export async function readResume(file) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  let text;

  if (ext === 'pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(file.buffer));
    ({ text } = await extractText(pdf, { mergePages: true }));
  } else if (ext === 'docx') {
    ({ value: text } = await mammoth.extractRawText({ buffer: file.buffer }));
  } else if (ext === 'txt') {
    text = file.buffer.toString('utf8');
  } else {
    throw new Error('Only PDF, DOCX and TXT files are supported.');
  }

  return clean(text).slice(0, MAX_CHARS);
}

export const clean = (text) =>
  text
    .replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
