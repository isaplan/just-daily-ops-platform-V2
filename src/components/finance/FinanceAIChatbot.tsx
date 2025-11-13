import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Sparkles } from "lucide-react";
import { createClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FinanceAIChatbotProps {
  locationKey: string;
}

export default function FinanceAIChatbot({ locationKey }: FinanceAIChatbotProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const exampleQueries = [
    "What was the total revenue for all locations last month?",
    "Show me the location with the highest EBITDA percentage",
    "Compare Q1 2024 revenue vs Q1 2025",
    "What is the average labor cost percentage across all locations?",
  ];

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: queryText }]);
    setLoading(true);
    setQuery("");

    try {
      // Simple query matching logic
      let response = "";
      const lowerQuery = queryText.toLowerCase();

      if (lowerQuery.includes('revenue') || lowerQuery.includes('omzet')) {
        const { data, error } = await supabase
          .from('view_finance_summary' as any)
          .select('location_name, period_name, total_revenue')
          .order('full_date', { ascending: false })
          .limit(3);

        if (error) throw error;

        response = "Recent revenue data:\n\n";
        data?.forEach((row: any) => {
          response += `${row.location_name} - ${row.period_name}: €${row.total_revenue?.toLocaleString('nl-NL') || 0}\n`;
        });
      } else if (lowerQuery.includes('ebitda')) {
        const { data, error } = await supabase
          .from('view_finance_summary' as any)
          .select('location_name, period_name, ebitda_pct')
          .order('ebitda_pct', { ascending: false })
          .limit(3);

        if (error) throw error;

        response = "Top locations by EBITDA %:\n\n";
        data?.forEach((row: any) => {
          response += `${row.location_name} - ${row.period_name}: ${row.ebitda_pct?.toFixed(1) || 0}%\n`;
        });
      } else if (lowerQuery.includes('labor') || lowerQuery.includes('lonen')) {
        const { data, error } = await supabase
          .from('view_finance_summary' as any)
          .select('location_name, period_name, labor_cost_pct')
          .order('full_date', { ascending: false })
          .limit(3);

        if (error) throw error;

        response = "Recent labor cost percentages:\n\n";
        data?.forEach((row: any) => {
          response += `${row.location_name} - ${row.period_name}: ${row.labor_cost_pct?.toFixed(1) || 0}%\n`;
        });
      } else {
        response = "I can help you analyze financial data. Try asking about:\n\n- Revenue trends\n- EBITDA percentages\n- Labor costs\n- Location comparisons\n\nYou can also click on the example queries below!";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error: any) {
      console.error('Query error:', error);
      toast.error(error.message || 'Failed to process query');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your query. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Example queries */}
      <div className="flex flex-wrap gap-2">
        {exampleQueries.map((example, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleQuery(example)}
            disabled={loading}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {example}
          </Button>
        ))}
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {messages.map((message, index) => (
            <Card 
              key={index} 
              className={`p-3 ${
                message.role === 'user' 
                  ? 'bg-primary/10 ml-auto max-w-[80%]' 
                  : 'bg-muted max-w-[80%]'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about your financial data..."
          className="min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleQuery(query);
            }
          }}
        />
        <Button
          onClick={() => handleQuery(query)}
          disabled={loading || !query.trim()}
          size="icon"
          className="h-[60px] w-[60px]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
