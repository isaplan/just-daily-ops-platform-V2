/**
 * Docs View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight, Hash } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocsViewModel } from "@/viewmodels/misc/useDocsViewModel";

export default function DocsPage() {
  const { docFiles, currentDoc, content, loading, headings, pathname } = useDocsViewModel();

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">Technical documentation and reference</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation - Sticky, Auto Height */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card className="h-auto">
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">General</p>
                  {docFiles.filter((doc) => doc.route === "/docs").map((doc) => (
                    <Link key={doc.route} href={doc.route}>
                      <Button
                        variant={pathname === doc.route ? "default" : "ghost"}
                        className="w-full justify-start text-left"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {doc.title}
                      </Button>
                    </Link>
                  ))}

                  <p className="text-xs font-semibold text-muted-foreground mb-2 mt-4">Finance</p>
                  {docFiles
                    .filter((doc) => doc.route.startsWith("/docs/finance") && doc.route !== "/docs/finance")
                    .map((doc) => (
                      <Link key={doc.route} href={doc.route}>
                        <Button
                          variant={pathname === doc.route ? "default" : "ghost"}
                          className="w-full justify-start text-left pl-8"
                          size="sm"
                        >
                          <ChevronRight className="h-3 w-3 mr-2" />
                          {doc.title.replace("Finance ", "")}
                        </Button>
                      </Link>
                    ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Table of Contents */}
            {headings.length > 0 && (
              <Card className="mt-4 h-auto">
                <CardHeader>
                  <CardTitle className="text-lg">Contents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-auto max-h-[400px]">
                    <div className="space-y-1">
                      {headings.map((heading) => (
                        <Button
                          key={heading.id}
                          variant="ghost"
                          className={`w-full justify-start text-left font-normal ${
                            heading.level === 2 ? 'pl-6' : ''
                          }`}
                          size="sm"
                          onClick={() => {
                            // Small delay to ensure content is rendered
                            setTimeout(() => {
                              const element = document.getElementById(heading.id);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          }}
                        >
                          <Hash className={`h-3 w-3 mr-2 ${heading.level === 1 ? 'opacity-100' : 'opacity-50'}`} />
                          <span className={heading.level === 1 ? 'font-semibold' : 'font-normal'}>{heading.text}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Content - Scrollable */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{currentDoc.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="text-muted-foreground">Loading documentation...</div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert overflow-y-auto max-h-[calc(100vh-12rem)]">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, children, ...props }) => {
                      // Extract text from children (handles strings and React nodes)
                      const getText = (children: any): string => {
                        if (typeof children === 'string') return children;
                        if (Array.isArray(children)) {
                          return children.map(getText).join('');
                        }
                        if (children && typeof children === 'object' && 'props' in children) {
                          return getText(children.props?.children || '');
                        }
                        return '';
                      };
                      const text = getText(children);
                      const id = text
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .trim();
                      return <h1 id={id} {...props}>{children}</h1>;
                    },
                    h2: ({ node, children, ...props }) => {
                      // Extract text from children (handles strings and React nodes)
                      const getText = (children: any): string => {
                        if (typeof children === 'string') return children;
                        if (Array.isArray(children)) {
                          return children.map(getText).join('');
                        }
                        if (children && typeof children === 'object' && 'props' in children) {
                          return getText(children.props?.children || '');
                        }
                        return '';
                      };
                      const text = getText(children);
                      const id = text
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .trim();
                      return <h2 id={id} {...props}>{children}</h2>;
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

