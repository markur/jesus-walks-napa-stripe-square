import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { Wine, Headphones, MessageSquare, Send, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  context?: string;
  model?: string;
  provider?: string;
}

export default function AIAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<'wine' | 'customerService' | 'general'>('general');
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
      context: activeContext
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiRequest('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage.content,
          context: activeContext
        })
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        isUser: false,
        timestamp: new Date(),
        context: response.context,
        model: response.model,
        provider: response.provider
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI agent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const contextLabels = {
    wine: { label: 'Wine Expert', icon: Wine, color: 'bg-purple-100 text-purple-800' },
    customerService: { label: 'Customer Service', icon: Headphones, color: 'bg-blue-100 text-blue-800' },
    general: { label: 'General Assistant', icon: MessageSquare, color: 'bg-gray-100 text-gray-800' }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get expert wine recommendations, customer service help, or general assistance from our AI-powered assistant.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Context Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Choose Assistant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(contextLabels).map(([key, { label, icon: Icon, color }]) => (
                  <Button
                    key={key}
                    variant={activeContext === key ? "default" : "outline"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => setActiveContext(key as any)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs opacity-75">
                        {key === 'wine' && 'Sommelier expertise'}
                        {key === 'customerService' && 'Support & help'}
                        {key === 'general' && 'General questions'}
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-auto p-2"
                  onClick={() => {
                    setActiveContext('wine');
                    setInput('What wine pairs well with grilled salmon?');
                  }}
                >
                  🍷 Wine pairing for salmon
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-auto p-2"
                  onClick={() => {
                    setActiveContext('wine');
                    setInput('Recommend a good red wine under $30');
                  }}
                >
                  🍇 Budget-friendly red wine
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-auto p-2"
                  onClick={() => {
                    setActiveContext('customerService');
                    setInput('How can I track my order?');
                  }}
                >
                  📦 Track my order
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(contextLabels[activeContext].icon, { className: "h-5 w-5" })}
                    {contextLabels[activeContext].label}
                  </CardTitle>
                  <Badge className={contextLabels[activeContext].color}>
                    Active
                  </Badge>
                </div>
              </CardHeader>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Hello! How can I help you today?</p>
                      <p className="text-sm">
                        {activeContext === 'wine' && 'Ask me about wine recommendations, pairings, or wine knowledge!'}
                        {activeContext === 'customerService' && 'I\'m here to help with orders, returns, or any questions!'}
                        {activeContext === 'general' && 'What would you like assistance with?'}
                      </p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                          <span>{message.timestamp.toLocaleTimeString()}</span>
                          {!message.isUser && message.model && (
                            <Badge variant="secondary" className="text-xs">
                              {message.model}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[85%]">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          </div>
                          <span className="text-sm text-gray-600">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-4 flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Ask ${contextLabels[activeContext].label.toLowerCase()}...`}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!input.trim() || isLoading}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}