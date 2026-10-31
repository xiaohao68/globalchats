import type { ReactNode } from "react";
import { cn } from "@gc/ui/lib/utils";
import { openExternalUrl, toSafeExternalUrl } from "../../utils/openExternal";

interface RenderOptions {
  isOutgoing: boolean;
  highlightQuery?: string;
}

const toSafeImageUrl = (rawUrl: string): string | null => {
  const safe = toSafeExternalUrl(rawUrl);
  if (!safe) return null;
  try {
    const url = new URL(safe);
    const path = url.pathname.toLowerCase();
    if (!/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(path)) return null;
    return url.toString();
  } catch {
    return null;
  }
};

const renderHighlightedText = (
  text: string,
  highlightQuery?: string,
): ReactNode => {
  const q = highlightQuery?.trim();
  if (!q) return text;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  if (parts.length <= 1) return text;

  return parts.map((part, idx) => {
    if (part.toLowerCase() !== q.toLowerCase()) return part;
    return (
      <mark key={idx} className="chat-mark">
        {part}
      </mark>
    );
  });
};

const renderTextWithLinks = (
  text: string,
  { isOutgoing, highlightQuery }: RenderOptions,
): ReactNode => {
  const urlRegex = /(?:https?:\/\/|www\.)[^\s<]+/gi;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = urlRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) nodes.push(before);
    const raw = match[0] ?? "";

    const stripped = raw.replace(/[),.!?;:]+$/g, "");
    const suffix = raw.slice(stripped.length);
    const safeHref = toSafeExternalUrl(stripped);

    if (safeHref) {
      nodes.push(
        <a
          key={`link-${match.index}-${safeHref}`}
          href={safeHref}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void openExternalUrl(safeHref);
          }}
          className={cn(
            "break-words underline underline-offset-[3px]",
            "decoration-[color-mix(in_srgb,currentColor,transparent_55%)] hover:decoration-current",
            "transition-colors",
            isOutgoing ? "text-white/95" : "text-[var(--color-accent)]",
          )}
        >
          {renderHighlightedText(stripped, highlightQuery)}
        </a>,
      );
    } else {
      nodes.push(raw);
    }

    if (suffix) nodes.push(suffix);
    lastIndex = urlRegex.lastIndex;
  }

  const rest = text.slice(lastIndex);
  if (rest) nodes.push(rest);
  if (nodes.length === 0) return renderHighlightedText(text, highlightQuery);

  return nodes.flatMap((node): ReactNode[] =>
    typeof node === "string"
      ? [renderHighlightedText(node, highlightQuery)]
      : [node],
  );
};

const renderImageBlock = (
  src: string,
  alt: string,
  key: string,
  isOutgoing: boolean,
) => (
  <a
    key={key}
    href={src}
    target="_blank"
    rel="noreferrer noopener"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      void openExternalUrl(src);
    }}
    className="block"
  >
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "chat-image max-w-full rounded-lg ring-1 ring-inset",
        "shadow-sm",
        isOutgoing ? "ring-white/16" : "ring-[var(--color-border)]/45",
      )}
    />
  </a>
);

const renderParagraphWithMedia = (
  paragraph: string,
  keyBase: string,
  opts: RenderOptions,
) => {
  const trimmed = paragraph.trim();
  const standaloneImage = toSafeImageUrl(trimmed);
  if (standaloneImage) {
    return renderImageBlock(
      standaloneImage,
      "图片",
      `${keyBase}-img`,
      opts.isOutgoing,
    );
  }

  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const segments: Array<
    { kind: "text"; value: string } | { kind: "image"; src: string; alt: string }
  > = [];
  let last = 0;
  let match: RegExpExecArray | null = null;

  while ((match = imageRegex.exec(paragraph)) !== null) {
    const before = paragraph.slice(last, match.index);
    if (before) segments.push({ kind: "text", value: before });
    const alt = match[1] ?? "图片";
    const url = match[2] ?? "";
    const safe = toSafeImageUrl(url);
    if (safe) {
      segments.push({ kind: "image", src: safe, alt });
    } else {
      segments.push({ kind: "text", value: match[0] ?? "" });
    }
    last = imageRegex.lastIndex;
  }

  const rest = paragraph.slice(last);
  if (rest) segments.push({ kind: "text", value: rest });

  if (segments.every((s) => s.kind === "text")) {
    return (
      <p
        key={keyBase}
        className="leading-relaxed [text-wrap:pretty] break-words [word-break:break-word] whitespace-pre-wrap text-[var(--font-size-body)]"
      >
        {renderTextWithLinks(paragraph, opts)}
      </p>
    );
  }

  return (
    <div key={keyBase} className="space-y-2">
      {segments.flatMap((seg, segIdx) => {
        if (seg.kind === "image") {
          return [
            renderImageBlock(
              seg.src,
              seg.alt,
              `${keyBase}-img-${segIdx}-${seg.src}`,
              opts.isOutgoing,
            ),
          ];
        }
        if (!seg.value.trim()) return [];
        return [
          <p
            key={`${keyBase}-t-${segIdx}`}
            className="leading-relaxed [text-wrap:pretty] break-words [word-break:break-word] whitespace-pre-wrap text-[var(--font-size-body)]"
          >
            {renderTextWithLinks(seg.value, opts)}
          </p>,
        ];
      })}
    </div>
  );
};

