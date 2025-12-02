import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Eraser, Paperclip, X, FileText } from 'lucide-react';
import { ChatMessage } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PLANS } from '../constants';

const ChatAgent: React.FC = () => {
  const { user, checkLimit } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Olá, companheiro. Aqui é o Antonio. Vamos falar de gestão? O que não se mede, não se gerencia. \n\nSe tiver algum relatório ou manual técnico, pode anexar aqui que eu analiso.",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [attachment, setAttachment] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadChatHistory();
    } else {
      setIsLoadingHistory(false);
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      setIsLoadingHistory(true);
      const userPlan = PLANS.find(p => p.id === user.plan) || PLANS[0];
      const historyDays = userPlan.limits.historyDays;

      // Calculate date limit
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - historyDays);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', limitDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        setIsLoadingHistory(false);
        return;
      }

      if (data && data.length > 0) {
        const loadedMessages: ChatMessage[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'model',
          text: msg.text,
          timestamp: new Date(msg.created_at),
        }));

        // Add welcome message if no messages or if oldest message is recent
        const hasWelcome = loadedMessages.some(m => m.id === 'welcome');
        if (!hasWelcome) {
          setMessages([
            {
              id: 'welcome',
              role: 'model',
              text: "Olá, companheiro. Aqui é o Antonio. Vamos falar de gestão? O que não se mede, não se gerencia. \n\nSe tiver algum relatório ou manual técnico, pode anexar aqui que eu analiso.",
              timestamp: new Date()
            },
            ...loadedMessages
          ]);
        } else {
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveMessage = async (message: ChatMessage, attachmentName?: string, attachmentMimeType?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          role: message.role,
          text: message.text,
          attachment_name: attachmentName || null,
          attachment_mime_type: attachmentMimeType || null,
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64Data = base64String.split(',')[1];
        
        setAttachment({
            name: file.name,
            data: base64Data,
            mimeType: file.type
        });
    };
    reader.readAsDataURL(file);
    
    // Reset input value to allow selecting the same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !attachment) || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: attachment ? `[Arquivo: ${attachment.name}] ${inputText}` : inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    const currentAttachment = attachment; // Capture current state
    setAttachment(null); // Clear UI attachment immediately
    setIsLoading(true);

    // Save user message
    await saveMessage(userMessage, currentAttachment?.name, currentAttachment?.mimeType);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        Você é o Antonio Chaker, renomado zootecnista e consultor de gestão pecuária no Brasil.
        
        SUA PERSONALIDADE:
        - Pragmático, direto e focado em resultados financeiros.
        - Você usa termos técnicos do setor (GMD, Lotação, Desembolso Cabeça/Mês, Margem sobre Venda, R$/@).
        - Você fala "na língua do pecuarista", usando expressões como "companheiro", "o boi é o caixa", "fazenda é empresa a céu aberto".
        - Você valoriza dados: "Quem não mede não gerencia".
        
        INSTRUÇÃO SOBRE ARQUIVOS:
        - Se o usuário enviar um arquivo (PDF, Imagem, Texto), analise-o profundamente.
        - Use os dados do arquivo como a verdade absoluta para a resposta.
        - Se for um manual de regras (como o PDF de Identidade do Agente), siga as fórmulas contidas nele estritamente.
      `;

      // Build history for context (ignoring previous attachments to save tokens/complexity in this demo, 
      // but keeping text history)
      const history = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.5, 
        },
        history: history
      });

      // Prepare contents
      let messageContent;
      if (currentAttachment) {
          messageContent = {
              parts: [
                  { text: inputText || "Analise este arquivo anexado." },
                  {
                      inlineData: {
                          mimeType: currentAttachment.mimeType,
                          data: currentAttachment.data
                      }
                  }
              ]
          };
      } else {
          messageContent = {
              parts: [{ text: inputText }]
          };
      }

      // @ts-ignore - The types definition might be slightly stricter than the actual API allow for 'message' param overload
      const result = await chat.sendMessage(messageContent);
      
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMessage]);

      // Save model response
      await saveMessage(modelMessage);

    } catch (error) {
      console.error("Erro na API:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Tive um problema ao processar sua solicitação. Se enviou um arquivo muito grande, tente um menor.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
      if (!user) return;

      // Delete all messages from database
      try {
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error('Error clearing chat history:', error);
        }
      } catch (error) {
        console.error('Error clearing chat history:', error);
      }

      setMessages([{
        id: 'welcome',
        role: 'model',
        text: "Histórico limpo. Vamos começar uma nova análise.",
        timestamp: new Date()
      }]);
      setAttachment(null);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-ai-border shadow-sm overflow-hidden">
      
      {/* Header Area */}
      <div className="p-4 border-b border-ai-border bg-ai-surface/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ai-text text-white flex items-center justify-center">
                <Bot size={20} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-ai-text">Consultor Antonio</h3>
                <p className="text-xs text-ai-subtext">Especialista em Gestão e Métricas</p>
            </div>
        </div>
        <button 
            onClick={handleClear}
            className="p-2 text-ai-subtext hover:text-rose-600 transition-colors"
            title="Limpar conversa"
        >
            <Eraser size={16} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 size={24} className="animate-spin text-ai-subtext" />
          </div>
        ) : (
          messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-ai-text text-white rounded-br-none' 
                : 'bg-ai-surface2 text-ai-text rounded-bl-none border border-ai-border/50'}
            `}>
              {msg.text.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
              ))}
              <span className={`text-[10px] block mt-1 opacity-70 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))
        )}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-ai-surface2 rounded-2xl rounded-bl-none px-4 py-3 border border-ai-border/50 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-ai-subtext" />
                <span className="text-xs text-ai-subtext">Analisando dados...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-ai-border">
        {/* Attachment Preview */}
        {attachment && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-ai-surface2 rounded-lg border border-ai-border w-fit">
                <FileText size={16} className="text-ai-accent" />
                <span className="text-xs font-medium max-w-[200px] truncate">{attachment.name}</span>
                <button 
                    onClick={removeAttachment}
                    className="ml-2 text-ai-subtext hover:text-rose-600"
                >
                    <X size={14} />
                </button>
            </div>
        )}

        <div className="flex items-end gap-2 bg-ai-surface rounded-xl border border-ai-border focus-within:border-ai-accent focus-within:ring-1 focus-within:ring-ai-accent/20 transition-all p-2">
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.csv,.txt,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-ai-subtext hover:text-ai-text hover:bg-ai-border/30 rounded-lg transition-colors"
                title="Anexar arquivo (PDF, Imagem, Texto)"
            >
                <Paperclip size={18} />
            </button>

            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Pergunte ou anexe um relatório..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-ai-text resize-none max-h-32 min-h-[24px] py-2"
                rows={1}
                style={{ height: 'auto', minHeight: '44px' }}
            />
            <button 
                onClick={handleSend}
                disabled={(!inputText.trim() && !attachment) || isLoading}
                className={`
                    p-2 rounded-lg mb-0.5 transition-colors
                    ${(!inputText.trim() && !attachment) || isLoading 
                        ? 'text-ai-border cursor-not-allowed' 
                        : 'bg-ai-text text-white hover:bg-black'}
                `}
            >
                <Send size={18} />
            </button>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-ai-subtext">A IA pode cometer erros. Verifique informações críticas.</span>
        </div>
      </div>
    </div>
  );
};

export default ChatAgent;