import React from "react";
import { Cat, UserCircle2 } from "lucide-react";

interface TypingIndicatorProps {
  role: 'admin' | 'client' | 'bot';
}

export function TypingIndicator({ role }: TypingIndicatorProps) {
  return (
    <div className="flex w-full gap-2 justify-start mb-2 animate-in fade-in zoom-in-95 duration-200">
        <div className="h-8 w-8 rounded-full bg-subtleBackground/30 flex-shrink-0 flex items-center justify-center text-primary mt-auto mb-1">
            {role === 'client' ? <UserCircle2 className="h-4 w-4" /> : <Cat className="h-4 w-4" />}
        </div>
        <div className="flex flex-col max-w-[85%] md:max-w-[70%] items-start mt-auto">
            <div className="px-4 py-3 bg-card-background border border-border shadow-sm rounded-2xl rounded-bl-sm flex items-center justify-center space-x-1 min-h-[40px]">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
        </div>
    </div>
  );
}
