"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CategoryAutocomplete } from "./CategoryAutocomplete";

interface RoadmapFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: {
    id: string;
    title: string;
    description: string | null;
    user_story: string | null;
    expected_results: string | null;
    department: string;
    category: string | null;
    triggers: string[];
    status?: string | null;
    have_state?: string | null;
  } | null;
}

export function RoadmapFormSheet({ open, onOpenChange, item }: RoadmapFormSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userStory, setUserStory] = useState("");
  const [expectedResults, setExpectedResults] = useState("");
  const [department, setDepartment] = useState("Operations");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string>("inbox");
  const [haveState, setHaveState] = useState<string>("Want");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [triggerInput, setTriggerInput] = useState("");

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setUserStory(item.user_story || "");
      setExpectedResults(item.expected_results || "");
      setDepartment(item.department);
      setCategory(item.category || "");
      setStatus(item.status || "inbox");
      setHaveState(item.have_state || "Want");
      setTriggers(item.triggers || []);
    } else {
      setTitle("");
      setDescription("");
      setUserStory("");
      setExpectedResults("");
      setDepartment("Operations");
      setCategory("");
      setStatus("inbox");
      setHaveState("Want");
      setTriggers([]);
    }
  }, [item, open]);

  const addTrigger = () => {
    if (triggerInput.trim() && !triggers.includes(triggerInput.trim())) {
      setTriggers([...triggers, triggerInput.trim()]);
      setTriggerInput("");
    }
  };

  const removeTrigger = (trigger: string) => {
    setTriggers(triggers.filter((t) => t !== trigger));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || null,
      user_story: userStory.trim() || null,
      expected_results: expectedResults.trim() || null,
      department,
      category: category.trim() || null,
      triggers: triggers,
      status,
      have_state: haveState,
      is_active: status === "doing",
    };

    if (item) {
      // Update
      const { error } = await supabase
        .from("roadmap_items")
        .update(data)
        .eq("id", item.id);

      if (error) {
        console.error("Roadmap item update error:", error);
        toast.error("Failed to update item: " + error.message);
      } else {
        toast.success("Roadmap item updated");
        onOpenChange(false);
      }
    } else {
      // Create - get max display_order and add 1
      const { data: maxOrderData } = await supabase
        .from("roadmap_items")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .single();

      const { error } = await supabase
        .from("roadmap_items")
        .insert({
          ...data,
          display_order: (maxOrderData?.display_order ?? -1) + 1,
        });

      if (error) {
        console.error("Roadmap item create error:", error);
        toast.error("Failed to create item: " + error.message);
      } else {
        toast.success("Roadmap item created");
        onOpenChange(false);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{item ? "Edit" : "Add"} Roadmap Item</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., van Alsem Supplier Integration"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the feature..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_story">User Story</Label>
            <Textarea
              id="user_story"
              value={userStory}
              onChange={(e) => setUserStory(e.target.value)}
              placeholder="As a [role], I want [feature], so that [benefit]..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_results">Expected Results</Label>
            <Textarea
              id="expected_results"
              value={expectedResults}
              onChange={(e) => setExpectedResults(e.target.value)}
              placeholder="Success criteria, metrics, outcomes..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">
              Department <span className="text-red-500">*</span>
            </Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger id="department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Back-Office">Back-Office</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategoryAutocomplete value={category} onValueChange={setCategory} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="doing">Doing</SelectItem>
                <SelectItem value="next-up">Next Up</SelectItem>
                <SelectItem value="someday">Someday</SelectItem>
                <SelectItem value="inbox">Inbox</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="have_state">Have State</Label>
              <Select value={haveState} onValueChange={setHaveState}>
                <SelectTrigger id="have_state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Must">Must</SelectItem>
                  <SelectItem value="Should">Should</SelectItem>
                  <SelectItem value="Could">Could</SelectItem>
                  <SelectItem value="Want">Want</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="triggers">AI Triggers</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Phrases that will notify you about this item in AI chat
            </p>
            <div className="border rounded-md p-2 space-y-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {triggers.map((trigger, i) => (
                  <Badge key={i} variant="secondary">
                    {trigger}
                    <button
                      type="button"
                      onClick={() => removeTrigger(trigger)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTrigger();
                    }
                  }}
                  placeholder='e.g., "build suppliers"'
                />
                <Button type="button" onClick={addTrigger} variant="outline">
                  Add
                </Button>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{item ? "Update" : "Create"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

