/**
 * Docs Service Layer
 * Data fetching functions for Documentation page
 */

import { DocFile, DocContent, DocHeading } from "@/models/misc/docs.model";

/**
 * Get all documentation files
 */
export function getDocFiles(): DocFile[] {
  return [
    { path: "docs/README.md", title: "Documentation Index", route: "/docs" },
    { path: "docs/finance/README.md", title: "Finance Overview", route: "/docs/finance" },
    { path: "docs/finance/database.md", title: "Database", route: "/docs/finance/database" },
    { path: "docs/finance/pages.md", title: "Pages", route: "/docs/finance/pages" },
    { path: "docs/finance/components.md", title: "Components", route: "/docs/finance/components" },
    {
      path: "docs/finance/api-endpoints.md",
      title: "API Endpoints",
      route: "/docs/finance/api-endpoints",
    },
    { path: "docs/finance/data-flow.md", title: "Data Flow", route: "/docs/finance/data-flow" },
  ];
}

/**
 * Extract headings from markdown content
 */
export function extractHeadings(markdown: string): DocHeading[] {
  const headingRegex = /^(#{1,2})\s+(.+)$/gm;
  const extracted: DocHeading[] = [];

  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    if (level <= 2) {
      extracted.push({ level, text, id });
    }
  }

  return extracted;
}

/**
 * Fetch documentation content
 */
export async function fetchDocContent(path: string): Promise<DocContent> {
  try {
    const response = await fetch(`/api/docs?path=${encodeURIComponent(path)}`);
    if (response.ok) {
      const text = await response.text();
      const headings = extractHeadings(text);
      return { content: text, headings };
    } else {
      return {
        content: "# Documentation\n\nDocumentation file not found.",
        headings: [],
      };
    }
  } catch (error) {
    return {
      content: "# Error\n\nFailed to load documentation.",
      headings: [],
    };
  }
}

/**
 * Get current doc based on pathname
 */
export function getCurrentDoc(pathname: string, docFiles: DocFile[]): DocFile {
  // Direct match
  const exactMatch = docFiles.find((doc) => pathname === doc.route);
  if (exactMatch) return exactMatch;

  // Handle /docs/finance routes
  if (pathname.startsWith("/docs/finance/")) {
    const slug = pathname.replace("/docs/finance/", "");
    const match = docFiles.find((doc) => {
      const docSlug = doc.route.replace("/docs/finance/", "");
      return docSlug === slug;
    });
    if (match) return match;
  }

  // Default to index for /docs
  if (pathname === "/docs") return docFiles[0];

  // Default to finance README for /docs/finance
  if (pathname === "/docs/finance") {
    return docFiles.find((doc) => doc.route === "/docs/finance") || docFiles[0];
  }

  return docFiles[0];
}



