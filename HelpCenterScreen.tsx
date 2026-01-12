import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, Book, Star, Users, Camera, ShoppingCart, Settings } from 'lucide-react';

const HelpCenterScreen: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchTerm] = useState(''); // Search functionality simplified
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqData = [
    {
      id: 'getting-started',
      category: 'Getting Started',
      icon: <Star size={20} />,
      question: 'How does the 3-day trial work?',
      answer: 'New users get full access to all features for 3 days! After registration, you can explore recipes, scan ingredients, use AI chat, and manage your pantry completely free. After the trial ends, subscribe to continue using all features.'
    },
    {
      id: 'pantry-management',
      category: 'Pantry & Ingredients',
      icon: <ShoppingCart size={20} />,
      question: 'How do I manage my pantry and track expiry dates?',
      answer: 'Add ingredients manually or scan them with the camera. For each ingredient, you can:\n\n• Set expiry dates to track freshness\n• Specify quantities and units\n• Categorize items (dairy, meat, vegetables, etc.)\n• Get notifications when items are about to expire\n\nThe app shows expiring items in the "Expiring Soon" category to help reduce food waste.'
    },
    {
      id: 'expiry-calculation',
      category: 'Pantry & Ingredients',
      icon: <Camera size={20} />,
      question: 'How is expiry calculated?',
      answer: 'Expiry tracking is simple and flexible:\n\n• **Manual entry**: You set the exact expiry date when adding ingredients\n• **Optional dates**: If you don\'t add an expiry date, the ingredient won\'t appear in expiry notifications\n• **Notifications**: Enable expiry notifications in your profile to get alerts 1-3 days before items expire\n• **Categories**: Items expiring within 3 days appear in the "Expiring Soon" section\n\nThe system uses the dates you provide to calculate days remaining and send timely reminders.'
    },
    {
      id: 'recipe-scanning',
      category: 'Recipes',
      icon: <Book size={20} />,
      question: 'How do I scan recipes?',
      answer: 'Use the Recipe Scanner to digitize recipes from cookbooks, magazines, or handwritten notes:\n\n1. Tap the Recipe Scanner card on the Meals screen\n2. Take a photo of the recipe\n3. AI extracts ingredients, instructions, and details\n4. Edit if needed and save to your recipe collection\n\nScanned recipes appear in the "Scanned Recipes" category.'
    },
    {
      id: 'ingredient-matching',
      category: 'Recipes',
      icon: <Star size={20} />,
      question: 'How does ingredient matching work?',
      answer: 'The app automatically checks which recipes you can make with your pantry ingredients:\n\n• **For You tab**: Shows recipes sorted by how many ingredients you already have\n• **Green indicators**: See at a glance how many ingredients you have vs need\n• **Smart filtering**: Prioritizes recipes you can make now or with minimal shopping\n\nThis helps you use what you have and reduce food waste!'
    },
    {
      id: 'ai-chef-chat',
      category: 'AI Features',
      icon: <Users size={20} />,
      question: 'How do I use the AI chef chat?',
      answer: 'Chat with our weekly rotating AI chefs for cooking help:\n\n• **Ask questions**: Get cooking tips, substitution advice, and recipe suggestions\n• **Voice input**: Use voice recognition to ask questions hands-free while cooking\n• **Upload photos**: Send ingredient photos for identification and recipe ideas\n• **Weekly rotation**: New chef personality each week for variety\n\nAccess AI chat from the bottom navigation or expandable FAB button.'
    },
    {
      id: 'shopping-list',
      category: 'Shopping',
      icon: <ShoppingCart size={20} />,
      question: 'How does the shopping list work?',
      answer: 'Manage your shopping easily:\n\n• **Add items**: Manually add ingredients or add missing ingredients from recipes\n• **Categories**: Items are automatically organized by category (dairy, produce, etc.)\n• **Check off**: Mark items as purchased while shopping\n• **Smart suggestions**: Get ingredient recommendations based on recipes you want to make'
    },
    {
      id: 'categories',
      category: 'Recipes',
      icon: <Book size={20} />,
      question: 'What are the recipe categories?',
      answer: 'Browse recipes by category:\n\n• **For You**: Personalized recommendations based on your pantry\n• **All Recipes**: Complete recipe library\n• **Favorites**: Recipes you\'ve favorited\n• **Scanned Recipes**: Recipes you\'ve scanned from books/photos\n• **Make Now**: Recipes you can make with current ingredients\n• **Category filters**: Browse by cuisine type, difficulty, or cooking time'
    },
    {
      id: 'camera-features',
      category: 'AI Features',
      icon: <Camera size={20} />,
      question: 'What can I do with the camera?',
      answer: 'The camera has multiple uses:\n\n• **Scan recipes**: Digitize recipes from cookbooks or photos\n• **Identify ingredients**: Take a photo to identify unknown ingredients\n• **Add to pantry**: Quick-add ingredients with automatic recognition\n• **Voice commands**: Use Whisper voice recognition while scanning'
    },
    {
      id: 'subscription',
      category: 'Subscription',
      icon: <Star size={20} />,
      question: 'What happens after my trial ends?',
      answer: 'After your 3-day trial:\n\n• You\'ll need to subscribe to continue using the app\n• All features require an active subscription\n• Your data (recipes, pantry, favorites) is preserved\n• Subscribe to regain full access immediately\n\nNo features are available without an active subscription after trial expiration.'
    },
    {
      id: 'notifications',
      category: 'Settings',
      icon: <Settings size={20} />,
      question: 'How do I enable expiry notifications?',
      answer: 'To get notified about expiring ingredients:\n\n1. Go to Profile → Tap settings gear icon\n2. Toggle "Ingredient Expiry" notification\n3. Allow browser/app notification permissions when prompted\n4. You\'ll receive alerts 1-3 days before items expire\n\nNotifications help you use ingredients before they go bad!'
    },
    {
      id: 'troubleshooting',
      category: 'Troubleshooting',
      icon: <HelpCircle size={20} />,
      question: 'App not working properly? Common fixes:',
      answer: 'Try these steps: 1) Refresh the page/restart app, 2) Clear browser cache, 3) Check internet connection, 4) Update to latest version, 5) Disable ad blockers, 6) Try different browser/device. If issues persist, contact support through email below.'
    }
  ];

  const categories = ['All', 'Getting Started', 'Pantry & Ingredients', 'Recipes', 'AI Features', 'Shopping', 'Subscription', 'Settings', 'Troubleshooting'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLocation('/profile')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Help Center</h1>
                <p className="text-sm text-gray-500">Find answers to common questions</p>
              </div>
            </div>
            <div className="text-2xl">❓</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search hidden for native app experience */}

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-[#22c55e] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.map((faq) => (
            <div key={faq.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-[#22c55e]">
                      {faq.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                      <p className="text-sm text-gray-500">{faq.category}</p>
                    </div>
                  </div>
                  {expandedFAQ === faq.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
              
              {expandedFAQ === faq.id && (
                <div className="px-6 pb-4">
                  <div className="pl-8 text-gray-700 leading-relaxed whitespace-pre-line">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No help articles found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter</p>
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-2">Still need help?</h3>
          <p className="text-green-700 mb-4">
            Can't find what you're looking for? Our support team is here to help you get the most out of WIMP Kitchen Companion.
          </p>
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">Contact Support</h4>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-[#22c55e] text-white p-2 rounded-full">
                <HelpCircle size={20} />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Email Support</p>
                <p className="text-[#22c55e] text-sm">ross@wimpapp.co.za</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              We typically respond within 24 hours
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => window.location.href = 'mailto:ross@wimpapp.co.za'}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Email Support
            </button>
            <button 
              disabled
              className="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
            >
              Community Forum (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterScreen;
