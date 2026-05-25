"use client";

import { useEffect, useRef } from "react";

const CATEGORIES = [
  {
    label: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","🤣","😂","🙂","😉","😊","😇",
      "🥰","😍","🤩","😘","😋","😛","😜","🤪","😝","🤑",
      "🤗","🤭","🤔","🤐","😑","😶","😏","😒","🙄","😬",
      "😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮",
      "🤧","🥵","🥶","😵","🤯","🤠","🥳","🥸","😎","🤓",
      "🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😢",
      "😭","😤","😡","🤬","😈","👿","💀","☠️","💩","🤡",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲",
      "🤝","🙏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
      "🖕","👇","☝️","💪","🦾","🦵","🦶","👀","👁️","👅",
      "👋","🖐️","✋",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "🎉","🎊","🎈","🎁","🏆","🥇","🥈","🥉","⚽","🏀",
      "🎮","🎯","🎲","🎨","📚","📝","✏️","📷","📸","🎥",
      "💻","📱","⌨️","🎵","🎶","🎤","🎧","🎹","🥁","🎬",
    ],
  },
  {
    label: "Nature",
    emojis: [
      "🌟","⭐","🌈","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️",
      "⛈️","🌩️","🌨️","❄️","☃️","⛄","🌊","🌋","🌲","🌳",
      "🌴","🌵","🌿","☘️","🍀","🍁","🌸","🌹","🌷","🌼",
      "🌻","🌺","🌞","🌝","🌛","🌜","🌚","🌎","🌍","🌏",
    ],
  },
  {
    label: "Food",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐",
      "🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑",
      "🥦","🥬","🥕","🌽","🥔","🍠","🥐","🥯","🍞","🥖",
      "🧀","🥚","🍳","🥞","🧇","🥓","🍔","🍟","🍕","🌭",
      "🥪","🥙","🌮","🌯","🥗","🥘","🍝","🍜","🍲","🍛",
      "🍣","🍱","🥟","🍤","🍙","🍚","🍰","🎂","🍦","🍩",
      "🍪","🍫","🍿","🧁","🍭","🍬","☕","🧃","🥤","🍺",
    ],
  },
  {
    label: "Transport",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🚓","🚑","🚒","🚐","🚚",
      "🚲","🛴","🛹","🛼","🚨","🚔","🚍","✈️","🛫","🛬",
      "🚀","🛸","🚁","⛵","🚤","🛥️","🚢","⚓","🚂","🚃",
      "🚇","🚊","🚉","🚏","🛑","🚦","🚥","🗺️","🧭",
    ],
  },
  {
    label: "Misc",
    emojis: [
      "💡","🔦","🔋","🔌","🔧","🔨","🔩","⚙️","🛠️","🔫",
      "💣","🧨","🔪","🗡️","🛡️","🔮","📿","💈","🔭","🔬",
      "💊","💉","🩸","🧬","🦠","🧫","🧪","🧹","🧽","🧴",
      "🪥","🛁","🛀","🚿","🚽","🧻","💰","💎","💳","⚖️",
      "🧰","🪜","🪴","🕯️","💈","🗝️","🔑","🧿","🪬","🪶",
    ],
  },
];

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ open, onClose, onSelect }: EmojiPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-2 right-2 mb-2 z-50 max-h-64 overflow-y-auto rounded-ios-2xl bg-[var(--ios-bg-secondary)] shadow-ios-lg border border-border/40 p-2 animate-slide-up"
    >
      {CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <span className="text-caption-2 text-muted-foreground font-semibold px-1 py-0.5 block">
            {cat.label}
          </span>
          <div className="flex flex-wrap gap-0.5 mb-1.5">
            {cat.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onSelect(emoji); onClose(); }}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-secondary rounded-lg ios-press ios-transition"
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
