import { ScrollViewStyleReset } from "expo-router/html";
import { arcade } from "../arcadeTheme";

const css = `
    html, body, #root { height: 100%; }
    body {
      margin: 0;
      background: ${arcade.bg};
      user-select: none;
      -webkit-user-select: none;
      overscroll-behavior: none;
    }
    [id^="joystick-"],
    [data-joystick] {
      touch-action: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }

    ul.arcades-game-list {
      list-style: none;
      margin: 0;
      padding: 16px 4px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    ul.arcades-game-list > li.arcades-game-item {
      margin: 0;
      padding: 4px;
      border-radius: 8px;
      transition: background-color 120ms ease;
    }
    ul.arcades-game-list > li.arcades-game-item:hover {
      background: ${arcade.hover};
    }
    ul.arcades-game-list > li.arcades-game-item:focus-within {
      background: ${arcade.accentSoft};
      box-shadow: inset 0 0 0 1px ${arcade.brand};
    }
    ul.arcades-game-list > li.arcades-game-item.is-selected {
      background: ${arcade.accentSoft};
    }
    ul.arcades-game-list > li.arcades-game-item.is-selected:hover,
    ul.arcades-game-list > li.arcades-game-item.is-selected:focus-within {
      background: ${arcade.accentSoftHot};
    }
    ul.arcades-game-list > li.arcades-game-item > a.arcades-game-link {
      display: block;
      padding: 12px 10px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 1px;
      line-height: 1.3;
      color: ${arcade.text};
      outline: none;
      cursor: pointer;
      text-transform: uppercase;
    }
    ul.arcades-game-list > li.arcades-game-item > a.arcades-game-link.is-selected {
      color: ${arcade.brand};
    }
    ul.arcades-game-list > li.arcades-game-item > a.arcades-game-link:focus-visible {
      outline: 1px solid ${arcade.brand};
      outline-offset: 2px;
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
