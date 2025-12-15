import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Clock, Coffee, Hand, Hash, Package, PawPrint, Search, Smile, X } from 'lucide-react';

const RECENTS_KEY = 'fluxcore_recent_emojis_v1';
const MAX_RECENTS = 24;

type EmojiCategoryKey = 'recents' | 'smileys' | 'gestures' | 'animals' | 'food' | 'objects' | 'symbols';

type EmojiCategory = {
  key: EmojiCategoryKey;
  label: string;
  icon: 'clock' | 'smileys' | 'gestures' | 'animals' | 'food' | 'objects' | 'symbols';
  emojis: string[];
};

const EMOJI_KEYWORDS: Record<string, string[]> = {
  '😀': ['feliz', 'sonrisa', 'cara', 'happy', 'smile'],
  '😁': ['feliz', 'sonrisa', 'cara', 'happy', 'smile'],
  '😂': ['risa', 'gracioso', 'laugh', 'lol'],
  '🤣': ['risa', 'gracioso', 'laugh', 'lol'],
  '😊': ['feliz', 'sonrisa', 'amable', 'smile'],
  '😍': ['amor', 'corazon', 'enamorado', 'love'],
  '😘': ['beso', 'amor', 'kiss', 'love'],
  '😅': ['nervioso', 'sudor', 'relief'],
  '😎': ['cool', 'lentes', 'gafas'],
  '🤔': ['pensar', 'duda', 'thinking'],
  '😴': ['dormir', 'sueño', 'sleep'],
  '😭': ['triste', 'llorar', 'sad', 'cry'],
  '😡': ['enojo', 'enojado', 'angry'],
  '🥳': ['fiesta', 'celebrar', 'party'],
  '👍': ['ok', 'bien', 'like', 'pulgar'],
  '👎': ['mal', 'dislike', 'pulgar'],
  '👏': ['aplausos', 'clap'],
  '🙏': ['gracias', 'rezar', 'please', 'pray'],
  '🤝': ['acuerdo', 'saludo', 'handshake'],
  '✌️': ['paz', 'victoria', 'peace'],
  '👌': ['ok', 'perfecto'],
  '🫶': ['amor', 'corazon', 'hands'],
  '🐶': ['perro', 'dog'],
  '🐱': ['gato', 'cat'],
  '🐼': ['panda'],
  '🦊': ['zorro', 'fox'],
  '🍔': ['hamburguesa', 'burger'],
  '🍟': ['papas', 'fries'],
  '🍕': ['pizza'],
  '🌮': ['taco'],
  '🍣': ['sushi'],
  '☕': ['cafe', 'coffee'],
  '📌': ['pin', 'chinche'],
  '📎': ['clip', 'adjunto', 'attachment'],
  '📷': ['camara', 'foto', 'camera'],
  '🎧': ['audio', 'musica', 'headphones'],
  '💻': ['computadora', 'pc', 'laptop'],
  '📱': ['telefono', 'celular', 'mobile'],
  '✅': ['ok', 'check'],
  '❌': ['no', 'x', 'cancel'],
  '⚠️': ['advertencia', 'warning'],
  '⭐': ['estrella', 'star'],
  '❤️': ['amor', 'corazon', 'love'],
  '🔥': ['fuego', 'fire'],
  '🎉': ['celebrar', 'fiesta', 'party'],
};

const CATEGORIES: EmojiCategory[] = [
  {
    key: 'recents',
    label: 'Recientes',
    icon: 'clock',
    emojis: [],
  },
  {
    key: 'smileys',
    label: 'Caras',
    icon: 'smileys',
    emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😅', '😎', '🤔', '😴', '😭', '😡', '🤯', '🥳'],
  },
  {
    key: 'gestures',
    label: 'Gestos',
    icon: 'gestures',
    emojis: ['👍', '👎', '👏', '🙏', '🤝', '✌️', '🤟', '👌', '🤌', '🫶'],
  },
  {
    key: 'animals',
    label: 'Animales',
    icon: 'animals',
    emojis: ['🐶', '🐱', '🐭', '🐼', '🦊', '🐻', '🐨', '🦁', '🐮', '🐸', '🐵'],
  },
  {
    key: 'food',
    label: 'Comida',
    icon: 'food',
    emojis: ['🍔', '🍟', '🍕', '🌮', '🍣', '🍩', '🍪', '🍫', '🍎', '🍓', '🍉', '☕'],
  },
  {
    key: 'objects',
    label: 'Objetos',
    icon: 'objects',
    emojis: ['📌', '📎', '📷', '🎧', '💡', '🔒', '🧾', '🧠', '💻', '📱'],
  },
  {
    key: 'symbols',
    label: 'Símbolos',
    icon: 'symbols',
    emojis: ['✅', '❌', '⚠️', '⭐', '💬', '❤️', '💙', '💚', '🔥', '🎉'],
  },
];

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => typeof e === 'string');
  } catch {
    return [];
  }
}

