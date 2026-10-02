export interface PrintOptions {
  paperSize?: 'F4' | 'A4';
  margins?: string;
  delayMs?: number;
}

export function triggerDirectPrint(options: PrintOptions = {}) {
  const { delayMs = 250 } = options;
  setTimeout(() => {
    window.print();
  }, delayMs);
}
