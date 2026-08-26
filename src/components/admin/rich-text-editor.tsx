"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Underline,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  cleanRichTextForStorage,
  richTextForEditor,
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/lib/question-rich-text";
import { cn } from "@/lib/utils";

type ActiveState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
};

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  compact?: boolean;
  onFilesSelected?: (files: File[]) => void;
};

const imageTypes = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 128,
  compact = false,
  onFilesSelected,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [empty, setEmpty] = useState(() => !richTextToPlainText(value));
  const [active, setActive] = useState<ActiveState>({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;

    const nextHtml = richTextForEditor(value);
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
    setEmpty(!richTextToPlainText(nextHtml));
  }, [value]);

  function refreshToolbarState() {
    try {
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      setActive({
        bold: false,
        italic: false,
        underline: false,
        unorderedList: false,
        orderedList: false,
      });
    }
  }

  function commit() {
    const cleaned = cleanRichTextForStorage(editorRef.current?.innerHTML ?? "");
    setEmpty(!richTextToPlainText(cleaned));
    onChange(cleaned);
    refreshToolbarState();
  }

  function commitSoon() {
    window.setTimeout(commit, 0);
  }

  function runCommand(command: string, argument?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    commitSoon();
  }

  function insertLink() {
    const href = window.prompt("URL do link");
    if (!href?.trim()) return;
    runCommand("createLink", href.trim());
  }

  function clearFormatting() {
    editorRef.current?.focus();
    document.execCommand("removeFormat");
    document.execCommand("formatBlock", false, "P");
    commitSoon();
  }

  function selectFiles(files: File[]) {
    const images = files.filter(isImageFile);
    if (!images.length) return;
    onFilesSelected?.(images);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.some(isImageFile) && onFilesSelected) {
      event.preventDefault();
      selectFiles(files);
      return;
    }

    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");

    if (html && /<\/?[a-z][^>]*>/i.test(html)) {
      event.preventDefault();
      document.execCommand("insertHTML", false, sanitizeRichTextHtml(html));
      commitSoon();
      return;
    }

    if (text) {
      event.preventDefault();
      document.execCommand("insertText", false, text);
      commitSoon();
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const files = Array.from(event.dataTransfer.files);
    if (files.some(isImageFile) && onFilesSelected) {
      event.preventDefault();
      selectFiles(files);
    }
  }

  return (
    <div className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="overflow-hidden rounded-[14px] border border-blue-100 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/90 px-2 py-2">
          <ToolbarButton title="Paragrafo" icon={Pilcrow} onClick={() => runCommand("formatBlock", "P")} />
          {!compact && (
            <ToolbarButton title="Titulo" icon={Heading3} onClick={() => runCommand("formatBlock", "H3")} />
          )}
          <ToolbarDivider />
          <ToolbarButton title="Negrito" icon={Bold} active={active.bold} onClick={() => runCommand("bold")} />
          <ToolbarButton title="Italico" icon={Italic} active={active.italic} onClick={() => runCommand("italic")} />
          <ToolbarButton title="Sublinhar" icon={Underline} active={active.underline} onClick={() => runCommand("underline")} />
          <ToolbarDivider />
          <ToolbarButton title="Alinhar a esquerda" icon={AlignLeft} onClick={() => runCommand("justifyLeft")} />
          <ToolbarButton title="Centralizar" icon={AlignCenter} onClick={() => runCommand("justifyCenter")} />
          <ToolbarButton title="Alinhar a direita" icon={AlignRight} onClick={() => runCommand("justifyRight")} />
          <ToolbarDivider />
          <ToolbarButton title="Lista" icon={List} active={active.unorderedList} onClick={() => runCommand("insertUnorderedList")} />
          <ToolbarButton title="Lista numerada" icon={ListOrdered} active={active.orderedList} onClick={() => runCommand("insertOrderedList")} />
          {!compact && (
            <ToolbarButton title="Citacao" icon={Quote} onClick={() => runCommand("formatBlock", "BLOCKQUOTE")} />
          )}
          <ToolbarButton title="Link" icon={Link2} onClick={insertLink} />
          {onFilesSelected && (
            <>
              <ToolbarDivider />
              <ToolbarButton title="Imagem" icon={ImagePlus} onClick={() => inputRef.current?.click()} />
              <input
                ref={inputRef}
                className="hidden"
                type="file"
                accept={imageTypes}
                multiple={!compact}
                onChange={(event) => {
                  selectFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
            </>
          )}
          <ToolbarDivider />
          <ToolbarButton title="Limpar formatacao" icon={Eraser} onClick={clearFormatting} />
        </div>
        <div className="relative">
          {empty && (
            <p className="pointer-events-none absolute left-4 top-3 text-sm font-semibold text-slate-400">
              {placeholder}
            </p>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              "question-rich-text max-h-[520px] min-h-[var(--editor-min-height)] overflow-y-auto px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none",
              compact ? "text-sm" : "text-[15px]",
            )}
            style={{ "--editor-min-height": `${minHeight}px` } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: richTextForEditor(value) }}
            onInput={commit}
            onBlur={commit}
            onKeyUp={refreshToolbarState}
            onMouseUp={refreshToolbarState}
            onFocus={refreshToolbarState}
            onPaste={handlePaste}
            onDrop={handleDrop}
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  title,
  icon: Icon,
  active = false,
  onClick,
}: {
  title: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border text-slate-600 transition hover:border-blue-200 hover:bg-white hover:text-blue-700",
        active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-transparent",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />;
}
