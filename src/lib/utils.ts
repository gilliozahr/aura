export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function scoreClass(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 80) return 'good';
  if (score >= 55) return 'warn';
  return 'bad';
}

export function fileToDataURL(file: File | null): Promise<string> {
  return new Promise(resolve => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}
