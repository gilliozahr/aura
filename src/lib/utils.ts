export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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

export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

const CLOTHING_WORDS = new Set([
  'jacket', 'blazer', 'coat', 'shirt', 'blouse', 'top', 'sweater', 'hoodie',
  'pullover', 'cardigan', 'vest', 'pants', 'jeans', 'trousers', 'shorts',
  'skirt', 'dress', 'suit', 'tuxedo', 'shoes', 'sneakers', 'loafers', 'boots',
  'sandals', 'heels', 'pumps', 'mules', 'oxfords', 'belt', 'bag', 'purse',
  'tote', 'clutch', 'backpack', 'hat', 'cap', 'beanie', 'scarf', 'tie',
  'watch', 'gloves', 'socks', 'underwear', 'bra', 'briefs', 'boxers',
  'swimsuit', 'bikini', 'trunks', 'parka', 'windbreaker', 'raincoat',
  'trenchcoat', 'overcoat', 'peacoat', 'denim', 'linen', 'cotton', 'silk',
  'wool', 'cashmere', 'leather', 'suede', 'velvet', 'tweed', 'chinos',
  'leggings', 'joggers', 'sweatpants', 'sweatshirt', 'turtleneck', 'polo',
  'henley', 'flannel', 'plaid', 'striped', 'printed', 'tailored', 'slim',
  'fitted', 'relaxed', 'oversized', 'cropped', 'wide-leg', 'bootcut',
  'skinny', 'straight', 'flared', 'midi', 'maxi', 'mini', 'bodycon',
  'wrap', 'pinafore', 'romper', 'jumpsuit', 'overalls', 'dungarees',
  'navy', 'camel', 'burgundy', 'olive', 'beige', 'khaki', 'charcoal',
  'ivory', 'cream', 'ecru', 'taupe', 'mustard', 'terracotta', 'cobalt',
  'fragrance', 'perfume', 'cologne', 'sneaker', 'loafer', 'boot',
]);

function isNormalWord(word: string): boolean {
  return /^[a-zA-Z]{3,}$/.test(word) && /[aeiouAEIOU]/.test(word);
}

export function isValidItemName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const nonSpace = trimmed.replace(/\s/g, '');
  if (nonSpace.length === 0) return false;
  const alphaCount = (nonSpace.match(/[a-zA-Z]/g) ?? []).length;
  if (alphaCount / nonSpace.length < 0.6) return false;
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.some(w => CLOTHING_WORDS.has(w))) return true;
  return words.filter(isNormalWord).length >= 2;
}
