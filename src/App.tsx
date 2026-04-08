import { useState, useEffect, useCallback } from "react";
import { 
  Languages, 
  Settings as SettingsIcon, 
  History as HistoryIcon, 
  Copy, 
  Volume2, 
  ArrowRightLeft, 
  Trash2, 
  Plus, 
  X,
  Sparkles,
  Info,
  Check,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { QwenMTService, QwenMTConfig, TranslationOptions } from "@/src/lib/qwen-mt";

// --- Constants ---

const SUPPORTED_LANGUAGES = [
  { name: "Auto Detect", code: "auto" },
  { name: "English", code: "English" },
  { name: "Chinese", code: "Chinese" },
  { name: "Spanish", code: "Spanish" },
  { name: "French", code: "French" },
  { name: "German", code: "German" },
  { name: "Japanese", code: "Japanese" },
  { name: "Korean", code: "Korean" },
  { name: "Russian", code: "Russian" },
  { name: "Portuguese", code: "Portuguese" },
  { name: "Italian", code: "Italian" },
  { name: "Arabic", code: "Arabic" },
];

const MODELS = [
  { name: "Qwen-MT Plus", id: "qwen-mt-plus" },
  { name: "Qwen-MT Flash", id: "qwen-mt-flash" },
  { name: "Qwen-MT Lite", id: "qwen-mt-lite" },
  { name: "Qwen-MT Turbo", id: "qwen-mt-turbo" },
];

const REGIONS = [
  { name: "Singapore", url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" },
  { name: "Virginia", url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1" },
  { name: "Beijing", url: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
];

// --- Types ---

interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

interface GlossaryItem {
  source: string;
  target: string;
}

// --- App Component ---

export default function App() {
  // Settings
  const [config, setConfig] = useState<QwenMTConfig>(() => {
    const saved = localStorage.getItem("qwen_mt_config");
    return saved ? JSON.parse(saved) : {
      apiKey: "",
      baseURL: REGIONS[0].url,
      model: MODELS[0].id,
    };
  });

  // Translation State
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("English");
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Advanced Options
  const [glossary, setGlossary] = useState<GlossaryItem[]>(() => {
    const saved = localStorage.getItem("qwen_mt_glossary");
    return saved ? JSON.parse(saved) : [];
  });
  const [tmList, setTmList] = useState<GlossaryItem[]>(() => {
    const saved = localStorage.getItem("qwen_mt_tm_list");
    return saved ? JSON.parse(saved) : [];
  });
  const [domainPrompt, setDomainPrompt] = useState(() => {
    return localStorage.getItem("qwen_mt_domain") || "";
  });

  // History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem("qwen_mt_history");
    return saved ? JSON.parse(saved) : [];
  });

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem("qwen_mt_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("qwen_mt_glossary", JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    localStorage.setItem("qwen_mt_tm_list", JSON.stringify(tmList));
  }, [tmList]);

  useEffect(() => {
    localStorage.setItem("qwen_mt_domain", domainPrompt);
  }, [domainPrompt]);

  useEffect(() => {
    localStorage.setItem("qwen_mt_history", JSON.stringify(history));
  }, [history]);

  // Translation Logic
  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      setTranslatedText("");
      return;
    }

    if (!config.apiKey) {
      toast.error("Please configure your API Key in settings");
      setIsSettingsOpen(true);
      return;
    }

    setIsTranslating(true);
    try {
      const service = new QwenMTService(config);
      const options: TranslationOptions = {
        source_lang: sourceLang,
        target_lang: targetLang,
        terms: glossary.length > 0 ? glossary : undefined,
        tm_list: tmList.length > 0 ? tmList : undefined,
        domains: domainPrompt || undefined,
      };

      const result = await service.translate(sourceText, options);
      setTranslatedText(result.translatedText || "");

      // Add to history
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        sourceText,
        translatedText: result.translatedText || "",
        sourceLang,
        targetLang,
        timestamp: Date.now(),
      };
      setHistory(prev => [newItem, ...prev.slice(0, 49)]); // Keep last 50
    } catch (error: any) {
      toast.error(error.message || "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, config, glossary, domainPrompt]);

  // Debounced translation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText) handleTranslate();
    }, 800);
    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang]);

  const swapLanguages = () => {
    if (sourceLang === "auto") return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const clearHistory = () => {
    setHistory([]);
    toast.success("History cleared");
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between glass dark:glass-dark p-4 rounded-2xl shadow-xl border-white/20">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <Languages className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              Qwen-MT Glass
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-white/20"
              onClick={() => setIsHistoryOpen(true)}
            >
              <HistoryIcon className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-white/20"
              onClick={() => setIsSettingsOpen(true)}
            >
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Main Interface */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow">
          {/* Source Panel */}
          <Card className="glass dark:glass-dark border-white/20 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 font-medium">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent className="glass dark:glass-dark border-white/20">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-white/20"
                onClick={() => setSourceText("")}
                disabled={!sourceText}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="relative flex-grow">
              <Textarea 
                placeholder="Type to translate..."
                className="w-full h-full min-h-[300px] p-6 text-lg bg-transparent border-none focus-visible:ring-0 resize-none placeholder:text-muted-foreground/50"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
              {isTranslating && (
                <div className="absolute top-4 right-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                </div>
              )}
            </div>
          </Card>

          {/* Target Panel */}
          <Card className="glass dark:glass-dark border-white/20 shadow-2xl overflow-hidden flex flex-col relative">
            {/* Swap Button (Desktop) */}
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full glass dark:glass-dark border-white/20 shadow-lg hover:scale-110 transition-transform"
                onClick={swapLanguages}
                disabled={sourceLang === "auto"}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0 font-medium">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent className="glass dark:glass-dark border-white/20">
                  {SUPPORTED_LANGUAGES.filter(l => l.code !== "auto").map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-white/20"
                      onClick={() => copyToClipboard(translatedText)}
                      disabled={!translatedText}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-white/20"
                      disabled={!translatedText}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Listen</TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <div className="flex-grow p-6 text-lg font-medium text-primary/90 min-h-[300px] whitespace-pre-wrap">
              {translatedText || (
                <span className="text-muted-foreground/30 italic">Translation will appear here...</span>
              )}
            </div>
          </Card>
        </main>

        {/* Advanced Options */}
        <section className="glass dark:glass-dark p-6 rounded-2xl border-white/20 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-bold">Advanced Translation Options</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center space-x-2">
                  <span>Term Intervention</span>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3 h-3 opacity-50" /></TooltipTrigger>
                    <TooltipContent>Force specific translations for certain terms (Glossary)</TooltipContent>
                  </Tooltip>
                </Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-2 text-xs rounded-lg"
                  onClick={() => setGlossary([...glossary, { source: "", target: "" }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              
              <ScrollArea className="h-[120px] pr-4">
                <div className="space-y-2">
                  {glossary.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Input 
                        placeholder="Source" 
                        className="h-8 text-[10px] glass border-white/10"
                        value={item.source}
                        onChange={(e) => {
                          const newG = [...glossary];
                          newG[idx].source = e.target.value;
                          setGlossary(newG);
                        }}
                      />
                      <Input 
                        placeholder="Target" 
                        className="h-8 text-[10px] glass border-white/10"
                        value={item.target}
                        onChange={(e) => {
                          const newG = [...glossary];
                          newG[idx].target = e.target.value;
                          setGlossary(newG);
                        }}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => setGlossary(glossary.filter((_, i) => i !== idx))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {glossary.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4">No terms added</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center space-x-2">
                  <span>Translation Memory</span>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3 h-3 opacity-50" /></TooltipTrigger>
                    <TooltipContent>Provide examples of previous translations to guide the model</TooltipContent>
                  </Tooltip>
                </Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-2 text-xs rounded-lg"
                  onClick={() => setTmList([...tmList, { source: "", target: "" }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              
              <ScrollArea className="h-[120px] pr-4">
                <div className="space-y-2">
                  {tmList.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Input 
                        placeholder="Source sentence" 
                        className="h-8 text-[10px] glass border-white/10"
                        value={item.source}
                        onChange={(e) => {
                          const newT = [...tmList];
                          newT[idx].source = e.target.value;
                          setTmList(newT);
                        }}
                      />
                      <Input 
                        placeholder="Target sentence" 
                        className="h-8 text-[10px] glass border-white/10"
                        value={item.target}
                        onChange={(e) => {
                          const newT = [...tmList];
                          newT[idx].target = e.target.value;
                          setTmList(newT);
                        }}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => setTmList(tmList.filter((_, i) => i !== idx))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {tmList.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4">No memory items</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center space-x-2">
                <span>Domain Prompting</span>
                <Tooltip>
                  <TooltipTrigger><Info className="w-3 h-3 opacity-50" /></TooltipTrigger>
                  <TooltipContent>Guide the model with domain-specific context (e.g. "IT", "Medical")</TooltipContent>
                </Tooltip>
              </Label>
              <Textarea 
                placeholder="e.g. This is a technical document about cloud computing..."
                className="h-[120px] text-xs glass border-white/10 resize-none"
                value={domainPrompt}
                onChange={(e) => setDomainPrompt(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Modals */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="glass dark:glass-dark border-white/20 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>API Configuration</DialogTitle>
              <DialogDescription>
                Configure your Qwen-MT API settings. These are stored locally in your browser.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input 
                  id="apiKey" 
                  type="password"
                  placeholder="sk-..." 
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="glass border-white/10"
                />
                <p className="text-[10px] text-muted-foreground">
                  Get your key from Alibaba Cloud Model Studio.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="region">API Region</Label>
                <Select 
                  value={config.baseURL} 
                  onValueChange={(val) => setConfig({ ...config, baseURL: val })}
                >
                  <SelectTrigger className="glass border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass dark:glass-dark border-white/20">
                    {REGIONS.map(r => (
                      <SelectItem key={r.url} value={r.url}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Select 
                  value={config.model} 
                  onValueChange={(val) => setConfig({ ...config, model: val })}
                >
                  <SelectTrigger className="glass border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass dark:glass-dark border-white/20">
                    {MODELS.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsSettingsOpen(false)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="glass dark:glass-dark border-white/20 sm:max-w-[600px] h-[80vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Translation History</DialogTitle>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={clearHistory}>
                  <Trash2 className="w-4 h-4 mr-2" /> Clear All
                </Button>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-grow pr-4">
              <div className="space-y-4 py-4">
                {history.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl glass border-white/10 space-y-2 group">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <span>{item.sourceLang}</span>
                        <ArrowRightLeft className="w-2 h-2" />
                        <span>{item.targetLang}</span>
                      </div>
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <p className="text-sm line-clamp-2">{item.sourceText}</p>
                      <p className="text-sm font-medium text-primary line-clamp-2">{item.translatedText}</p>
                    </div>
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => {
                          setSourceText(item.sourceText);
                          setTranslatedText(item.translatedText);
                          setSourceLang(item.sourceLang);
                          setTargetLang(item.targetLang);
                          setIsHistoryOpen(false);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>No translation history yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
