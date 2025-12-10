import React from 'react';
import { ReceiptItem, Assignments } from '../types';

interface ReceiptListProps {
  items: ReceiptItem[];
  assignments: Assignments;
  currency: string;
}

const ReceiptList: React.FC<ReceiptListProps> = ({ items, assignments, currency }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
        <h2 className="font-semibold text-gray-800 flex items-center">
          <span className="material-icons mr-2 text-gray-500 text-sm">list_alt</span>
          Receipt Items
        </h2>
        <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
          {items.length} items
        </span>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {items.map((item) => {
          const assignedPeople = assignments[item.id] || [];
          const isAssigned = assignedPeople.length > 0;

          return (
            <div 
              key={item.id} 
              className={`
                group relative p-3 rounded-lg border transition-all duration-200
                ${isAssigned 
                  ? "bg-white border-gray-200 hover:border-indigo-300" 
                  : "bg-orange-50 border-orange-100 hover:border-orange-300"
                }
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1 pr-2">
                  <span className="font-medium text-gray-900 block">{item.name}</span>
                  {item.quantity > 1 && (
                    <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                  )}
                </div>
                <span className="font-semibold text-gray-900 whitespace-nowrap">
                  {currency}{item.price.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {isAssigned ? (
                  assignedPeople.map((person, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      <span className="material-icons text-[10px] mr-1">person</span>
                      {person}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    <span className="material-icons text-[10px] mr-1">help_outline</span>
                    Unassigned
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            No items found
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptList;