function writeRecents(items: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items));
  } catch {
    return;
  }
}

function iconForCategory(category: EmojiCategory) {
  switch (category.key) {
    case 'recents':
      return Clock;
    case 'smileys':
      return Smile;
    case 'gestures':
      return Hand;
    case 'animals':
      return PawPrint;
    case 'food':
      return Coffee;
    case 'objects':
      return Package;
    case 'symbols':
      return Hash;
    default:
      return Clock;
  }
}

export function EmojiPanel(props: { open: boolean; onSelect: (emoji: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState<EmojiCategoryKey>('recents');
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    if (!props.open) return;
    setRecents(readRecents());
    setActiveCategory('recents');
    setQuery('');
  }, [props.open]);

  const categoriesWithRecents = useMemo(() => {
    return CATEGORIES.map((c) => (c.key === 'recents' ? { ...c, emojis: recents } : c));
  }, [recents]);

  const activeEmojis = useMemo(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length > 0) {
      const tokens = normalizedQuery
        .toLocaleLowerCase()
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
      const all = Array.from(
        new Set(categoriesWithRecents.filter((c) => c.key !== 'recents').flatMap((c) => c.emojis))
      );

      if (tokens.length === 0) return all;

      return all.filter((emoji) => {
        const keywords = (EMOJI_KEYWORDS[emoji] ?? []).map((k) => k.toLocaleLowerCase());
        if (tokens.some((t) => t === emoji)) return true;
        return tokens.every((t) => keywords.some((k) => k.includes(t)));
      });
    }

    const category = categoriesWithRecents.find((c) => c.key === activeCategory);
    return category?.emojis ?? [];
  }, [activeCategory, categoriesWithRecents, query]);

  if (!props.open) return null;

  return (
    <div className="absolute left-0 right-0 bottom-full mb-2">
      <div className="bg-surface border border-default rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="w-full bg-active border border-subtle rounded-full h-10 pl-10 pr-3 text-sm text-primary placeholder:text-muted focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="w-10 h-10 rounded-full border border-default bg-surface hover:bg-hover transition-colors flex items-center justify-center text-secondary"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto">
          {categoriesWithRecents.map((c) => {
            const Icon = iconForCategory(c);
            const isActive = c.key === activeCategory;
            const disabled = c.key === 'recents' && c.emojis.length === 0;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  setActiveCategory(c.key);
                  setQuery('');
                }}
                disabled={disabled}
                className={clsx(
                  'h-10 px-3 rounded-full border transition-colors flex items-center gap-2 flex-shrink-0',
                  disabled
                    ? 'bg-active border-default text-muted cursor-not-allowed opacity-60'
                    : isActive
                      ? 'bg-elevated border-strong text-primary'
                      : 'bg-surface border-default text-secondary hover:bg-hover hover:text-primary'
                )}
                title={c.label}
              >
                <Icon size={16} className={clsx(isActive ? 'text-primary' : 'text-muted')} />
                <span className="text-xs">{c.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          {activeEmojis.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">No hay resultados</div>
          ) : (
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
              {activeEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    const nextRecents = [emoji, ...recents.filter((e) => e !== emoji)].slice(0, MAX_RECENTS);
                    setRecents(nextRecents);
                    writeRecents(nextRecents);
                    props.onSelect(emoji);
                  }}
                  className="h-9 w-9 rounded-lg hover:bg-hover transition-colors flex items-center justify-center text-xl"
                  aria-label={`Emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
