import { useState, useEffect } from "react";
import { Sparkles, Layout, Type, Palette, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface LayoutSuggestion {
  id: string;
  name: string;
  description: string;
  icon: any;
  config: any;
}

const SUGGESTIONS: LayoutSuggestion[] = [
  {
    id: "rule-of-thirds",
    name: "Rule of Thirds",
    description: "Classic cinematic composition",
    icon: Layout,
    config: {
      text: { x: "10%", y: "20%", textAlign: "left" },
      person: { x: "66%", y: "50%", scale: 1.2 }
    }
  },
  {
    id: "centered-impact",
    name: "Centered Impact",
    description: "Symmetrical and bold",
    icon: Move,
    config: {
      text: { x: "50%", y: "70%", textAlign: "center" },
      person: { x: "50%", y: "40%", scale: 1.1 }
    }
  },
  {
    id: "solo-focus",
    name: "Solo Focus",
    description: "Emphasis on the subject",
    icon: Sparkles,
    config: {
      text: { x: "5%", y: "10%", textAlign: "left" },
      person: { x: "80%", y: "50%", scale: 1.4 }
    }
  }
];

export function AISmartLayouts({ onApply }: { onApply: (config: any) => void }) {
  const { toast } = useToast();

  const handleApply = (suggestion: LayoutSuggestion) => {
    onApply(suggestion.config);
    toast({
      title: "Layout Applied",
      description: `Switched to ${suggestion.name} composition.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Smart Layouts
          </h3>
          <p className="text-sm text-muted-foreground">
            Auto-position elements based on visual hierarchy principles
          </p>
        </div>
        <Badge variant="secondary">Beta</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SUGGESTIONS.map((suggestion) => (
          <Card 
            key={suggestion.id} 
            className="hover-elevate cursor-pointer border-2 hover:border-primary/50 transition-all"
            onClick={() => handleApply(suggestion)}
          >
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <suggestion.icon className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-sm">{suggestion.name}</CardTitle>
              <CardDescription className="text-xs">{suggestion.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
