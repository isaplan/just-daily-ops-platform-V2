/**
 * Docs Model Layer
 * Type definitions for Documentation page
 */

export interface DocFile {
  path: string;
  title: string;
  route: string;
}

export interface DocHeading {
  level: number;
  text: string;
  id: string;
}

export interface DocContent {
  content: string;
  headings: DocHeading[];
}



