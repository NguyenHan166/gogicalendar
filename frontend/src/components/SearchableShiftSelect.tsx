import React, { useState, useEffect, useRef } from 'react';
import { CaretDown, MagnifyingGlass, Check } from '@phosphor-icons/react';
import type { ShiftCode } from '../data/mockData';

interface SearchableShiftSelectProps {
  value: string;
  onChange: (value: string) => void;
  shiftCodes: ShiftCode[];
}

export const SearchableShiftSelect: React.FC<SearchableShiftSelectProps> = ({
  value,
  onChange,
  shiftCodes
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedShift = shiftCodes.find(s => s.code === value);
  const workShifts = shiftCodes.filter(s => s.type === 'work');
  
  // Case-insensitive search
  const filteredShifts = workShifts.filter(s => {
    const search = searchTerm.toLowerCase();
    return (
      s.code.toLowerCase().includes(search) ||
      s.name.toLowerCase().includes(search)
    );
  });

  return (
    <div className="relative w-full max-w-[240px]" ref={dropdownRef}>
      {/* Dropdown trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-zinc-300 hover:border-zinc-400 text-zinc-900 text-xs rounded-xl px-3 py-2.5 outline-none font-bold transition-all shadow-sm cursor-pointer select-none"
      >
        <span className="truncate">
          {selectedShift ? `${selectedShift.code} (${selectedShift.name})` : 'Chọn ca làm việc...'}
        </span>
        <CaretDown size={14} className={`text-zinc-500 transition-transform duration-200 shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating search list */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-[99] p-2 space-y-2 min-w-[220px]">
          {/* Search box */}
          <div className="relative flex items-center">
            <MagnifyingGlass size={14} className="absolute left-2.5 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm ca..."
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-[#f4b084] focus:ring-2 focus:ring-[#f4b084]/10 transition-all font-semibold"
            />
          </div>

          {/* Shift list */}
          <div className="max-h-[160px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
            {filteredShifts.length > 0 ? (
              filteredShifts.map((s) => {
                const isSelected = s.code === value;
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => {
                      onChange(s.code);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between text-left px-2.5 py-2 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#f4b084]/20 text-zinc-950 font-bold border border-[#f4b084]/30'
                        : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{s.code} ({s.name})</span>
                    {isSelected && <Check size={12} weight="bold" className="text-zinc-900 shrink-0 ml-1.5" />}
                  </button>
                );
              })
            ) : (
              <div className="text-center text-[11px] text-zinc-400 py-3 font-medium">
                Không tìm thấy ca nào
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