const renderQuotedAndText = (text: string, opts: RenderOptions): ReactNode => {
  const lines = text.split("\n");
  const chunks: Array<{ type: "quote" | "text"; lines: string[] }> = [];

  for (const line of lines) {
    const isQuoteLine = /^\s*>\s?/.test(line);
    const type: "quote" | "text" = isQuoteLine ? "quote" : "text";
    const normalized = isQuoteLine ? line.replace(/^\s*>\s?/, "") : line;

    const last = chunks[chunks.length - 1];
    if (!last || last.type !== type) {
      chunks.push({ type, lines: [normalized] });
    } else {
      last.lines.push(normalized);
    }
  }

  const rendered = chunks
    .map((chunk, idx) => {
      const content = chunk.lines.join("\n").trimEnd();
      if (!content.trim()) return null;

      if (chunk.type === "quote") {
        return (
          <div
            key={`q-${idx}`}
            className={cn(
              "rounded-lg px-3 py-2",
              "border-l-2",
              "text-[13px] leading-relaxed",
              "whitespace-pre-wrap",
              opts.isOutgoing
                ? "border-white/35 bg-white/10 text-white/90 ring-1 ring-white/14 ring-inset"
                : "border-[var(--color-accent)]/35 bg-black/[0.045] text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]/35 ring-inset dark:bg-white/[0.07]",
            )}
          >
            {renderTextWithLinks(content, opts)}
          </div>
        );
      }

      const paragraphs = content.split(/\n{2,}/g).filter(Boolean);
      if (paragraphs.length <= 1) {
        return renderParagraphWithMedia(content, `p-${idx}`, opts);
      }

      return (
        <div key={`p-${idx}`} className="space-y-2">
          {paragraphs.map((p, pIdx) =>
            renderParagraphWithMedia(p, `p-${idx}-${pIdx}`, opts),
          )}
        </div>
      );
    })
    .filter(Boolean);

  if (rendered.length === 0) return null;
  if (rendered.length === 1) return rendered[0];
  return <div className="space-y-2">{rendered}</div>;
};

const renderTextBlock = (text: string, opts: RenderOptions): ReactNode => {
  if (!text.trim()) return null;
  return <div>{renderQuotedAndText(text, opts)}</div>;
};

const renderCodeBlock = (
  lang: string | null,
  code: string,
  key: string,
  isOutgoing: boolean,
) => {
  const cleaned = code.replace(/\n$/, "");
  return (
    <pre
      key={key}
      className={cn(
        "chat-codeblock mt-2 overflow-x-auto rounded-lg border px-3 py-2",
        "font-mono text-[12px] leading-relaxed",
        isOutgoing
          ? "border-white/16 bg-white/10 text-white/95"
          : "border-[var(--color-border)]/35 bg-black/[0.06] text-[var(--color-text-primary)] dark:bg-white/[0.06]",
      )}
    >
      <code>{lang ? `${lang}\n${cleaned}` : cleaned}</code>
    </pre>
  );
};

export function renderMessageContent(content: string, opts: RenderOptions) {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  const blocks: ReactNode[] = [];

  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    const lang = match[1] ?? null;
    const code = match[2] ?? "";

    const textNode = renderTextBlock(before, opts);
    if (textNode) blocks.push(<div key={`t-${match.index}`}>{textNode}</div>);

    blocks.push(renderCodeBlock(lang, code, `c-${match.index}`, opts.isOutgoing));
    lastIndex = regex.lastIndex;
  }

  const rest = content.slice(lastIndex);
  const restNode = renderTextBlock(rest, opts);
  if (restNode) blocks.push(<div key="t-rest">{restNode}</div>);

  if (blocks.length === 0) return renderTextBlock(content, opts);
  return <div className="space-y-2">{blocks}</div>;
}
