import { Font } from "@react-pdf/renderer";

// react-pdf hyphenates by default, which splits words like "Dam-age" in narrow columns.
Font.registerHyphenationCallback((word) => [word]);
