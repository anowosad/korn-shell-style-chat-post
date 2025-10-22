import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import backgroundImage from "@/assets/background.png";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface MessagePart {
  type: "text" | "code";
  content: string;
  language?: string;
}

const parseMessage = (text: string): MessagePart[] => {
  const parts: MessagePart[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = text.substring(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: "text", content: textContent });
      }
    }

    // Add code block
    parts.push({
      type: "code",
      content: match[2].trim(),
      language: match[1] || "bash",
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const textContent = text.substring(lastIndex).trim();
    if (textContent) {
      parts.push({ type: "text", content: textContent });
    }
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
};

const highlightShellCode = (code: string) => {
  // Keywords based on the UDL config
  const keywords1 = [
    "then",
    "else",
    "function",
    "break",
    "do",
    "until",
    "use",
    "try",
    "catch",
    "return",
    "if",
    "fi",
    "while",
    "case",
    "esac",
    "for",
    "done",
    "in",
  ];
  const keywords3 = [
    "print",
    "echo",
    "lower",
    "trim",
    "edit",
    "const",
    "chmod",
    "cd",
    "ls",
    "cat",
    "grep",
    "awk",
    "sed",
  ];
  const keywords4 = ["true", "false", "null", "and", "or", "not"];

  const lines = code.split("\n");

  return lines.map((line, lineIndex) => {
    const tokens: JSX.Element[] = [];
    let currentPos = 0;

    // Check for comments first
    const commentMatch = line.match(/^(\s*)(#.*)$/);
    if (commentMatch) {
      return (
        <div key={lineIndex}>
          <span>{commentMatch[1]}</span>
          <span style={{ color: "#00FF00" }}>{commentMatch[2]}</span>
        </div>
      );
    }

    // Tokenize the line
    const tokenRegex = /(\$?\w+|[!#(),;\[\]{}+<=>-]|\d+|"[^"]*"|'[^']*'|\s+)/g;
    const matches = Array.from(line.matchAll(tokenRegex));

    matches.forEach((match, i) => {
      const token = match[0];
      const key = `${lineIndex}-${i}`;

      // Check token type and apply colors
      if (/^\d+$/.test(token)) {
        // Numbers - red
        tokens.push(
          <span key={key} style={{ color: "#FF6B6B" }}>
            {token}
          </span>,
        );
      } else if (keywords1.includes(token)) {
        // Keywords1 - cyan
        tokens.push(
          <span key={key} style={{ color: "#00FFFF" }}>
            {token}
          </span>,
        );
      } else if (keywords3.includes(token)) {
        // Keywords3 - cyan/turquoise
        tokens.push(
          <span key={key} style={{ color: "#00CED1" }}>
            {token}
          </span>,
        );
      } else if (keywords4.includes(token)) {
        // Keywords4 - yellow
        tokens.push(
          <span key={key} style={{ color: "#FFD700" }}>
            {token}
          </span>,
        );
      } else if (/^[!#(),;\[\]{}+<=>-]$/.test(token)) {
        // Operators - lighter teal
        tokens.push(
          <span key={key} style={{ color: "#40E0D0" }}>
            {token}
          </span>,
        );
      } else if (/^["'].*["']$/.test(token)) {
        // Strings - light color
        tokens.push(
          <span key={key} style={{ color: "#98FB98" }}>
            {token}
          </span>,
        );
      } else if (token.startsWith("#")) {
        // Inline comments
        tokens.push(
          <span key={key} style={{ color: "#00FF00" }}>
            {token}
          </span>,
        );
      } else if (token.startsWith("$")) {
        // Variables - distinct color
        tokens.push(
          <span key={key} style={{ color: "#FFA500" }}>
            {token}
          </span>,
        );
      } else {
        // Default - white/light gray
        tokens.push(
          <span key={key} style={{ color: "#E0E0E0" }}>
            {token}
          </span>,
        );
      }
    });

    return <div key={lineIndex}>{tokens.length > 0 ? tokens : line}</div>;
  });
};

const CodeBlock = ({ content, language }: { content: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = highlightShellCode(content);

  return (
    <div className="relative bg-gray-900 rounded-lg p-4 font-mono text-sm border border-gray-700 shadow-sm">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded hover:bg-gray-800 transition-colors"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
      </button>
      <pre className="whitespace-pre-wrap break-words pr-8">{highlightedCode}</pre>
    </div>
  );
};

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
          Korn Shell Scripting: What You Need to Know
        </h1>
      </header>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-foreground text-lg font-bold">RAG for Korn Shell AI Knowledge Base</p>
              <p className="text-muted-foreground text-base">based on</p>
              <p className="text-foreground text-3xl font-bold">The Korn Shell</p>
              <p className="text-foreground text-base font-bold">Third Addition</p>
              <p className="text-muted-foreground text-lg">Unix & Linux Programming Manual</p>
              <p className="text-muted-foreground text-base">Anatole Olczak</p>
            </div>
          </div>
        )}
        {messages.map((message) => {
          if (message.sender === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] md:max-w-[60%] rounded-2xl px-6 py-3 bg-chat-user text-white animate-in slide-in-from-bottom-2 duration-300">
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                </div>
              </div>
            );
          }

          const parts = parseMessage(message.text);
          const hasCode = parts.some((part) => part.type === "code");

          if (!hasCode) {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[80%] md:max-w-[60%] rounded-2xl px-6 py-3 bg-chat-bot text-foreground animate-in slide-in-from-bottom-2 duration-300">
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              {parts.map((part, index) => (
                <div key={index} className={`flex ${part.type === "code" ? "justify-end" : "justify-start"}`}>
                  {part.type === "text" ? (
                    <div className="max-w-[80%] md:max-w-[60%] rounded-2xl px-6 py-3 bg-chat-bot text-foreground">
                      <p className="whitespace-pre-wrap break-words">{part.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-[80%] md:max-w-[60%]">
                      <CodeBlock content={part.content} language={part.language} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
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
              placeholder="Create ksh scripts with me..."
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
