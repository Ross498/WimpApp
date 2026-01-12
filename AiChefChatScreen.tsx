import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getCurrentChef } from '../utils/chefUtils';
import { ArrowLeft, Camera, ChefHat } from '../components/SharedIcons';
import { Send, Info, Lightbulb, X } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuthTrigger } from '@/utils/authTriggers';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

const AiChefChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showChefProfileModal, setShowChefProfileModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputHeight, setInputHeight] = useState(44); // Start with base height
  const queryClient = useQueryClient();

  // Get current chef and subscription status
  const currentChef = getCurrentChef();
  const { getRemainingUsage, incrementUsage, isPremium, subscriptionData } = useSubscription();
  const { requireAuth } = useAuthTrigger();

  // Apply scroll lock when any modal is open
  useScrollLock(showInfoModal || showChefProfileModal);

  // Fetch chat history with proper error handling
  const { data: chatHistory } = useQuery({
    queryKey: ['/api/ai-chef-chat/history'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ai-chef-chat/history');

        if (!response.ok) {
          console.log('Chat history endpoint not available:', response.status);
          return { data: [] };
        }

        const result = await response.json();
        console.log('Chat history loaded:', result);
        return result;
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
        return { data: [] };
      }
    },
    retry: false
  });

  // Load chat history on component mount with default welcome message
  useEffect(() => {
    if (chatHistory?.data && Array.isArray(chatHistory.data)) {
      if (chatHistory.data.length > 0) {
        const formattedMessages = chatHistory.data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          imageUrl: msg.imageUrl
        }));
        setMessages(formattedMessages);
      } else {
        // Show default welcome message when no history exists
        const welcomeMessage: ChatMessage = {
          id: 'welcome-default',
          role: 'assistant',
          content: `👋 Hey there! I'm ${currentChef.name}, your AI cooking companion this week! 

I'm here to help you with anything cooking-related - whether you need recipe suggestions, cooking tips, ingredient substitutions, or just want to chat about food! 

What's cooking today? 🍳`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } else if (chatHistory !== undefined) {
      // If chat history loaded but is empty, show welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome-default',
        role: 'assistant',
        content: `👋 Hey there! I'm ${currentChef.name}, your AI cooking companion this week! 

I'm here to help you with anything cooking-related - whether you need recipe suggestions, cooking tips, ingredient substitutions, or just want to chat about food! 

What's cooking today? 🍳`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [chatHistory, currentChef.name]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, imageFile }: { message: string; imageFile?: File }) => {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('chefPersonality', currentChef.id);

      if (imageFile) {
        formData.append('image', imageFile);
      }

      // Use apiRequest with FormData (it automatically handles auth and content-type for FormData)
      // CRITICAL FIX: apiRequest already returns parsed JSON data and throws on errors
      // Don't treat return value as a Response object - it's already the parsed data
      const data = await apiRequest('/api/ai-chef-chat', {
        method: 'POST',
        body: formData
      });

      return data;
    },
    onMutate: ({ message }) => {
      // Immediately add user message to UI for instant feedback
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
        imageUrl: imagePreview || undefined
      };

      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setSelectedImage(null);
      setImagePreview(null);
    },
    onSuccess: async (data) => {
      console.log('AI Chat Response:', data);

      // CRITICAL FIX: Backend wraps response in data.data, not at top level
      const responseData = data.data || data; // Handle both {data: {response}} and {response} formats
      
      if (data.success && (responseData.response || responseData.reply || data.data.response || data.reply)) {
        // Add AI response
        const aiMessage: ChatMessage = {
          id: responseData.id || data.id || `ai-${Date.now()}`,
          role: 'assistant',
          content: responseData.response || responseData.reply || data.data.response || data.reply,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);

        // Increment usage and invalidate subscription data to update message counter
        if (!isPremium) {
          await incrementUsage('aiChefChat');
          queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
        }

        // Handle ingredient management responses - COMPREHENSIVE CACHE INVALIDATION
        if (data.pantryUpdated || data.subtractedIngredients?.length > 0) {
          console.log('🔄 CRITICAL CACHE INVALIDATION: Pantry updated or ingredients subtracted');

          // Invalidate ALL possible ingredient-related query keys
          queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
          queryClient.invalidateQueries({ queryKey: ['/api/household/pantry'] });
          queryClient.invalidateQueries({ queryKey: ['/api/household'] });
          queryClient.invalidateQueries({ queryKey: ['/api/pantry'] });
          queryClient.invalidateQueries({ queryKey: ['/api/meals/unified'] });

          // Force immediate refresh of critical data
          queryClient.refetchQueries({ queryKey: ['/api/ingredients'] });

          // Also trigger a window event to notify other components
          window.dispatchEvent(new CustomEvent('ingredientsUpdated', {
            detail: { subtractedIngredients: data.subtractedIngredients }
          }));

          console.log('✅ CACHE INVALIDATION COMPLETE: All ingredient queries invalidated and refreshed');
        }
      } else {
        console.error('Invalid response format:', data);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I received an invalid response. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  // 🎯 GUEST ACCESS: Allow all users to see and interact with chat interface
  // Authentication will be triggered on actual usage, not on UI display
  const canSendMessage = inputMessage.trim().length > 0 && !isLoading;

  // Simplified auto-resize textarea function for mobile compatibility
  const handleAutoResize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 44), 88);
    textarea.style.height = newHeight + 'px';
    setInputHeight(newHeight);
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Use setTimeout to ensure the DOM is updated before calculating height
    setTimeout(handleAutoResize, 0);
  };

  // Reset input height when message is cleared
  const resetInputHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '44px';
      setInputHeight(44);
    }
  };

  const handleSendMessage = async () => {
    if (!canSendMessage || isLoading) return;

    // 🔐 AUTHENTICATION TRIGGER: Protect AI chef chat
    if (!requireAuth('AI_FEATURES', undefined, '🤖 Chat with your personal AI chef! Sign up to get unlimited cooking advice, recipe suggestions, and personalized guidance from Chef ' + currentChef.name + '.')) {
      return; // Authentication required, exit early
    }

    setIsLoading(true);
    setInputMessage(''); // Clear input immediately
    resetInputHeight(); // Reset textarea height

    sendMessageMutation.mutate({
      message: inputMessage.trim(),
      imageFile: selectedImage || undefined
    });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch tip of the day from server
  const fetchTipOfDay = async () => {
    try {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch('/api/ai-chef-chat/tip-of-day', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tip');
      }

      const data = await response.json();
      return data.tip;
    } catch (error) {
      console.error('Error fetching tip:', error);
      // Fallback tip
      return "Always taste your food as you cook to adjust seasoning perfectly!";
    }
  };

  const showTipOfDay = async () => {
    const tip = await fetchTipOfDay();
    const tipMessage: ChatMessage = {
      id: `tip-${Date.now()}`,
      role: 'assistant',
      content: `🍳 **Tip of the Day**: ${tip}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, tipMessage]);
  };

  return (
    <div className="flex flex-col bg-white safe-area" style={{ height: '100dvh' }}>
      {/* FIXED: Green Top Navigation Bar - Stays fixed, won't shift with keyboard */}
      <div 
        className="fixed top-0 left-0 right-0 shadow-sm border-b px-3 py-2 flex items-center justify-between z-50"
        style={{
          background: '#22c55e',
          borderBottomColor: '#16a34a',
          paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))'
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 hover:bg-green-600 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <button
            onClick={() => setShowChefProfileModal(true)}
            className="flex items-center gap-2 hover:bg-green-600 rounded-lg p-1.5 transition-colors flex-1 min-w-0 touch-manipulation"
            title="View Chef Profile"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center ring-2 ring-white ring-opacity-50 flex-shrink-0">
              <img
                src={currentChef.avatar || currentChef.image}
                alt={currentChef.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  const nextElement = target.nextElementSibling as HTMLElement;
                  target.style.display = 'none';
                  if (nextElement) {
                    nextElement.style.display = 'flex';
                  }
                }}
              />
              <div className="w-full h-full bg-navy-100 flex items-center justify-center" style={{display: 'none'}}>
                <ChefHat size={16} className="text-navy-600" />
              </div>
            </div>
            <div className="text-left flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-white whitespace-nowrap truncate">Chef {currentChef.name}</h1>
              <p className="text-xs text-green-100 whitespace-nowrap truncate">AI Cooking Assistant</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Info Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1.5 hover:bg-green-600 rounded-lg transition-colors focus:outline-none active:outline-none touch-manipulation"
            title="Chat Info"
            aria-label="Chat information"
          >
            <Info size={16} className="text-white" />
          </button>

          {/* Tip Button */}
          <button
            onClick={showTipOfDay}
            className="p-1.5 hover:bg-green-600 rounded-lg transition-colors focus:outline-none active:outline-none touch-manipulation"
            title="Get a cooking tip from your chef"
            aria-label="Get cooking tip"
          >
            <Lightbulb size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Messages Container - Enhanced mobile spacing */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-white"
        style={{ 
          paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))', 
          paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))', // REDUCED: Changed from 100px to 90px
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-navy-100 flex items-center justify-center mb-4">
              <ChefHat size={32} className="text-navy-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to Chef {currentChef.name}!
            </h3>
            <p className="text-gray-600 max-w-md text-sm leading-relaxed">
              Ask me anything about cooking! I can help with recipes, techniques, ingredient substitutions, and more.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                  message.role === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-white shadow-sm border border-gray-100 text-gray-900'
                }`}
              >
                {message.imageUrl && (
                  <div className="max-w-full w-auto mb-2">
                    <img
                      src={message.imageUrl}
                      alt="Shared image"
                      className="w-full h-auto rounded-xl overflow-hidden object-cover max-w-[200px]"
                    />
                  </div>
                )}
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    message.role === 'user' ? 'text-white font-medium' : 'text-gray-900'
                  }`}
                  style={{
                    fontWeight: message.role === 'user' ? '500' : '500',
                    color: message.role === 'user' ? '#ffffff' : '#111827'
                  }}
                >
                  {message.content}
                </p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 max-w-[85%]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Chef {currentChef.name} is typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 pb-2" style={{ 
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }}>
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs touch-manipulation"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* FIXED: Input Area - Positioned higher and send button without background */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 z-40 shadow-lg" // REDUCED: Changed py-3 to py-2
        style={{ 
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', // REDUCED: Changed from 12px to 8px
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // 🔐 AUTHENTICATION TRIGGER: Protect image upload feature
              if (!requireAuth('AI_FEATURES', undefined, '📸 Upload food photos! Sign up to analyze your ingredients and get personalized cooking advice from your AI chef.')) {
                return; // Authentication required, exit early
              }
              fileInputRef.current?.click();
            }}
            className="flex items-center justify-center rounded-xl transition-colors w-11 h-11 text-gray-600 active:bg-gray-100 touch-manipulation"
            disabled={isLoading}
            title="Upload food photos for AI analysis"
            aria-label="Upload image"
          >
            <Camera size={20} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && canSendMessage) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask chef about cooking..."
              disabled={isLoading}
              rows={1}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm leading-5 transition-all overflow-hidden bg-white touch-manipulation"
              style={{ 
                height: `${inputHeight}px`,
                minHeight: '44px',
                maxHeight: '88px',
                // ZOOM PREVENTION - Critical for mobile
                fontSize: '16px',
                transform: 'scale(1)',
                WebkitAppearance: 'none',
                borderRadius: '12px',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* FIXED: Send Button - No background, just icon */}
          <button
            onClick={handleSendMessage}
            disabled={!canSendMessage || isLoading}
            className="flex items-center justify-center rounded-xl transition-colors w-11 h-11 disabled:cursor-not-allowed touch-manipulation bg-transparent" // ADDED: bg-transparent
            title="Send message"
            aria-label="Send message"
          >
            <Send size={20} className={
              canSendMessage && !isLoading 
                ? 'text-green-500 hover:text-green-600 transition-colors' 
                : 'text-gray-300'
            } />
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Information Modal - Mobile Optimized */}
      {showInfoModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-0 sm:items-center sm:p-4"
          style={{
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="bg-white rounded-t-2xl rounded-b-none sm:rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto safe-area-bottom">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Info size={20} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">AI Chef Chat</h2>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-gray-400 hover:text-gray-600 touch-manipulation"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Chat with your AI chef for personalized cooking advice, recipe suggestions, and culinary guidance.
                    Your chef can help with ingredient substitutions, cooking techniques, and meal planning.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Features</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Recipe recommendations based on your ingredients</li>
                    <li>• Cooking tips and techniques</li>
                    <li>• Ingredient substitution suggestions</li>
                    <li>• Photo analysis of your ingredients</li>
                    <li>• Meal planning assistance</li>
                    <li>• Nutritional guidance</li>
                    <li>• <strong>Pantry Management:</strong> Add/subtract ingredients from your pantry</li>
                    <li>• <strong>Meal Tracking:</strong> Tell me what you ate to auto-subtract ingredients</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Usage Limits</h3>
                  {isPremium ? (
                    <p className="text-green-600 text-sm font-medium">
                      🎉 Premium: Unlimited AI chef conversations and photo analysis
                    </p>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      <p className="mb-2">Free Plan Limits:</p>
                      <ul className="space-y-1">
                        <li>• {getRemainingUsage('aiChefChat')}/{subscriptionData?.limits?.aiChefChat?.weekly || 5} chat messages per week</li>
                        <li>• Photo analysis requires Premium upgrade</li>
                      </ul>
                      <p className="text-green-600 mt-2 font-medium">
                        Upgrade to Premium for unlimited access!
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Tips for Best Results</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Be specific about your cooking goals</li>
                    <li>• Mention any dietary restrictions</li>
                    <li>• Ask about ingredient quantities and timing</li>
                    <li>• Share photos of your ingredients for better suggestions</li>
                  </ul>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors touch-manipulation font-medium"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chef Profile Modal - Mobile Optimized */}
      {showChefProfileModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-0 sm:items-center sm:p-4"
          style={{
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="bg-white rounded-t-2xl rounded-b-none sm:rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto safe-area-bottom">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-navy-100 flex items-center justify-center">
                    <img
                      src={currentChef.avatar}
                      alt={currentChef.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const nextElement = target.nextElementSibling as HTMLElement;
                        target.style.display = 'none';
                        if (nextElement) {
                          nextElement.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="w-full h-full bg-navy-100 flex items-center justify-center" style={{display: 'none'}}>
                      <ChefHat size={24} className="text-navy-600" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{currentChef.name}</h2>
                    <p className="text-sm text-gray-500">AI Cooking Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChefProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600 touch-manipulation"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">About {currentChef.name}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {currentChef.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Personality</h3>
                  <p className="text-gray-600 text-sm capitalize">
                    {currentChef.personality}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Specialty</h3>
                  <p className="text-gray-600 text-sm">
                    {currentChef.speciality}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Favorite Meal</h3>
                  <p className="text-gray-600 text-sm">
                    {currentChef.favoriteMeal}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">WIMP Achievements</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    {currentChef.wimpAchievements.map((achievement, index) => (
                      <li key={index}>🏆 {achievement}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Chef's Greeting</h3>
                  <p className="text-gray-600 text-sm italic">
                    "{currentChef.greeting}"
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowChefProfileModal(false)}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors touch-manipulation font-medium"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .safe-area {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .touch-manipulation {
          touch-action: manipulation;
        }

        /* PREVENT ZOOMING ON ENTIRE SCREEN */
        body {
          touch-action: pan-x pan-y;
          -webkit-text-size-adjust: none;
          text-size-adjust: none;
          -webkit-user-select: none;
          user-select: none;
        }

        /* Specifically prevent zooming on input elements */
        textarea, input, select {
          font-size: 16px !important;
          max-height: 44px;
          transform: scale(1);
          -webkit-transform: scale(1);
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        /* Disable double-tap to zoom */
        * {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        /* Ensure no zoom on focus */
        textarea:focus, input:focus {
          font-size: 16px !important;
          transform: scale(1) !important;
          -webkit-transform: scale(1) !important;
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); }
          50% { box-shadow: 0 0 0 8px rgba(251, 146, 60, 0.1); }
        }
        .animate-pulse-subtle {
          animation: glow 3s ease-in-out;
        }
        .loading-dot {
          animation: pulse 1.5s ease-in-out infinite;
        }
        .loading-dot:nth-child(2) {
          animation-delay: 0.3s;
        }
        .loading-dot:nth-child(3) {
          animation-delay: 0.6s;
        }
        .user-message-text {
          color: white !important;
        }
        .ai-message-text {
          color: #1f2937 !important;
        }
        @keyframes pulse {
          0%, 70%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          35% {
            transform: scale(1.1);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default AiChefChatScreen;