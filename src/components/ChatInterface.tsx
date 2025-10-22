import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import backgroundImage from "@/assets/background.png";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const WEBHOOK_URL = "https://webj23-n8n.webj23.com/webhook/552a6946-6718-4d59-b23f-fbb79c7deb2a";

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.output || data.message || data.response || JSON.stringify(data),
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Header with Title */}
      <header className="relative z-10 px-4 py-12 md:py-16 lg:py-20 text-center h-[33vh] flex items-center justify-center">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{
            textShadow: `
                3px 3px 0px rgba(0,0,0,0.8),
                6px 6px 0px rgba(0,0,0,0.6),
                9px 9px 0px rgba(0,0,0,0.4),
                12px 12px 20px rgba(0,0,0,0.9)
              `,
          }}
        >
          The Korn Shell what You need to know. Writting ksh scripts
        </h1>
      </header>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-lg">Knowledge base RAG</p>
            <p className="text-muted-foreground text-lg">The Korn Shell Third Eddition</p>
            <p className="text-muted-foreground text-lg">Unix and Linux Programming Manual</p>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-6 py-3 ${
                message.sender === "user" ? "bg-chat-user text-white" : "bg-chat-bot text-foreground"
              } animate-in slide-in-from-bottom-2 duration-300`}
            >
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-chat-bot rounded-2xl px-6 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative z-10 border-t border-border bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-chat-input rounded-3xl flex items-end gap-2 p-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Lovable to create a landing page for my..."
              className="flex-1 min-h-[52px] max-h-[200px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-full h-10 w-10 bg-muted hover:bg-muted/80 text-foreground shrink-0"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
