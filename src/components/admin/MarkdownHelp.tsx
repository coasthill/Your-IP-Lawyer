const ROWS: Array<[string, string]> = [
  ["## Heading", "Section heading (### for a sub-heading)"],
  ["*italic*  **bold**", "Emphasis"],
  ["[text](https://…)", "Link"],
  ["> quoted line", "Block quote (pull quote)"],
  ["- item  /  1. item", "Bulleted / numbered list"],
  ["claim.[^1]  …  [^1]: Note text", "Footnote and its text (rendered under “Notes”)"],
  ["| A | B |\n| - | - |\n| x | y |", "Table"],
  ["![alt text](https://…/image.jpg)", "Image with alt text"],
  ["`code`  or  ```fenced```", "Inline code / code block"],
  ["---", "Horizontal rule"],
  ["~~struck~~", "Strikethrough"],
  ["- [ ] task", "Task list"],
];

/** Compact cheat-sheet for the editor. Collapsed by default. */
export function MarkdownHelp() {
  return (
    <details className="group border border-bronze/20">
      <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-bone transition-colors hover:text-ivory [&::-webkit-details-marker]:hidden">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        Markdown cheat-sheet
      </summary>
      <div className="border-t border-bronze/20 px-4 py-4">
        <p className="mb-3 text-xs text-bone/70">Articles are written in Markdown. Footnotes, tables, block quotes and images are supported; raw HTML is stripped for safety.</p>
        <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[auto_1fr]">
          {ROWS.map(([syntax, meaning]) => (
            <div key={syntax} className="contents">
              <dt>
                <code className="whitespace-pre-wrap font-mono text-[0.7rem] text-bronze-2">{syntax}</code>
              </dt>
              <dd className="text-parchment/80">{meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
