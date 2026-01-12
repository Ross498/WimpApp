// EXACT React fetch fix for AI Chef Chat
// Problem: Backend returns 'reply' but frontend sometimes expects 'response'
// Solution: Consistent handling in both sendMessage() and sendMessageWithImage()

// WORKING PATTERN (already in sendMessage):
const data = await response.json();
if (response.ok && data.success) {
  let responseText = data.reply || data.response; // ✅ Handle both properties
  const aiMessage: Message = {
    id: (Date.now() + 1).toString(),
    text: responseText,
    isUser: false,
    timestamp: new Date()
  };
  setMessages(prev => [...prev, aiMessage]);
}

// BROKEN PATTERN (was in sendMessageWithImage):
// text: data.response, // ❌ Only checks 'response', ignores 'reply'

// SERVER LOGS PROOF BACKEND WORKS:
// POST /api/ai-chef-chat 200 in 2905ms :: {"success":true,"reply":"Cooking pasta …"

// Therefore the fix is simply ensuring both functions use the same property handling:
// data.reply || data.response

// This guarantees UI displays responses regardless of which property the backend uses.