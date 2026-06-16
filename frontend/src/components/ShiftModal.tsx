import React from 'react';
import type { ShiftCode } from '../data/mockData';

const timeOptions: string[] = [];
for (let h = 0; h < 24; h++) {
  const hStr = h.toString().padStart(2, '0');
  timeOptions.push(`${hStr}:00`);
  timeOptions.push(`${hStr}:15`);
  timeOptions.push(`${hStr}:30`);
  timeOptions.push(`${hStr}:45`);
}

const getTimeOptions = (currentVal?: string | null) => {
  const options = [...timeOptions];
  if (currentVal && !options.includes(currentVal)) {
    options.push(currentVal);
    options.sort();
  }
  return options;
};

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftForm: ShiftCode;
  setShiftForm: React.Dispatch<React.SetStateAction<ShiftCode>>;
  shiftFormMode: 'add' | 'edit';
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
}

export function ShiftModal({
  isOpen,
  onClose,
  shiftForm,
  setShiftForm,
  shiftFormMode,
  onSubmit,
  isSubmitting = false,
}: ShiftModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form 
        onSubmit={onSubmit} 
        className="bg-white border border-zinc-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl text-zinc-800"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 className="text-sm font-extrabold text-zinc-900 uppercase">
            {shiftFormMode === 'add' ? 'Thêm Mã Ca Làm Việc Mới' : 'Cập Nhật Mã Ca'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
          >
            Đóng
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Mã ca viết tắt (Code)</label>
            <input
              type="text"
              required
              disabled={shiftFormMode === 'edit'}
              value={shiftForm.code}
              onChange={(e) => setShiftForm(prev => ({ ...prev, code: e.target.value.toUpperCase().trim() }))}
              placeholder="Ví dụ: P22, KF1"
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 disabled:bg-zinc-50"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Tên ca chi tiết</label>
            <input
              type="text"
              required
              value={shiftForm.name}
              onChange={(e) => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ví dụ: Ca tối 17h-22h"
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Giờ bắt đầu</label>
              <select
                required={shiftForm.type === 'work'}
                value={shiftForm.startTime || ''}
                onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 font-mono"
              >
                <option value="">--:--</option>
                {getTimeOptions(shiftForm.startTime).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Giờ kết thúc</label>
              <select
                required={shiftForm.type === 'work'}
                value={shiftForm.endTime || ''}
                onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 font-mono"
              >
                <option value="">--:--</option>
                {getTimeOptions(shiftForm.endTime).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="isSplit"
              checked={shiftForm.isSplit || false}
              onChange={(e) => setShiftForm(prev => ({ ...prev, isSplit: e.target.checked }))}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="isSplit" className="text-xs font-bold text-zinc-700 cursor-pointer">
              Là ca gãy (2 khoảng giờ làm việc)
            </label>
          </div>

          {shiftForm.isSplit && (
            <div className="grid grid-cols-2 gap-3 p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
              <div>
                <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Giờ bắt đầu ca 2</label>
                <select
                  required={shiftForm.isSplit}
                  value={shiftForm.startTime2 || ''}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, startTime2: e.target.value }))}
                  className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 font-mono"
                >
                  <option value="">--:--</option>
                  {getTimeOptions(shiftForm.startTime2).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Giờ kết thúc ca 2</label>
                <select
                  required={shiftForm.isSplit}
                  value={shiftForm.endTime2 || ''}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, endTime2: e.target.value }))}
                  className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500 font-mono"
                >
                  <option value="">--:--</option>
                  {getTimeOptions(shiftForm.endTime2).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Thời gian nghỉ (Phút)</label>
              <input
                type="number"
                min="0"
                required
                value={shiftForm.breakMinutes}
                onChange={(e) => setShiftForm(prev => ({ ...prev, breakMinutes: parseInt(e.target.value, 10) || 0 }))}
                className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Loại ca</label>
              <select
                value={shiftForm.type}
                onChange={(e) =>
                  setShiftForm(prev => ({
                    ...prev,
                    type: e.target.value as ShiftCode['type'],
                  }))
                }
                className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
              >
                <option value="work">Ca làm việc (Work)</option>
                <option value="off">Nghỉ tuần (OFF)</option>
                <option value="leave">Nghỉ phép có lương (Leave)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 font-extrabold uppercase mb-1">Nhóm màu (Excel style)</label>
            <select
              value={shiftForm.color}
              onChange={(e) => setShiftForm(prev => ({ ...prev, color: e.target.value }))}
              className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            >
              <option value="sky">Xanh sáng (Ca sáng / Full-time)</option>
              <option value="amber">Vàng nhạt (Ca tối / Part-time)</option>
              <option value="emerald">Xanh lá (Ca chiều ngắn)</option>
              <option value="indigo">Xanh đậm (Ca chiều)</option>
              <option value="violet">Tím (Ca gãy / Admin)</option>
              <option value="rose">Hồng đỏ (Nghỉ phép / Ốm)</option>
              <option value="gray">Xám (OFF mặc định)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors border border-zinc-300"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-[#f4b084] hover:bg-[#e29d71] disabled:opacity-60 disabled:cursor-wait text-zinc-950 text-xs font-extrabold rounded-lg transition-colors border border-[#e29d71]"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu Mã Ca'}
          </button>
        </div>
      </form>
    </div>
  );
}
