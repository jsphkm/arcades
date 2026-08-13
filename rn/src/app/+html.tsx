import { ScrollViewStyleReset } from "expo-router/html";
import { palette } from "../theme";

const css = `
    html, body, #root { height: 100%; }
    body {
      margin: 0;
      background: ${palette.light.page};
      /* Avoid accidental text selection while dragging the stick */
      user-select: none;
      -webkit-user-select: none;
    }
    @media (prefers-color-scheme: dark) {
        body { background: ${palette.dark.page}; }
    }

    /* Drawer game list: ul > li > a (monotone) */
    ul.arcades-game-list {
      list-style: none;
      margin: 0;
      padding: 24px 4px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    ul.arcades-game-list > li.arcades-game-item {
      margin: 0;
      padding: 6px 8px;
      border-radius: 28px;
      transition: background-color 120ms ease;
    }
    ul.arcades-game-list > li.arcades-game-item:hover {
      background: rgba(232, 234, 237, 0.06);
    }
    ul.arcades-game-list > li.arcades-game-item:focus-within {
      background: rgba(232, 234, 237, 0.08);
      box-shadow: inset 0 0 0 1px rgba(232, 234, 237, 0.28);
    }
    ul.arcades-game-list > li.arcades-game-item.is-selected {
      background: rgba(232, 234, 237, 0.12);
    }
    ul.arcades-game-list > li.arcades-game-item.is-selected:hover,
    ul.arcades-game-list > li.arcades-game-item.is-selected:focus-within {
      background: rgba(232, 234, 237, 0.16);
    }
    ul.arcades-game-list > li.arcades-game-item > a.arcades-game-link {
      display: block;
      padding: 10px 12px;
      border-radius: 20px;
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.3;
      color: #c4c7c5;
      outline: none;
      cursor: pointer;
    }
    ul.arcades-game-list > li.arcades-game-item > a.arcades-game-link.is-selected {
      font-weight: 600;
      color: #e8eaed;
    }
    ul.arcades-game-list > li.arcades-game-item > a.arcades-game-link:focus-visible {
      outline: 1px solid rgba(232, 234, 237, 0.4);
      outline-offset: 2px;
    }

    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item:hover {
      background: rgba(31, 31, 31, 0.05);
    }
    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item:focus-within {
      background: rgba(31, 31, 31, 0.07);
      box-shadow: inset 0 0 0 1px rgba(31, 31, 31, 0.22);
    }
    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item.is-selected {
      background: rgba(31, 31, 31, 0.08);
    }
    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item.is-selected:hover,
    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item.is-selected:focus-within {
      background: rgba(31, 31, 31, 0.12);
    }
    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item > a.arcades-game-link {
      color: #444746;
    }
    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item > a.arcades-game-link.is-selected {
      color: #1f1f1f;
    }
    ul.arcades-game-list[data-scheme="light"] > li.arcades-game-item > a.arcades-game-link:focus-visible {
      outline-color: rgba(31, 31, 31, 0.35);
    }
`;

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <title>Arcades</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
