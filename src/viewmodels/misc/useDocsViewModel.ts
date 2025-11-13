/**
 * Docs ViewModel Layer
 * Business logic for Documentation page
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  getDocFiles,
  fetchDocContent,
  getCurrentDoc,
} from "@/lib/services/misc/docs.service";
import { DocFile, DocContent } from "@/models/misc/docs.model";

export function useDocsViewModel() {
  const pathname = usePathname();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [headings, setHeadings] = useState<Array<{ level: number; text: string; id: string }>>([]);

  const docFiles = useMemo(() => getDocFiles(), []);
  const currentDoc = useMemo(() => getCurrentDoc(pathname, docFiles), [pathname, docFiles]);

  // Fetch doc content
  useEffect(() => {
    const loadDoc = async () => {
      setLoading(true);
      try {
        const result = await fetchDocContent(currentDoc.path);
        setContent(result.content);
        setHeadings(result.headings);
      } catch (error) {
        setContent("# Error\n\nFailed to load documentation.");
        setHeadings([]);
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [currentDoc.path]);

  return {
    docFiles,
    currentDoc,
    content,
    loading,
    headings,
    pathname,
  };
}



