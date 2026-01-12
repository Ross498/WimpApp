import { useState, useRef, useEffect } from 'react';
import { Mic, X, Loader2, Check } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { apiRequest } from '@/lib/queryClient';
import { getUnifiedIngredientIcon } from '@/utils/unifiedIconSystem';

interface DetectedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

interface VoiceAIRecorderScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onItemsDetected?: (items: DetectedItem[]) => void;
}

const VoiceAIRecorderScreen = ({ isOpen, onClose, onItemsDetected }: VoiceAIRecorderScreenProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsRecording(false);
      setIsProcessing(false);
      setTranscript('');
      setDetectedItems([]);
      setShowPreview(false);
      setSelectedItems(new Set());
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: "Recording started", description: "Speak clearly about your ingredients" });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({ 
        title: "Microphone Error", 
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await apiRequest('/api/voice-recognition/process', {
        method: 'POST',
        body: formData,
        headers: {}
      });

      if (response.success && response.transcript) {
        setTranscript(response.transcript);
        
        if (response.detectedItems && response.detectedItems.length > 0) {
          setDetectedItems(response.detectedItems);
          setSelectedItems(new Set(response.detectedItems.map((_: any, index: number) => index)));
          setShowPreview(true);
        } else {
          toast({
            title: "No ingredients detected",
            description: "Try again and mention specific ingredients with quantities",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Processing Failed",
        description: "Could not process your voice recording. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItems = async () => {
    const itemsToAdd = detectedItems.filter((_, index) => selectedItems.has(index));
    
    if (itemsToAdd.length === 0) {
      toast({ title: "No items selected", variant: "destructive" });
      return;
    }

    try {
      for (const item of itemsToAdd) {
        await apiRequest('/api/ingredients', {
          method: 'POST',
          body: JSON.stringify(item)
        });
      }

      toast({
        title: "Success",
        description: `Added ${itemsToAdd.length} ingredient${itemsToAdd.length > 1 ? 's' : ''} to your pantry`
      });

      if (onItemsDetected) {
        onItemsDetected(itemsToAdd);
      }

      onClose();
    } catch (error) {
      console.error('Error adding items:', error);
      toast({
        title: "Error",
        description: "Could not add some ingredients. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleItemSelection = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-green-500 p-4 flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">Voice Recognition</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            data-testid="button-close-voice-recorder"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showPreview ? (
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Recording Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl'
                }`}
                data-testid="button-record"
              >
                {isProcessing ? (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : (
                  <Mic className="w-12 h-12 text-white" />
                )}
              </button>

              <div className="text-center">
                <p className="text-lg font-medium text-gray-800">
                  {isRecording ? 'Recording...' : isProcessing ? 'Processing...' : 'Tap to Start Recording'}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {isRecording ? 'Tap again to stop' : isProcessing ? 'Analyzing your voice' : 'Speak clearly about your ingredients'}
                </p>
              </div>

              {/* Tips Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full space-y-3">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  Speaking Tips:
                </h3>
                <ul className="space-y-2 text-sm text-green-900">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>Mention the <strong>quantity</strong> and <strong>unit</strong> (e.g., "2 apples", "500 grams of flour")</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>Speak clearly and at a moderate pace</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>You can list multiple ingredients in one recording</span>
                  </li>
                </ul>

                <div className="mt-3 pt-3 border-t border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Common Mistakes:</h4>
                  <ul className="space-y-1 text-sm text-green-900">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>"Some tomatoes" (no quantity)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>"3 tomatoes" or "1 kilogram of tomatoes"</span>
                    </li>
                  </ul>
                </div>
              </div>

              {transcript && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full">
                  <p className="text-xs text-gray-500 mb-2">Transcript:</p>
                  <p className="text-sm text-gray-800">{transcript}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Detected Ingredients</h3>
              
              <div className="space-y-2">
                {detectedItems.map((item, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 transition-all ${
                      selectedItems.has(index)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    data-testid={`item-${index}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(index)}
                        onChange={() => toggleItemSelection(index)}
                        className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                      />
                      <img
                        src={getUnifiedIngredientIcon(item.name)}
                        alt={item.name}
                        className="w-12 h-12 object-contain"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                      </div>
                      {selectedItems.has(index) && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-16">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...detectedItems];
                          newItems[index].quantity = parseFloat(e.target.value) || 1;
                          setDetectedItems(newItems);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min="0.1"
                        step="0.1"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => {
                          const newItems = [...detectedItems];
                          newItems[index].unit = e.target.value;
                          setDetectedItems(newItems);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="pieces">pieces</option>
                        <option value="grams">grams</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="liters">liters</option>
                        <option value="cups">cups</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddItems}
                disabled={selectedItems.size === 0}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                data-testid="button-add-to-pantry"
              >
                Add {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} to Pantry
              </button>

              <button
                onClick={() => setShowPreview(false)}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                data-testid="button-record-again"
              >
                Record Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAIRecorderScreen;
