"use client";

interface ErrorStateProps {
  error: Error | unknown;
  message?: string;
}

export function ErrorState({ error, message }: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : message || "Unknown error";
  
  return (
    <div className="text-red-500 text-center py-8">
      {message || `Error: ${errorMessage}`}
    </div>
  );
}

