import React, { useMemo, useState } from 'react';
import { ReceiptData, Assignments, PersonTotal } from '../types';
import { auditSplit } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface SummaryProps {
  data: ReceiptData;
  assignments: Assignments;
}

const Summary: React.FC<SummaryProps> = ({ data, assignments }) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const summary = useMemo(() => {
    const peopleMap = new Map<string, PersonTotal>();
    const unassignedItems: typeof data.items = [];

    // 1. Calculate per-item cost per person (handling shared items)
    data.items.forEach(item => {
      const assignedTo = assignments[item.id] || [];
      if (assignedTo.length === 0) {
        unassignedItems.push(item);
        return;
      }

      const splitCount = assignedTo.length;
      const pricePerPerson = item.price / splitCount;

      assignedTo.forEach(personName => {
        if (!peopleMap.has(personName)) {
          peopleMap.set(personName, {
            name: personName,
            subtotal: 0,
            tax: 0,
            tip: 0,
            total: 0,
            items: []
          });
        }
        const person = peopleMap.get(personName)!;
        person.subtotal += pricePerPerson;
        // Add item reference
        person.items.push(item);
      });
    });

    // 2. Distribute Tax and Tip proportionally based on subtotal share
    const totalAssignedSubtotal = Array.from(peopleMap.values()).reduce((acc, p) => acc + p.subtotal, 0);
    
    const peopleList = Array.from(peopleMap.values()).map(person => {
      // Avoid division by zero if subtotal is 0
      const ratioOfTotal = data.subtotal > 0 ? (person.subtotal / data.subtotal) : 0;
      
      person.tax = data.tax * ratioOfTotal;
      person.tip = data.tip * ratioOfTotal;
      person.total = person.subtotal + person.tax + person.tip;
      return person;
    });

    return { peopleList, unassignedItems };
  }, [data, assignments]);

  const { peopleList, unassignedItems } = summary;

  const handleAudit = async () => {
    setIsAuditing(true);
    setShowAuditModal(true);
    setAuditResult(null);
    try {
      const result = await auditSplit(data, peopleList, unassignedItems);
      setAuditResult(result);
    } catch (e) {
      setAuditResult("An error occurred while auditing the bill.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full flex flex-col relative">
       <div className="border-b border-gray-100 pb-3 mb-3 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 flex items-center">
          <span className="material-icons mr-2 text-green-600">payments</span>
          Cost Breakdown
        </h2>
        {unassignedItems.length > 0 && (
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded font-medium">
            {unassignedItems.length} unassigned
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {peopleList.length === 0 && (
          <div className="text-center text-gray-400 py-6 text-sm">
            Assign items to see the breakdown
          </div>
        )}

        {peopleList.map(person => (
          <div key={person.name} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800 text-lg">{person.name}</h3>
              <span className="text-lg font-bold text-indigo-600">
                {data.currency}{person.total.toFixed(2)}
              </span>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal ({person.items.length} items)</span>
                <span>{data.currency}{person.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{data.currency}{person.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tip</span>
                <span>{data.currency}{person.tip.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
         <div className="space-y-1">
            <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                <span>Receipt Total</span>
                <span>{data.currency}{data.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Assigned</span>
                <span>
                  {data.currency}
                  {peopleList.reduce((acc, p) => acc + p.total, 0).toFixed(2)}
                </span>
            </div>
         </div>

         <button
            onClick={handleAudit}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-200"
          >
            <span className="material-icons text-base">fact_check</span>
            <span>Audit Split with AI</span>
         </button>
      </div>

      {/* Audit Modal */}
      {showAuditModal && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <span className="material-icons text-indigo-600 mr-2">verified_user</span>
              AI Audit Report
            </h3>
            <button 
              onClick={() => setShowAuditModal(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isAuditing ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Analyzing split fairness...</p>
              </div>
            ) : (
              <div className="prose prose-sm prose-indigo max-w-none text-gray-700 leading-relaxed">
                <ReactMarkdown>{auditResult || ''}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;
