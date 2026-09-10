import { useState } from "react";
import { cn } from "../lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  fallbackEmoji?: string;
  fallbackLabel?: string;
};

/**
 * <img> をレンダリングし、/public/images にファイルがまだ無い場合や
 * 読み込みに失敗した場合はラベル付きプレースホルダーに切り替える。
 */
export function StoreImage({
  src,
  alt,
  className,
  fallbackEmoji = "🐔",
  fallbackLabel,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex flex-col items-center justify-center gap-1 border-2 border-dashed border-wood/40 bg-mustard/15 text-wood",
          className,
        )}
      >
        <span className="text-4xl leading-none">{fallbackEmoji}</span>
        {fallbackLabel && (
          <span className="text-[10px] font-bold tracking-wide">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
