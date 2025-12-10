import React, { useState } from 'react';
import { ReceiptData, ReceiptItem, Assignments, ChatMessage, AssignmentAction } from './types';
import FileUpload from './components/FileUpload';
import ReceiptList from './components/ReceiptList';
import ChatInterface from './components/ChatInterface';
import Summary from './components/Summary';
import { parseReceiptImage, processChatCommand } from './services/geminiService';

const App: React.FC = () => {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Helper to convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // remove "data:image/xyz;base64," prefix
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (file: File) => {
    setIsParsing(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await parseReceiptImage(base64, file.type);
      setReceiptData(data);
      // Initialize empty assignments
      const initialAssignments: Assignments = {};
      data.items.forEach(item => {
        initialAssignments[item.id] = [];
      });
      setAssignments(initialAssignments);
      
      // Add initial system message
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        text: `I've analyzed the receipt! I found ${data.items.length} items. You can now tell me who ordered what.`,
        timestamp: Date.now()
      }]);

    } catch (error) {
      console.error(error);
      alert("Failed to parse receipt. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!receiptData) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Calculate unique people from current assignments to support "everyone" commands
    const existingPeople = Array.from(new Set(
      Object.values(assignments).flat()
    )) as string[];

    try {
      // Process with Gemini, passing existing people context
      const response = await processChatCommand(text, receiptData.items, existingPeople);
      
      // Update Assignments based on operations
      setAssignments(prev => {
        const next = { ...prev };
        
        response.assignments.forEach((op: AssignmentAction) => {
          op.itemIds.forEach(itemId => {
            const currentAssignees = next[itemId] || [];
            
            if (op.action === 'assign') {
              // Add people if not already there
              const newAssignees = new Set([...currentAssignees, ...op.people]);
              next[itemId] = Array.from(newAssignees);
            } else if (op.action === 'unassign') {
              // Remove people
              next[itemId] = currentAssignees.filter(p => !op.people.includes(p));
            }
          });
        });
        
        return next;
      });

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.reply,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Sorry, I had trouble understanding that. Could you try rephrasing?",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <span className="material-icons text-white">splitscreen</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">SplitBill AI</h1>
        </div>
        {receiptData && (
          <button 
            onClick={() => {
              if(confirm("Start over with a new receipt?")) {
                setReceiptData(null);
                setMessages([]);
                setAssignments({});
              }
            }}
            className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            Reset
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative bg-gray-50 overflow-hidden">
        {!receiptData ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl h-96">
              <FileUpload onFileSelect={handleFileSelect} isLoading={isParsing} />
            </div>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-6 p-0 md:p-6 overflow-hidden">
            
            {/* Left Column: Receipt Items */}
            <div className="hidden md:block md:col-span-4 h-full overflow-hidden">
              <ReceiptList 
                items={receiptData.items} 
                assignments={assignments} 
                currency={receiptData.currency || '$'} 
              />
            </div>

            {/* Middle Column: Chat (and Mobile Receipt Toggle) */}
            <div className="col-span-1 md:col-span-5 h-full flex flex-col overflow-hidden">
              <div className="md:hidden p-2 flex justify-end">
                {/* Mobile toggle for Receipt List could go here, for now simpler layout */}
              </div>
              <ChatInterface 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                isProcessing={isProcessing}
              />
            </div>

            {/* Right Column: Summary */}
            <div className="col-span-1 md:col-span-3 h-auto md:h-full mt-4 md:mt-0 overflow-hidden">
               <Summary data={receiptData} assignments={assignments} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
