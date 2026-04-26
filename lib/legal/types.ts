export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

export type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};
