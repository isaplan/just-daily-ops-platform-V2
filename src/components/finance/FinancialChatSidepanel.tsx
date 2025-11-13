import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Send, Save, Edit2, Trash2, MessageSquare, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FinancialChatSidepanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | null;
  month: string;
}

export function FinancialChatSidepanel({
  open,
  onOpenChange,
  locationId,
  month,
}: FinancialChatSidepanelProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [saveInsightContent, setSaveInsightContent] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch chat sessions
  const { data: sessions } = useQuery({
    queryKey: ["financial-chat-sessions", user?.id, month],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("financial_chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", month)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch messages for current session
  const { data: messages } = useQuery({
    queryKey: ["financial-chat-messages", currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const { data, error } = await supabase
        .from("financial_chat_messages")
        .select("*")
        .eq("session_id", currentSessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentSessionId,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create new session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { data, error } = await supabase
        .from("financial_chat_sessions")
        .insert({
          user_id: user.id,
          location_id: locationId,
          month,
          name: "New Financial Chat",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["financial-chat-sessions"] });
      setCurrentSessionId(data.id);
    },
  });

  // Update session name
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("financial_chat_sessions")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-chat-sessions"] });
      setEditingSessionId(null);
      toast({ title: "Chat renamed successfully" });
    },
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_chat_sessions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-chat-sessions"] });
      if (currentSessionId === deleteSessionId) {
        setCurrentSessionId(null);
      }
      setDeleteSessionId(null);
      toast({ title: "Chat deleted successfully" });
    },
  });

  // Save insight
  const saveInsightMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("financial_insights")
        .insert({
          user_id: user.id,
          session_id: currentSessionId,
          location_id: locationId,
          title,
          content,
          month,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setSaveInsightContent(null);
      toast({ title: "Insight saved successfully" });
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || !currentSessionId) return;

    setIsAnalyzing(true);
    try {
      // Save user message
      const { error: msgError } = await supabase
        .from("financial_chat_messages")
        .insert({
          session_id: currentSessionId,
          role: "user",
          content: message,
        });
      if (msgError) throw msgError;

      // Get AI response
      const { data, error } = await supabase.functions.invoke("analyze-financials", {
        body: {
          query: message,
          locationId: locationId === "all" ? null : locationId,
          month,
        },
      });

      if (error) throw error;

      // Save AI response
      await supabase.from("financial_chat_messages").insert({
        session_id: currentSessionId,
        role: "assistant",
        content: data.analysis,
      });

      // Refresh messages and update session timestamp
      queryClient.invalidateQueries({ queryKey: ["financial-chat-messages"] });
      await supabase
        .from("financial_chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentSessionId);
      queryClient.invalidateQueries({ queryKey: ["financial-chat-sessions"] });

      setMessage("");
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Financial AI Chat</SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Chat List Sidebar */}
            <div className="w-64 border-r flex flex-col">
              <div className="p-4 border-b">
                <Button
                  onClick={() => createSessionMutation.mutate()}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {sessions?.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted ${
                        currentSessionId === session.id ? "bg-muted" : ""
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      {editingSessionId === session.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => {
                            if (editingName.trim()) {
                              updateSessionMutation.mutate({
                                id: session.id,
                                name: editingName,
                              });
                            } else {
                              setEditingSessionId(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingName.trim()) {
                              updateSessionMutation.mutate({
                                id: session.id,
                                name: editingName,
                              });
                            }
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <>
                          <div
                            className="flex-1 text-sm truncate"
                            onClick={() => setCurrentSessionId(session.id)}
                          >
                            {session.name}
                          </div>
                          <div className="hidden group-hover:flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(session.id);
                                setEditingName(session.name);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteSessionId(session.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 flex flex-col">
              {currentSessionId ? (
                <>
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                      {messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>AI</AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`rounded-lg p-3 max-w-[80%] ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.role === "assistant" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7"
                                onClick={() => setSaveInsightContent(msg.content)}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save as Insight
                              </Button>
                            )}
                          </div>
                          {msg.role === "user" && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Chat Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask about your financial performance..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        rows={3}
                        disabled={isAnalyzing}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={isAnalyzing || !message.trim()}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a chat or create a new one to start</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSessionId && deleteSessionMutation.mutate(deleteSessionId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Insight Dialog */}
      <AlertDialog open={!!saveInsightContent} onOpenChange={() => setSaveInsightContent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Insight</AlertDialogTitle>
            <AlertDialogDescription>
              <Input
                placeholder="Enter insight title..."
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                    saveInsightMutation.mutate({
                      title: (e.target as HTMLInputElement).value,
                      content: saveInsightContent!,
                    });
                  }
                }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                const input = (e.target as HTMLElement)
                  .closest(".space-y-2")
                  ?.querySelector("input") as HTMLInputElement;
                if (input?.value.trim()) {
                  saveInsightMutation.mutate({
                    title: input.value,
                    content: saveInsightContent!,
                  });
                }
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
